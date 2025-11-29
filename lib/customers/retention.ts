/**
 * Client retention tracking utilities for gym_trainer businesses
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

export interface RetentionMetrics {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  atRiskClients: number;
  retentionRate: number;
}

/**
 * Get clients who haven't had an appointment in the last N days
 */
export async function getInactiveClients(
  businessId: string,
  daysThreshold: number = 14
): Promise<CustomerRow[]> {
  const supabase = createAdminClient();

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

  // Get all customers
  const { data: allCustomers, error: customersError } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId);

  if (customersError || !allCustomers) {
    return [];
  }

  // Get customers with appointments after cutoff date
  const { data: recentAppointments } = await supabase
    .from('appointments')
    .select('customer_id')
    .eq('business_id', businessId)
    .gte('start', cutoffDate.toISOString())
    .neq('status', 'cancelled');

  const activeCustomerIds = new Set(
    (recentAppointments || []).map((a: any) => a.customer_id)
  );

  // Filter out active customers
  return allCustomers.filter((customer) => !activeCustomerIds.has(customer.id));
}

/**
 * Get clients at risk (inactive but with active membership)
 */
export async function getAtRiskClients(
  businessId: string,
  daysThreshold: number = 14
): Promise<CustomerRow[]> {
  const inactiveClients = await getInactiveClients(businessId, daysThreshold);

  if (inactiveClients.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const inactiveCustomerIds = inactiveClients.map((c) => c.id);

  // Get clients with active memberships
  const { data: activeMemberships } = await supabase
    .from('memberships')
    .select('customer_id')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .in('customer_id', inactiveCustomerIds);

  const atRiskCustomerIds = new Set(
    (activeMemberships || []).map((m: any) => m.customer_id)
  );

  return inactiveClients.filter((customer) =>
    atRiskCustomerIds.has(customer.id)
  );
}

/**
 * Calculate retention metrics for a business
 */
export async function getRetentionMetrics(
  businessId: string,
  daysThreshold: number = 14
): Promise<RetentionMetrics> {
  const supabase = createAdminClient();

  // Get total clients
  const { count: totalClients } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);

  // Get active clients (had appointment in last N days)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

  const { data: recentAppointments } = await supabase
    .from('appointments')
    .select('customer_id')
    .eq('business_id', businessId)
    .gte('start', cutoffDate.toISOString())
    .neq('status', 'cancelled');

  const activeCustomerIds = new Set(
    (recentAppointments || []).map((a: any) => a.customer_id)
  );
  const activeClients = activeCustomerIds.size;

  const inactiveClients = (totalClients || 0) - activeClients;
  const atRiskClients = (await getAtRiskClients(businessId, daysThreshold))
    .length;

  const retentionRate =
    totalClients && totalClients > 0
      ? (activeClients / totalClients) * 100
      : 0;

  return {
    totalClients: totalClients || 0,
    activeClients,
    inactiveClients,
    atRiskClients,
    retentionRate: Math.round(retentionRate * 100) / 100,
  };
}

/**
 * Mark a client as inactive or at risk
 */
export async function markClientStatus(
  customerId: string,
  status: 'active' | 'inactive' | 'at_risk'
): Promise<void> {
  // This could be extended to add a status column to customers table
  // For now, we calculate status dynamically
  // Future enhancement: add customer_status column to customers table
}

