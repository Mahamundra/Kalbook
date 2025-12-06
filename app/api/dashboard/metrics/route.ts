import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapAppointmentToInterface } from '@/lib/appointments/utils';
import type { Appointment } from '@/types/admin';
import type { Database } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

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
  // Existing
  todaysBookings: number;
  thisWeekBookings: number;
  revenueMTD: string;
  noShowRate: string;
  todaysSchedule: ScheduleItem[];
  
  // Customer metrics
  totalCustomers: number;
  newCustomersThisMonth: number;
  returningCustomersRate: string;
  averageVisitsPerCustomer: string;
  activeCustomers: number;
  
  // Appointment health
  confirmedRate: string;
  pendingCount: number;
  upcomingAppointments: number;
  cancellationRate: string;
  groupAppointmentsCount: number;
  averageAppointmentsPerDay: string;
  
  // Service performance
  mostPopularService: { name: string; count: number } | null;
  revenueByService: Array<{ name: string; revenue: string }>;
  averageServicePrice: string;
  
  // Worker metrics
  mostBookedWorker: { name: string; count: number } | null;
  workerUtilization: Array<{ name: string; appointments: number }>;
  revenuePerWorker: Array<{ name: string; revenue: string }>;
  
  // Reminder effectiveness
  reminderDeliveryRate: string;
  reminderImpact: { sent: string; notSent: string };
  failedReminders: number;
  
  // Growth & trends
  weekOverWeekGrowth: string;
  monthOverMonthGrowth: string;
  bookingTrend: 'up' | 'down' | 'neutral';
  revenueThisWeek: string;
  averageBookingValue: string;
  peakHours: string;
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
 * Get start and end of previous week in UTC
 */
function getLastWeekBounds(date: Date): { start: Date; end: Date } {
  const currentWeek = getWeekBounds(date);
  const start = new Date(currentWeek.start);
  start.setUTCDate(start.getUTCDate() - 7);
  
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get start and end of previous month in UTC
 */
function getLastMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  start.setUTCHours(0, 0, 0, 0);
  
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0));
  end.setUTCHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get start and end of last 30 days in UTC
 */
function getLast30DaysBounds(date: Date): { start: Date; end: Date } {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  start.setUTCHours(0, 0, 0, 0);
  
  return { start, end };
}

/**
 * Get start and end of next 7 days in UTC
 */
function getNext7DaysBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Calculate peak hours from appointments
 */
function getPeakHours(appointments: any[]): string {
  if (!appointments || appointments.length === 0) {
    return 'N/A';
  }
  
  // Group appointments by hour
  const hourCounts: { [hour: number]: number } = {};
  
  appointments.forEach((apt) => {
    const startTime = new Date(apt.start);
    const hour = startTime.getUTCHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  // Find hour(s) with most appointments
  const maxCount = Math.max(...Object.values(hourCounts));
  const peakHours = Object.entries(hourCounts)
    .filter(([_, count]) => count === maxCount)
    .map(([hour]) => parseInt(hour))
    .sort((a, b) => a - b);
  
  if (peakHours.length === 0) {
    return 'N/A';
  }
  
  // Format as time range
  if (peakHours.length === 1) {
    return `${peakHours[0].toString().padStart(2, '0')}:00`;
  }
  
  const startHour = peakHours[0];
  const endHour = peakHours[peakHours.length - 1];
  return `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
}

/**
 * Format currency value
 */
function formatCurrency(amount: number, currency: string = 'ILS'): string {
  // Use appropriate locale for currency formatting
  const locale = currency === 'ILS' ? 'he-IL' : 'en-US';
  return new Intl.NumberFormat(locale, {
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

    // Always use ILS currency for formatting
    const currency = 'ILS';

    // Calculate date bounds
    const todayBounds = getDayBounds(targetDate);
    const weekBounds = getWeekBounds(targetDate);
    const monthBounds = getMonthBounds(targetDate);
    const lastWeekBounds = getLastWeekBounds(targetDate);
    const lastMonthBounds = getLastMonthBounds(targetDate);
    const last30DaysBounds = getLast30DaysBounds(targetDate);
    const next7DaysBounds = getNext7DaysBounds(targetDate);

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

    const noShowRate = (totalAppointments && totalAppointments > 0)
      ? Math.max(0, Math.min(100, ((cancelledAppointments || 0) / totalAppointments) * 100))
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

    // ========== CUSTOMER METRICS ==========
    
    // Total customers
    const { count: totalCustomers, error: totalCustomersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);
    
    if (totalCustomersError) {
      console.error('Error fetching total customers:', totalCustomersError);
    }

    // New customers this month
    const { count: newCustomersThisMonth, error: newCustomersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', monthBounds.start.toISOString())
      .lte('created_at', monthBounds.end.toISOString());
    
    if (newCustomersError) {
      console.error('Error fetching new customers:', newCustomersError);
    }

    // Returning customers rate (customers with 2+ appointments)
    const { data: allAppointments, error: allAppointmentsError } = await supabase
      .from('appointments')
      .select('customer_id')
      .eq('business_id', businessId)
      .neq('status', 'cancelled') as { data: any[] | null; error: any };
    
    if (allAppointmentsError) {
      console.error('Error fetching appointments for returning customers:', allAppointmentsError);
    }

    const customerAppointmentCounts: { [key: string]: number } = {};
    (allAppointments || []).forEach((apt) => {
      if (apt.customer_id) {
        customerAppointmentCounts[apt.customer_id] = (customerAppointmentCounts[apt.customer_id] || 0) + 1;
      }
    });

    const returningCustomersCount = Object.values(customerAppointmentCounts).filter(count => count >= 2).length;
    const returningCustomersRate = (totalCustomers && totalCustomers > 0)
      ? Math.max(0, Math.min(100, (returningCustomersCount / totalCustomers) * 100))
      : 0;

    // Average visits per customer
    const totalAppointmentCount = Object.values(customerAppointmentCounts).reduce((sum, count) => sum + count, 0);
    const averageVisitsPerCustomer = (totalCustomers && totalCustomers > 0)
      ? Math.max(0, totalAppointmentCount / totalCustomers)
      : 0;

    // Active customers (customers with appointments in last 30 days)
    const { data: activeCustomersAppointments, error: activeCustomersError } = await supabase
      .from('appointments')
      .select('customer_id')
      .eq('business_id', businessId)
      .gte('start', last30DaysBounds.start.toISOString())
      .lte('start', last30DaysBounds.end.toISOString())
      .neq('status', 'cancelled') as { data: any[] | null; error: any };
    
    if (activeCustomersError) {
      console.error('Error fetching active customers:', activeCustomersError);
    }

    const activeCustomerIds = new Set((activeCustomersAppointments || []).map(apt => apt.customer_id).filter(Boolean));
    const activeCustomers = activeCustomerIds.size;

    // ========== APPOINTMENT HEALTH METRICS ==========
    
    // Confirmed rate and pending count
    const { count: confirmedAppointments, error: confirmedError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'confirmed');
    
    const { count: pendingAppointments, error: pendingError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'pending');
    
    if (confirmedError || pendingError) {
      console.error('Error fetching appointment statuses:', confirmedError || pendingError);
    }

    const confirmedRate = (totalAppointments && totalAppointments > 0)
      ? Math.max(0, Math.min(100, ((confirmedAppointments || 0) / totalAppointments) * 100))
      : 0;

    // Upcoming appointments (next 7 days)
    const { count: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('start', next7DaysBounds.start.toISOString())
      .lte('start', next7DaysBounds.end.toISOString())
      .eq('status', 'confirmed');
    
    if (upcomingError) {
      console.error('Error fetching upcoming appointments:', upcomingError);
    }

    // Cancellation rate
    const cancellationRate = (totalAppointments && totalAppointments > 0)
      ? Math.max(0, Math.min(100, ((cancelledAppointments || 0) / totalAppointments) * 100))
      : 0;

    // Group appointments count
    const { count: groupAppointmentsCount, error: groupError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_group_appointment', true);
    
    if (groupError) {
      console.error('Error fetching group appointments:', groupError);
    }

    // Average appointments per day (based on all time)
    const { data: firstAppointment, error: firstAppointmentError } = await supabase
      .from('appointments')
      .select('start')
      .eq('business_id', businessId)
      .order('start', { ascending: true })
      .limit(1)
      .single() as { data: any | null; error: any };
    
    if (firstAppointmentError && firstAppointmentError.code !== 'PGRST116') {
      console.error('Error fetching first appointment:', firstAppointmentError);
    }

    let averageAppointmentsPerDay = 0;
    if (firstAppointment && totalAppointments && totalAppointments > 0) {
      try {
        const firstDate = new Date(firstAppointment.start);
        if (!isNaN(firstDate.getTime())) {
          const daysDiff = Math.max(1, Math.ceil((targetDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
          averageAppointmentsPerDay = Math.max(0, totalAppointments / daysDiff);
        }
      } catch (e) {
        console.error('Error calculating average appointments per day:', e);
      }
    }

    // ========== SERVICE PERFORMANCE METRICS ==========
    
    // Most popular service
    const { data: serviceAppointments, error: serviceAppointmentsError } = await supabase
      .from('appointments')
      .select(`
        service_id,
        services!inner(name)
      `)
      .eq('business_id', businessId)
      .neq('status', 'cancelled') as { data: any[] | null; error: any };
    
    if (serviceAppointmentsError) {
      console.error('Error fetching service appointments:', serviceAppointmentsError);
    }

    const serviceCounts: { [serviceId: string]: { name: string; count: number } } = {};
    (serviceAppointments || []).forEach((apt: any) => {
      const serviceId = apt.service_id;
      const serviceName = (apt.services as any)?.name || 'Unknown';
      if (!serviceCounts[serviceId]) {
        serviceCounts[serviceId] = { name: serviceName, count: 0 };
      }
      serviceCounts[serviceId].count += 1;
    });

    const mostPopularService = Object.values(serviceCounts).length > 0
      ? Object.values(serviceCounts).reduce((max, service) => 
          service.count > max.count ? service : max
        )
      : null;

    // Revenue by service
    const { data: revenueAppointments, error: revenueAppointmentsError } = await supabase
      .from('appointments')
      .select(`
        service_id,
        services!inner(name, price)
      `)
      .eq('business_id', businessId)
      .eq('status', 'confirmed') as { data: any[] | null; error: any };
    
    if (revenueAppointmentsError) {
      console.error('Error fetching revenue appointments:', revenueAppointmentsError);
    }

    const serviceRevenue: { [serviceId: string]: { name: string; revenue: number } } = {};
    (revenueAppointments || []).forEach((apt: any) => {
      const serviceId = apt.service_id;
      const serviceName = (apt.services as any)?.name || 'Unknown';
      const price = parseFloat((apt.services as any)?.price || '0');
      if (!serviceRevenue[serviceId]) {
        serviceRevenue[serviceId] = { name: serviceName, revenue: 0 };
      }
      serviceRevenue[serviceId].revenue += price;
    });

    const revenueByService = Object.values(serviceRevenue)
      .map(service => ({
        name: service.name,
        revenue: formatCurrency(service.revenue, currency)
      }))
      .sort((a, b) => parseFloat(b.revenue.replace(/[^0-9.-]+/g, '')) - parseFloat(a.revenue.replace(/[^0-9.-]+/g, '')))
      .slice(0, 5); // Top 5

    // Average service price
    const { data: allServices, error: allServicesError } = await supabase
      .from('services')
      .select('price')
      .eq('business_id', businessId)
      .eq('active', true) as { data: any[] | null; error: any };
    
    if (allServicesError) {
      console.error('Error fetching services:', allServicesError);
    }

    const totalServicePrice = (allServices || []).reduce((sum, service) => sum + parseFloat(service.price || '0'), 0);
    const averageServicePrice = ((allServices || []).length > 0)
      ? Math.max(0, totalServicePrice / (allServices || []).length)
      : 0;

    // ========== WORKER METRICS ==========
    
    // Most booked worker
    const { data: workerAppointments, error: workerAppointmentsError } = await supabase
      .from('appointments')
      .select(`
        worker_id,
        workers!inner(name)
      `)
      .eq('business_id', businessId)
      .neq('status', 'cancelled') as { data: any[] | null; error: any };
    
    if (workerAppointmentsError) {
      console.error('Error fetching worker appointments:', workerAppointmentsError);
    }

    const workerCounts: { [workerId: string]: { name: string; count: number } } = {};
    (workerAppointments || []).forEach((apt: any) => {
      const workerId = apt.worker_id;
      const workerName = (apt.workers as any)?.name || 'Unknown';
      if (!workerCounts[workerId]) {
        workerCounts[workerId] = { name: workerName, count: 0 };
      }
      workerCounts[workerId].count += 1;
    });

    const mostBookedWorker = Object.values(workerCounts).length > 0
      ? Object.values(workerCounts).reduce((max, worker) => 
          worker.count > max.count ? worker : max
        )
      : null;

    // Worker utilization
    const workerUtilization = Object.values(workerCounts)
      .map(worker => ({
        name: worker.name,
        appointments: worker.count
      }))
      .sort((a, b) => b.appointments - a.appointments);

    // Revenue per worker
    const { data: workerRevenueAppointments, error: workerRevenueError } = await supabase
      .from('appointments')
      .select(`
        worker_id,
        services!inner(price),
        workers!inner(name)
      `)
      .eq('business_id', businessId)
      .eq('status', 'confirmed') as { data: any[] | null; error: any };
    
    if (workerRevenueError) {
      console.error('Error fetching worker revenue:', workerRevenueError);
    }

    const workerRevenue: { [workerId: string]: { name: string; revenue: number } } = {};
    (workerRevenueAppointments || []).forEach((apt: any) => {
      const workerId = apt.worker_id;
      const workerName = (apt.workers as any)?.name || 'Unknown';
      const price = parseFloat((apt.services as any)?.price || '0');
      if (!workerRevenue[workerId]) {
        workerRevenue[workerId] = { name: workerName, revenue: 0 };
      }
      workerRevenue[workerId].revenue += price;
    });

    const revenuePerWorker = Object.values(workerRevenue)
      .map(worker => ({
        name: worker.name,
        revenue: formatCurrency(worker.revenue, currency)
      }))
      .sort((a, b) => parseFloat(b.revenue.replace(/[^0-9.-]+/g, '')) - parseFloat(a.revenue.replace(/[^0-9.-]+/g, '')));

    // ========== REMINDER EFFECTIVENESS METRICS ==========
    
    // Reminder delivery rate
    const { data: allAppointmentsForReminders, error: remindersError } = await supabase
      .from('appointments')
      .select('reminder_status')
      .eq('business_id', businessId)
      .not('reminder_status', 'is', null) as { data: any[] | null; error: any };
    
    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
    }

    const totalReminders = (allAppointmentsForReminders || []).length;
    const sentReminders = (allAppointmentsForReminders || []).filter(apt => apt.reminder_status === 'sent').length;
    const failedReminders = (allAppointmentsForReminders || []).filter(apt => apt.reminder_status === 'failed').length;
    
    const reminderDeliveryRate = (totalReminders > 0)
      ? Math.max(0, Math.min(100, (sentReminders / totalReminders) * 100))
      : 0;

    // Reminder impact (no-show rate comparison)
    const { data: reminderImpactData, error: reminderImpactError } = await supabase
      .from('appointments')
      .select('reminder_status, status')
      .eq('business_id', businessId)
      .in('reminder_status', ['sent', 'pending']) as { data: any[] | null; error: any };
    
    if (reminderImpactError) {
      console.error('Error fetching reminder impact:', reminderImpactError);
    }

    const sentReminderAppointments = (reminderImpactData || []).filter(apt => apt.reminder_status === 'sent');
    const notSentReminderAppointments = (reminderImpactData || []).filter(apt => apt.reminder_status === 'pending');
    
    const sentCancelled = sentReminderAppointments.filter(apt => apt.status === 'cancelled').length;
    const notSentCancelled = notSentReminderAppointments.filter(apt => apt.status === 'cancelled').length;
    
    const sentNoShowRate = (sentReminderAppointments.length > 0)
      ? Math.max(0, Math.min(100, (sentCancelled / sentReminderAppointments.length) * 100))
      : 0;
    
    const notSentNoShowRate = (notSentReminderAppointments.length > 0)
      ? Math.max(0, Math.min(100, (notSentCancelled / notSentReminderAppointments.length) * 100))
      : 0;

    // ========== GROWTH & TREND METRICS ==========
    
    // Week-over-week growth
    const { count: lastWeekBookings, error: lastWeekError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('start', lastWeekBounds.start.toISOString())
      .lte('start', lastWeekBounds.end.toISOString());
    
    if (lastWeekError) {
      console.error('Error fetching last week bookings:', lastWeekError);
    }

    let weekOverWeekGrowth = 0;
    if (lastWeekBookings && lastWeekBookings > 0) {
      weekOverWeekGrowth = ((thisWeekBookings || 0) - lastWeekBookings) / lastWeekBookings * 100;
    } else if ((thisWeekBookings || 0) > 0) {
      weekOverWeekGrowth = 100;
    }
    // Clamp to reasonable range
    weekOverWeekGrowth = Math.max(-100, Math.min(1000, weekOverWeekGrowth));

    // Month-over-month growth
    const { count: lastMonthBookings, error: lastMonthError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('start', lastMonthBounds.start.toISOString())
      .lte('start', lastMonthBounds.end.toISOString());
    
    if (lastMonthError) {
      console.error('Error fetching last month bookings:', lastMonthError);
    }

    let monthOverMonthGrowth = 0;
    if (lastMonthBookings && lastMonthBookings > 0) {
      monthOverMonthGrowth = ((thisWeekBookings || 0) - lastMonthBookings) / lastMonthBookings * 100;
    } else if ((thisWeekBookings || 0) > 0) {
      monthOverMonthGrowth = 100;
    }
    // Clamp to reasonable range
    monthOverMonthGrowth = Math.max(-100, Math.min(1000, monthOverMonthGrowth));

    // Booking trend
    let bookingTrend: 'up' | 'down' | 'neutral' = 'neutral';
    if (weekOverWeekGrowth > 5) {
      bookingTrend = 'up';
    } else if (weekOverWeekGrowth < -5) {
      bookingTrend = 'down';
    }

    // Revenue this week
    const { data: weekRevenueAppointments, error: weekRevenueError } = await supabase
      .from('appointments')
      .select(`
        id,
        services!inner(price)
      `)
      .eq('business_id', businessId)
      .eq('status', 'confirmed')
      .gte('start', weekBounds.start.toISOString())
      .lte('start', weekBounds.end.toISOString()) as { data: any[] | null; error: any };
    
    if (weekRevenueError) {
      console.error('Error fetching week revenue:', weekRevenueError);
    }

    const revenueThisWeek = (weekRevenueAppointments || []).reduce((sum: number, apt: any) => {
      const price = parseFloat((apt.services as any)?.price || '0');
      return sum + price;
    }, 0);

    // Average booking value
    const totalRevenue = (revenueAppointments || []).reduce((sum: number, apt: any) => {
      const price = parseFloat((apt.services as any)?.price || '0');
      return sum + price;
    }, 0);
    
    const averageBookingValue = ((revenueAppointments || []).length > 0)
      ? Math.max(0, totalRevenue / (revenueAppointments || []).length)
      : 0;

    // Peak hours (from all appointments)
    const { data: allAppointmentsForPeak, error: peakError } = await supabase
      .from('appointments')
      .select('start')
      .eq('business_id', businessId)
      .neq('status', 'cancelled') as { data: any[] | null; error: any };
    
    if (peakError) {
      console.error('Error fetching appointments for peak hours:', peakError);
    }

    const peakHours = getPeakHours(allAppointmentsForPeak || []);

    // Build response
    const metrics: DashboardMetrics = {
      // Existing
      todaysBookings: todaysBookings || 0,
      thisWeekBookings: thisWeekBookings || 0,
      revenueMTD: formatCurrency(revenueMTD, currency),
      noShowRate: formatPercentage(noShowRate),
      todaysSchedule,
      
      // Customer metrics
      totalCustomers: totalCustomers || 0,
      newCustomersThisMonth: newCustomersThisMonth || 0,
      returningCustomersRate: formatPercentage(returningCustomersRate),
      averageVisitsPerCustomer: averageVisitsPerCustomer.toFixed(2),
      activeCustomers,
      
      // Appointment health
      confirmedRate: formatPercentage(confirmedRate),
      pendingCount: pendingAppointments || 0,
      upcomingAppointments: upcomingAppointments || 0,
      cancellationRate: formatPercentage(cancellationRate),
      groupAppointmentsCount: groupAppointmentsCount || 0,
      averageAppointmentsPerDay: averageAppointmentsPerDay.toFixed(2),
      
      // Service performance
      mostPopularService,
      revenueByService,
      averageServicePrice: formatCurrency(averageServicePrice, currency),
      
      // Worker metrics
      mostBookedWorker,
      workerUtilization,
      revenuePerWorker,
      
      // Reminder effectiveness
      reminderDeliveryRate: formatPercentage(reminderDeliveryRate),
      reminderImpact: {
        sent: formatPercentage(sentNoShowRate),
        notSent: formatPercentage(notSentNoShowRate)
      },
      failedReminders,
      
      // Growth & trends
      weekOverWeekGrowth: formatPercentage(weekOverWeekGrowth),
      monthOverMonthGrowth: formatPercentage(monthOverMonthGrowth),
      bookingTrend,
      revenueThisWeek: formatCurrency(revenueThisWeek, currency),
      averageBookingValue: formatCurrency(averageBookingValue, currency),
      peakHours,
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

