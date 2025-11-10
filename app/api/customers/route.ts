import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapCustomerToInterface, normalizePhone } from '@/lib/customers/utils';
import type { Customer } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

/**
 * GET /api/customers
 * Get all customers for the current business (with pagination)
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const blocked = searchParams.get('blocked');
    const tags = searchParams.get('tags'); // comma-separated tags

    const supabase = createAdminClient();

    // Build query
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('business_id', tenantInfo.businessId);

    // Apply filters
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    if (blocked !== null && blocked !== undefined) {
      query = query.eq('blocked', blocked === 'true');
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const queryResult = await query as { data: CustomerRow[] | null; error: any; count: number | null };
    const { data: customers, error, count } = queryResult;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Get tags for all customers
    const customerIds = (customers || []).map((c) => c.id);
    const tagsResult = await supabase
      .from('customer_tags')
      .select('*')
      .in('customer_id', customerIds) as { data: Array<{ customer_id: string; tag: string }> | null; error: any };
    const allTags = tagsResult.data;

    // Group tags by customer_id
    const tagsByCustomer = new Map<string, Array<{ customer_id: string; tag: string }>>();
    allTags?.forEach((tag) => {
      if (!tagsByCustomer.has(tag.customer_id)) {
        tagsByCustomer.set(tag.customer_id, []);
      }
      tagsByCustomer.get(tag.customer_id)!.push(tag);
    });

    // Map to Customer interface
    const mappedCustomers: Customer[] = await Promise.all(
      (customers || []).map(async (customer) => {
        const customerTags = tagsByCustomer.get(customer.id) || [];
        return mapCustomerToInterface(customer, customerTags);
      })
    );

    // Filter by tags if specified
    let filteredCustomers = mappedCustomers;
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      filteredCustomers = mappedCustomers.filter((customer) =>
        tagArray.some((tag) => customer.tags.includes(tag))
      );
    }

    return NextResponse.json({
      success: true,
      customers: filteredCustomers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    if (!body.phone || typeof body.phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(body.phone);
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if customer with this phone already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', tenantInfo.businessId)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 409 }
      );
    }

    // Normalize email: convert empty strings to null, trim whitespace
    const normalizedEmail = body.email 
      ? (typeof body.email === 'string' ? body.email.trim() : body.email)
      : null;
    const finalEmail = normalizedEmail && normalizedEmail.length > 0 ? normalizedEmail : null;

    // Prepare customer data
    const customerData = {
      business_id: tenantInfo.businessId,
      name: body.name.trim(),
      phone: normalizedPhone,
      email: finalEmail,
      notes: body.notes || null,
      date_of_birth: body.dateOfBirth || body.date_of_birth || null,
      gender: body.gender || null,
      consent_marketing: body.consentMarketing ?? body.consent_marketing ?? false,
      blocked: body.blocked ?? false,
    };

    // Create customer
    const createResult = await (supabase
      .from('customers') as any)
      .insert(customerData)
      .select()
      .single() as { data: CustomerRow | null; error: any };
    const { data: newCustomer, error } = createResult;

    if (error || !newCustomer) {
      console.error('Error creating customer:', error);
      console.error('Customer data attempted:', { ...customerData, email: finalEmail ? '***' : null });
      return NextResponse.json(
        { 
          error: error?.message || 'Failed to create customer',
          details: process.env.NODE_ENV === 'development' ? error?.details : undefined
        },
        { status: 500 }
      );
    }

    // Add tags if provided
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      const tagInserts = body.tags.map((tag: string) => ({
        customer_id: newCustomer.id,
        tag: tag.trim(),
      }));

      await supabase.from('customer_tags').insert(tagInserts);
    }

    // Map to Customer interface
    const { data: customerTags } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('customer_id', newCustomer.id);

    const mappedCustomer = await mapCustomerToInterface(
      newCustomer,
      customerTags || []
    );

    return NextResponse.json(
      {
        success: true,
        customer: mappedCustomer,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

