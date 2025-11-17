import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/activity-logs
 * Fetch activity logs with filtering and pagination
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

    const supabase = createAdminClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activityType = searchParams.get('activityType');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const createdBy = searchParams.get('createdBy') || 'customer'; // Default to customer-only

    // Build query
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        customers (id, name, email, phone),
        appointments (
          id,
          start,
          end,
          status,
          services (name),
          workers (name)
        )
      `, { count: 'exact' })
      .eq('business_id', tenantInfo.businessId)
      .eq('created_by', createdBy) // Filter by customer or admin
      .order('created_at', { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (activityType && activityType !== 'all') {
      query = query.eq('activity_type', activityType);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: logs, error, count } = await query as { 
      data: any[] | null; 
      error: any; 
      count: number | null;
    };

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch activity logs' },
        { status: 500 }
      );
    }

    // Format the response
    const formattedLogs = (logs || []).map((log: any) => ({
      id: log.id,
      activityType: log.activity_type,
      createdBy: log.created_by,
      status: log.status,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
      metadata: log.metadata,
      customer: log.customers ? {
        id: log.customers.id,
        name: log.customers.name,
        email: log.customers.email,
        phone: log.customers.phone,
      } : null,
      appointment: log.appointments ? {
        id: log.appointments.id,
        start: log.appointments.start,
        end: log.appointments.end,
        status: log.appointments.status,
        serviceName: log.appointments.services?.name,
        workerName: log.appointments.workers?.name,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

