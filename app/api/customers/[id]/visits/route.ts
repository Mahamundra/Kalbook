import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Visit } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type VisitRow = Database['public']['Tables']['visits']['Row'];

/**
 * Map database visit to Visit interface
 */
function mapVisitToInterface(visit: VisitRow): Visit {
  return {
    date: visit.date,
    service: visit.service_name,
    staff: visit.staff_name,
  };
}

/**
 * GET /api/customers/[id]/visits
 * Get customer visit history
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = createAdminClient();

    // Verify customer exists and belongs to the business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build visits query
    let query = supabase
      .from('visits')
      .select('*')
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId);

    // Apply filters
    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Order by date (newest first)
    query = query.order('date', { ascending: false }).limit(limit);

    const { data: visits, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch visits' },
        { status: 500 }
      );
    }

    // Map to Visit interface
    const mappedVisits: Visit[] = (visits || []).map(mapVisitToInterface);

    return NextResponse.json({
      success: true,
      visits: mappedVisits,
      count: mappedVisits.length,
    });
  } catch (error: any) {
    console.error('Error fetching customer visits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    );
  }
}

