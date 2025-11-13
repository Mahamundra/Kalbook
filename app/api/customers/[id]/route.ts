import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapCustomerToInterface, normalizePhone } from '@/lib/customers/utils';
import type { Customer } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

/**
 * GET /api/customers/[id]
 * Get a single customer by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get customer and verify it belongs to the business
    const customerResult = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: CustomerRow | null; error: any };

    if (customerResult.error) {
      if (customerResult.error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: customerResult.error.message || 'Failed to fetch customer' },
        { status: 500 }
      );
    }

    const customer = customerResult.data;
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get customer tags
    const { data: tags } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('customer_id', customerId);

    // Get visit history (must filter by business_id!)
    const { data: visits } = await supabase
      .from('visits')
      .select('*')
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .order('date', { ascending: false });

    // Map to Customer interface
    const mappedCustomer = await mapCustomerToInterface(
      customer,
      tags || [],
      visits || []
    );

    return NextResponse.json({
      success: true,
      customer: mappedCustomer,
    });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/customers/[id]
 * Update a customer
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const body = await request.json();

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business can manage customers
    const { canBusinessPerformAction } = await import('@/lib/trial/utils');
    const canManage = await canBusinessPerformAction(tenantInfo.businessId, 'manage_customers');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Your plan does not allow managing customers. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Verify customer exists and belongs to the business
    const checkResult = await supabase
      .from('customers')
      .select('business_id, phone')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: CustomerRow | null; error: any };

    if (checkResult.error || !checkResult.data) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const existingCustomer = checkResult.data;

    // Build update object
    const updateData: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json(
          { error: 'Customer name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.phone !== undefined) {
      const normalizedPhone = normalizePhone(body.phone);
      if (normalizedPhone.length < 10) {
        return NextResponse.json(
          { error: 'Invalid phone number' },
          { status: 400 }
        );
      }

      // Check if phone is already taken by another customer
      const { data: phoneOwner } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', tenantInfo.businessId)
        .eq('phone', normalizedPhone)
        .neq('id', customerId)
        .maybeSingle();

      if (phoneOwner) {
        return NextResponse.json(
          { error: 'Phone number already belongs to another customer' },
          { status: 409 }
        );
      }

      updateData.phone = normalizedPhone;
    }

    if (body.email !== undefined) {
      // Normalize email: convert empty strings to null, trim whitespace
      const normalizedEmail = body.email 
        ? (typeof body.email === 'string' ? body.email.trim() : body.email)
        : null;
      updateData.email = normalizedEmail && normalizedEmail.length > 0 ? normalizedEmail : null;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }

    if (body.dateOfBirth !== undefined || body.date_of_birth !== undefined) {
      updateData.date_of_birth = body.dateOfBirth || body.date_of_birth || null;
    }

    if (body.gender !== undefined) {
      updateData.gender = body.gender || null;
    }

    if (body.consentMarketing !== undefined || body.consent_marketing !== undefined) {
      updateData.consent_marketing = body.consentMarketing ?? body.consent_marketing ?? false;
    }

    if (body.blocked !== undefined) {
      updateData.blocked = Boolean(body.blocked);
    }

    // Update tags if provided
    if (body.tags !== undefined && Array.isArray(body.tags)) {
      // Delete existing tags (customer_id is unique, so safe after verifying customer belongs to business)
      // But we'll verify the customer belongs to this business first (already done above)
      await supabase.from('customer_tags').delete().eq('customer_id', customerId);

      // Insert new tags
      if (body.tags.length > 0) {
        const tagInserts = body.tags.map((tag: string) => ({
          customer_id: customerId,
          tag: tag.trim(),
        }));
        await supabase.from('customer_tags').insert(tagInserts);
      }
    }

    // If no fields to update, return current customer
    if (Object.keys(updateData).length === 0) {
      const customerResult = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single() as { data: CustomerRow | null; error: any };
      const customer = customerResult.data;

      if (customer) {
        const { data: tags } = await supabase
          .from('customer_tags')
          .select('*')
          .eq('customer_id', customerId);

        const mappedCustomer = await mapCustomerToInterface(customer, tags || []);
        return NextResponse.json({
          success: true,
          customer: mappedCustomer,
        });
      }
    }

    // Update customer
    const updateResult = await (supabase
      .from('customers') as any)
      .update(updateData)
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .select()
      .single() as { data: any; error: any };
    const { data: updatedCustomer, error: updateError } = updateResult;

    if (updateError || !updatedCustomer) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update customer' },
        { status: 500 }
      );
    }

    // Get updated tags
    const { data: tags } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('customer_id', customerId);

    // Map to Customer interface
    const mappedCustomer = await mapCustomerToInterface(
      updatedCustomer,
      tags || []
    );

    return NextResponse.json({
      success: true,
      customer: mappedCustomer,
    });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]
 * Delete a customer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business can manage customers
    const { canBusinessPerformAction } = await import('@/lib/trial/utils');
    const canManage = await canBusinessPerformAction(tenantInfo.businessId, 'manage_customers');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Your plan does not allow managing customers. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Verify customer exists and belongs to the business
    const checkResult = await supabase
      .from('customers')
      .select('id, business_id, name')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: CustomerRow | null; error: any };

    if (checkResult.error || !checkResult.data) {
      // DEBUG: Check if customer exists with different business_id
      const { data: allCustomersWithThisId } = await supabase
        .from('customers')
        .select('id, business_id, name')
        .eq('id', customerId);
      
      console.log('[DELETE CUSTOMER] Customer not found with business_id:', {
        requestedBusinessId: tenantInfo.businessId,
        customerId: customerId,
        allCustomersWithThisId: allCustomersWithThisId,
      });

      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const existingCustomer = checkResult.data;
    // DEBUG: Log customer being deleted
    console.log('[DELETE CUSTOMER] Customer found:', {
      customerId: existingCustomer.id,
      customerName: existingCustomer.name,
      customerBusinessId: existingCustomer.business_id,
      requestedBusinessId: tenantInfo.businessId,
      match: existingCustomer.business_id === tenantInfo.businessId,
    });

    // Check if customer has appointments (must filter by business_id!)
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .limit(1);

    if (appointmentsError) {
      console.error('Error checking appointments:', appointmentsError);
    }

    if (appointments && appointments.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete customer with existing appointments',
          message: 'Customer has appointments. Please cancel or complete them first.',
        },
        { status: 409 }
      );
    }

    // Delete customer tags
    // Note: customer_id is a UUID (globally unique), and we've already verified
    // the customer belongs to this business above, so this is safe
    await supabase
      .from('customer_tags')
      .delete()
      .eq('customer_id', customerId);

    // Delete visits (must filter by business_id!)
    await supabase
      .from('visits')
      .delete()
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId);

    // Delete customer
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
