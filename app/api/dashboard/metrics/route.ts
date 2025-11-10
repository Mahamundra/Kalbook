import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapAppointmentToInterface } from '@/lib/appointments/utils';
import type { Appointment } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

interface ScheduleItem {
  id: string;
  start: string;
  end: string;
  customer: string;
  customerId: string;
  service: string;
  serviceId: string;
  worker: string;
  workerId: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface DashboardMetrics {
  todaysBookings: number;
  thisWeekBookings: number;
  revenueMTD: string;
  noShowRate: string;
  todaysSchedule: ScheduleItem[];
}

/**
 * Get start and end of day in UTC
 */
function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get start and end of week (Monday to Sunday) in UTC
 */
function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  
  const start = new Date(d.setUTCDate(diff));
  start.setUTCHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get start and end of month in UTC
 */
function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  start.setUTCHours(0, 0, 0, 0);
  
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  end.setUTCHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Format currency value
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format percentage
 */
function formatPercentage(value: number): string {
  if (isNaN(value) || !isFinite(value)) {
    return '0.00%';
  }
  return `${value.toFixed(2)}%`;
}

/**
 * GET /api/dashboard/metrics?date=YYYY-MM-DD
 * Get dashboard metrics for the admin panel
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

    // Get optional date parameter
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    // Parse date or use today
    let targetDate: Date;
    if (dateParam) {
      // Parse YYYY-MM-DD format as UTC date
      const [year, month, day] = dateParam.split('-').map(Number);
      if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
      targetDate = new Date(Date.UTC(year, month - 1, day));
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    } else {
      targetDate = new Date();
    }

    const supabase = createAdminClient();
    const businessId = tenantInfo.businessId;

    // Get business currency for formatting
    const businessResult = await supabase
      .from('businesses')
      .select('currency')
      .eq('id', businessId)
      .single() as { data: BusinessRow | null; error: any };
    const { data: business } = businessResult;

    const currency = (business as any)?.currency || 'USD';

    // Calculate date bounds
    const todayBounds = getDayBounds(targetDate);
    const weekBounds = getWeekBounds(targetDate);
    const monthBounds = getMonthBounds(targetDate);

    // 1. Today's bookings count
    const { count: todaysBookings, error: todayError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('start', todayBounds.start.toISOString())
      .lte('start', todayBounds.end.toISOString());

    if (todayError) {
      console.error('Error fetching today bookings:', todayError);
    }

    // 2. This week's bookings count
    const { count: thisWeekBookings, error: weekError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('start', weekBounds.start.toISOString())
      .lte('start', weekBounds.end.toISOString());

    if (weekError) {
      console.error('Error fetching week bookings:', weekError);
    }

    // 3. Revenue MTD (Month-to-Date) - sum of confirmed appointments
    const mtdAppointmentsResult = await supabase
      .from('appointments')
      .select(`
        id,
        services!inner(price)
      `)
      .eq('business_id', businessId)
      .eq('status', 'confirmed')
      .gte('start', monthBounds.start.toISOString())
      .lte('start', monthBounds.end.toISOString()) as { data: any[] | null; error: any };
    const { data: mtdAppointments, error: mtdError } = mtdAppointmentsResult;

    if (mtdError) {
      console.error('Error fetching MTD revenue:', mtdError);
    }

    const revenueMTD = (mtdAppointments || []).reduce((sum: number, apt: any) => {
      const price = parseFloat((apt.services as any)?.price || '0');
      return sum + price;
    }, 0);

    // 4. No-show rate (percentage of cancelled appointments)
    const { count: totalAppointments, error: totalError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    const { count: cancelledAppointments, error: cancelledError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'cancelled');

    if (totalError || cancelledError) {
      console.error('Error calculating no-show rate:', totalError || cancelledError);
    }

    const noShowRate = totalAppointments && totalAppointments > 0
      ? (cancelledAppointments || 0) / totalAppointments * 100
      : 0;

    // 5. Today's schedule with full details
    const todaysAppointmentsResult = await supabase
      .from('appointments')
      .select(`
        *,
        services (*),
        customers (*),
        workers (*)
      `)
      .eq('business_id', businessId)
      .gte('start', todayBounds.start.toISOString())
      .lte('start', todayBounds.end.toISOString())
      .order('start', { ascending: true }) as { data: any[] | null; error: any };
    const { data: todaysAppointments, error: scheduleError } = todaysAppointmentsResult;

    if (scheduleError) {
      console.error('Error fetching today schedule:', scheduleError);
    }

    // Map to ScheduleItem format
    const todaysSchedule: ScheduleItem[] = (todaysAppointments || []).map((apt: any) => ({
      id: apt.id,
      start: apt.start,
      end: apt.end,
      customer: (apt.customers as any)?.name || 'Unknown',
      customerId: apt.customer_id,
      service: (apt.services as any)?.name || 'Unknown',
      serviceId: apt.service_id,
      worker: (apt.workers as any)?.name || 'Unknown',
      workerId: apt.worker_id,
      status: apt.status,
    }));

    // Build response
    const metrics: DashboardMetrics = {
      todaysBookings: todaysBookings || 0,
      thisWeekBookings: thisWeekBookings || 0,
      revenueMTD: formatCurrency(revenueMTD, currency),
      noShowRate: formatPercentage(noShowRate),
      todaysSchedule,
    };

    return NextResponse.json({
      success: true,
      metrics,
      date: targetDate.toISOString().split('T')[0], // Return date used for calculations
    });
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

