import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';

/**
 * Helper function to check if business is gym_trainer
 */
async function checkGymTrainerBusiness(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('business_type')
    .eq('id', businessId)
    .single() as { data: { business_type: string } | null; error: any };
  
  return business?.business_type === 'gym_trainer';
}

/**
 * GET /api/reports/monthly
 * Generate monthly report (gym_trainer only)
 * Query params: month (YYYY-MM format, defaults to current month)
 */
export async function GET(request: NextRequest) {
  try {
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business is gym_trainer
    const isGymTrainer = await checkGymTrainerBusiness(tenantInfo.businessId);
    if (!isGymTrainer) {
      return NextResponse.json(
        { error: 'This feature is only available for gym_trainer businesses' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');

    // Parse month or use current month
    let startDate: Date;
    let endDate: Date;

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const supabase = createAdminClient();

    // Get appointments for the month
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .gte('start', startDate.toISOString())
      .lte('start', endDate.toISOString());

    if (appointmentsError) {
      return NextResponse.json(
        { error: appointmentsError.message || 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    // Get customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', tenantInfo.businessId);

    // Get workers
    const { count: totalWorkers } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', tenantInfo.businessId)
      .eq('active', true);

    // Calculate statistics
    const totalSessions = appointments?.length || 0;
    const confirmedSessions = appointments?.filter((a: any) => a.status === 'confirmed').length || 0;
    const cancelledSessions = appointments?.filter((a: any) => a.status === 'cancelled').length || 0;
    const attendedSessions = appointments?.filter((a: any) => a.attended === true).length || 0;
    const noShowSessions = appointments?.filter((a: any) => a.no_show === true).length || 0;

    // Get unique customers who had appointments
    const uniqueCustomers = new Set(
      (appointments || []).map((a: any) => a.customer_id)
    );

    // Get memberships statistics
    const { data: memberships } = await supabase
      .from('memberships')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const newMemberships = memberships?.length || 0;
    const activeMemberships = memberships?.filter((m: any) => m.status === 'active').length || 0;

    // Get session usage
    const { data: sessionUsage } = await supabase
      .from('session_usage_log')
      .select('*')
      .gte('used_at', startDate.toISOString())
      .lte('used_at', endDate.toISOString());

    const sessionsUsed = sessionUsage?.length || 0;

    const report = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        month: monthParam || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      },
      overview: {
        totalCustomers: totalCustomers || 0,
        activeCustomers: uniqueCustomers.size,
        totalWorkers: totalWorkers || 0,
      },
      sessions: {
        total: totalSessions,
        confirmed: confirmedSessions,
        cancelled: cancelledSessions,
        attended: attendedSessions,
        noShows: noShowSessions,
        attendanceRate: totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100 * 100) / 100 : 0,
        cancellationRate: totalSessions > 0 ? Math.round((cancelledSessions / totalSessions) * 100 * 100) / 100 : 0,
      },
      memberships: {
        new: newMemberships,
        active: activeMemberships,
        sessionsUsed,
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to generate monthly report' },
      { status: 500 }
    );
  }
}

