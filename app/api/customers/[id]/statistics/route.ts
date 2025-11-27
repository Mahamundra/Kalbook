import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { calculateCustomerStatistics } from '@/lib/customers/statistics';

/**
 * GET /api/customers/[id]/statistics
 * Get detailed statistics for a single customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const customerId = params.id;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Verify customer belongs to business
    const supabase = createAdminClient();
    const customerResult = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string; business_id: string } | null; error: any };

    if (customerResult.error || !customerResult.data) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate statistics
    const statistics = await calculateCustomerStatistics(customerId, tenantInfo.businessId);

    return NextResponse.json({
      success: true,
      statistics,
    });
  } catch (error: any) {
    console.error('Error fetching customer statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer statistics' },
      { status: 500 }
    );
  }
}


