import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapCustomerToInterface } from '@/lib/customers/utils';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

/**
 * POST /api/customers/[id]/block
 * Block or unblock a customer
 */
export async function POST(
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

    // Validate blocked status
    if (body.blocked === undefined) {
      return NextResponse.json(
        { error: 'blocked status is required' },
        { status: 400 }
      );
    }

    const blocked = Boolean(body.blocked);

    const supabase = createAdminClient();

    // Verify customer exists and belongs to the business
    const checkResult = await supabase
      .from('customers')
      .select('business_id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: CustomerRow | null; error: any };
    const { data: existingCustomer, error: checkError } = checkResult;

    if (checkError || !existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Update blocked status
    const updateResult = await (supabase
      .from('customers') as any)
      .update({ blocked })
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .select()
      .single() as { data: any; error: any };
    const { data: updatedCustomer, error: updateError } = updateResult;

    if (updateError || !updatedCustomer) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update customer status' },
        { status: 500 }
      );
    }

    // Get customer tags
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
      message: blocked ? 'Customer blocked successfully' : 'Customer unblocked successfully',
    });
  } catch (error: any) {
    console.error('Error updating customer block status:', error);
    return NextResponse.json(
      { error: 'Failed to update customer status' },
      { status: 500 }
    );
  }
}

