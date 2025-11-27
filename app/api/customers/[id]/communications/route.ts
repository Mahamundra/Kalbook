import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type CommunicationRow = Database['public']['Tables']['customer_communications']['Row'];

/**
 * GET /api/customers/[id]/communications
 * Get communication history for a customer
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const channel = searchParams.get('channel'); // sms, whatsapp, email

    const supabase = createAdminClient();

    // Verify customer belongs to business
    const customerResult = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };

    if (customerResult.error || !customerResult.data) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from('customer_communications')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId);

    // Filter by channel if specified
    if (channel && ['sms', 'whatsapp', 'email'].includes(channel)) {
      query = query.eq('channel', channel);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const result = await query as {
      data: CommunicationRow[] | null;
      error: any;
      count: number | null;
    };

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to fetch communications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      communications: result.data || [],
      pagination: {
        page,
        limit,
        total: result.count || 0,
        totalPages: Math.ceil((result.count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching communications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communications' },
      { status: 500 }
    );
  }
}


