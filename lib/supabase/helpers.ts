/**
 * Database helper functions for common operations
 */

import { createClient } from './server';
import type { Database } from './database.types';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Get the current user's business ID from their session
 */
export async function getCurrentUserBusinessId(): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single();

  return (data as { business_id: string } | null)?.business_id || null;
}

/**
 * Get business by slug
 */
export async function getBusinessBySlug(slug: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get appointments for a business within a date range
 */
export async function getAppointmentsByDateRange(
  businessId: string,
  startDate: Date,
  endDate: Date
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      customers (*),
      services (*),
      workers (*)
    `)
    .eq('business_id', businessId)
    .gte('start', startDate.toISOString())
    .lte('start', endDate.toISOString())
    .order('start', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get customer by phone number
 */
export async function getCustomerByPhone(businessId: string, phone: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get active services for a business
 */
export async function getActiveServices(businessId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data;
}

/**
 * Get active workers for a business
 */
export async function getActiveWorkers(businessId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data;
}

/**
 * Get workers that can provide a specific service
 */
export async function getWorkersForService(businessId: string, serviceId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('worker_services')
    .select(`
      worker_id,
      workers!inner (*)
    `)
    .eq('service_id', serviceId)
    .eq('workers.business_id', businessId)
    .eq('workers.active', true);

  if (error) throw error;
  
  if (!data) return [];
  
  return data
    .map((item: any) => item.workers)
    .filter((worker: any): worker is Tables<'workers'> => 
      worker && worker.business_id === businessId && worker.active === true
    );
}

/**
 * Check if a time slot is available for a worker
 */
export async function isTimeSlotAvailable(
  businessId: string,
  workerId: string,
  start: Date,
  end: Date
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('appointments')
    .select('id')
    .eq('business_id', businessId)
    .eq('worker_id', workerId)
    .eq('status', 'confirmed')
    .lte('start', end.toISOString())
    .gte('end', start.toISOString())
    .limit(1);

  if (error) throw error;
  return data?.length === 0;
}

