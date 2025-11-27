/**
 * Customer statistics calculation utilities
 */

import type { Customer } from '@/components/ported/types/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapCustomerToInterface } from '@/lib/customers/utils';
import type { Database } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];
type WorkerRow = Database['public']['Tables']['workers']['Row'];

export interface CustomerStatistics {
  totalAppointments: number;
  totalAppointmentsThisMonth: number;
  totalAppointmentsThisYear: number;
  totalRevenue: number;
  totalRevenueThisMonth: number;
  totalRevenueThisYear: number;
  averageVisitsPerMonth: number;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  servicePreferences: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
  }>;
  workerPreferences: Array<{
    workerId: string;
    workerName: string;
    count: number;
  }>;
  visitFrequency: {
    thisMonth: number;
    lastMonth: number;
    last3Months: number;
    last6Months: number;
    last12Months: number;
  };
  customerLifetimeValue: number;
}


/**
 * Calculate comprehensive statistics for a customer
 */
export async function calculateCustomerStatistics(
  customerId: string,
  businessId: string
): Promise<CustomerStatistics> {
  const supabase = createAdminClient();

  // Get all appointments for this customer
  const appointmentsResult = await supabase
    .from('appointments')
    .select(`
      *,
      services (id, name, price),
      workers (id, name)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .order('start', { ascending: false }) as {
    data: Array<AppointmentRow & {
      services: ServiceRow | null;
      workers: WorkerRow | null;
    }> | null;
    error: any;
  };

  const appointments = appointmentsResult.data || [];

  // Get customer info for last visit
  const customerResult = await supabase
    .from('customers')
    .select('last_visit')
    .eq('id', customerId)
    .single() as { data: { last_visit: string | null } | null; error: any };

  const lastVisitDate = customerResult.data?.last_visit || null;

  // Calculate date ranges
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last3MonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const last12MonthsStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  // Filter appointments by date ranges
  const thisMonthAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.start);
    return aptDate >= thisMonthStart && apt.status !== 'cancelled';
  });

  const thisYearAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.start);
    return aptDate >= thisYearStart && apt.status !== 'cancelled';
  });

  const lastMonthAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.start);
    return aptDate >= lastMonthStart && aptDate < thisMonthStart && apt.status !== 'cancelled';
  });

  const last3MonthsAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.start);
    return aptDate >= last3MonthsStart && apt.status !== 'cancelled';
  });

  const last6MonthsAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.start);
    return aptDate >= last6MonthsStart && apt.status !== 'cancelled';
  });

  const last12MonthsAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.start);
    return aptDate >= last12MonthsStart && apt.status !== 'cancelled';
  });

  // Calculate totals
  const totalAppointments = appointments.filter((apt) => apt.status !== 'cancelled').length;
  const totalAppointmentsThisMonth = thisMonthAppointments.length;
  const totalAppointmentsThisYear = thisYearAppointments.length;

  // Calculate revenue
  const calculateRevenue = (apts: typeof appointments) => {
    return apts.reduce((sum, apt) => {
      const price = apt.services?.price || 0;
      return sum + price;
    }, 0);
  };

  const totalRevenue = calculateRevenue(appointments.filter((apt) => apt.status !== 'cancelled'));
  const totalRevenueThisMonth = calculateRevenue(thisMonthAppointments);
  const totalRevenueThisYear = calculateRevenue(thisYearAppointments);

  // Calculate average visits per month
  const monthsSinceFirstVisit = appointments.length > 0
    ? Math.max(1, Math.ceil((now.getTime() - new Date(appointments[appointments.length - 1].start).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 1;
  const averageVisitsPerMonth = totalAppointments / monthsSinceFirstVisit;

  // Calculate days since last visit
  const daysSinceLastVisit = lastVisitDate
    ? Math.floor((now.getTime() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate service preferences
  const serviceCounts = new Map<string, { serviceId: string; serviceName: string; count: number }>();
  appointments
    .filter((apt) => apt.status !== 'cancelled' && apt.services)
    .forEach((apt) => {
      const serviceId = apt.services!.id;
      const serviceName = apt.services!.name;
      const existing = serviceCounts.get(serviceId);
      if (existing) {
        existing.count++;
      } else {
        serviceCounts.set(serviceId, { serviceId, serviceName, count: 1 });
      }
    });

  const servicePreferences = Array.from(serviceCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 services

  // Calculate worker preferences
  const workerCounts = new Map<string, { workerId: string; workerName: string; count: number }>();
  appointments
    .filter((apt) => apt.status !== 'cancelled' && apt.workers)
    .forEach((apt) => {
      const workerId = apt.workers!.id;
      const workerName = apt.workers!.name;
      const existing = workerCounts.get(workerId);
      if (existing) {
        existing.count++;
      } else {
        workerCounts.set(workerId, { workerId, workerName, count: 1 });
      }
    });

  const workerPreferences = Array.from(workerCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 workers

  // Customer lifetime value (total revenue)
  const customerLifetimeValue = totalRevenue;

  return {
    totalAppointments,
    totalAppointmentsThisMonth,
    totalAppointmentsThisYear,
    totalRevenue,
    totalRevenueThisMonth,
    totalRevenueThisYear,
    averageVisitsPerMonth,
    lastVisitDate,
    daysSinceLastVisit,
    servicePreferences,
    workerPreferences,
    visitFrequency: {
      thisMonth: thisMonthAppointments.length,
      lastMonth: lastMonthAppointments.length,
      last3Months: last3MonthsAppointments.length,
      last6Months: last6MonthsAppointments.length,
      last12Months: last12MonthsAppointments.length,
    },
    customerLifetimeValue,
  };
}



