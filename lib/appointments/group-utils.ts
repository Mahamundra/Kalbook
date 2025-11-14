/**
 * Utility functions for managing group appointments
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type ServiceRow = Database['public']['Tables']['services']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type AppointmentParticipantRow = Database['public']['Tables']['appointment_participants']['Row'];

/**
 * Check if a service is a group service
 */
export async function isGroupService(serviceId: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  const result = await supabase
    .from('services')
    .select('is_group_service, max_capacity')
    .eq('id', serviceId)
    .single() as { data: ServiceRow | null; error: any };
  
  if (result.error || !result.data) {
    return false;
  }
  
  return result.data.is_group_service === true && (result.data.max_capacity ?? 0) > 1;
}

/**
 * Get service capacity information
 */
export async function getServiceCapacity(serviceId: string): Promise<{
  isGroupService: boolean;
  maxCapacity: number | null;
  minCapacity: number | null;
  allowWaitlist: boolean;
} | null> {
  const supabase = createAdminClient();
  
  const result = await supabase
    .from('services')
    .select('is_group_service, max_capacity, min_capacity, allow_waitlist')
    .eq('id', serviceId)
    .single() as { data: ServiceRow | null; error: any };
  
  if (result.error || !result.data) {
    return null;
  }
  
  return {
    isGroupService: result.data.is_group_service || false,
    maxCapacity: result.data.max_capacity,
    minCapacity: result.data.min_capacity,
    allowWaitlist: result.data.allow_waitlist || false,
  };
}

/**
 * Get available capacity for an appointment
 */
export async function getAvailableCapacity(appointmentId: string): Promise<{
  current: number;
  max: number | null;
  available: number | null;
  isFull: boolean;
} | null> {
  const supabase = createAdminClient();
  
  // Get appointment with service info
  const appointmentResult = await supabase
    .from('appointments')
    .select(`
      id,
      is_group_appointment,
      current_participants,
      service_id,
      services!inner (
        is_group_service,
        max_capacity
      )
    `)
    .eq('id', appointmentId)
    .single() as { data: any | null; error: any };
  
  if (appointmentResult.error || !appointmentResult.data) {
    return null;
  }
  
  const appointment = appointmentResult.data;
  const service = appointment.services;
  
  if (!appointment.is_group_appointment || !service.is_group_service) {
    return {
      current: 1,
      max: 1,
      available: 0,
      isFull: true,
    };
  }
  
  const maxCapacity = service.max_capacity ?? 1;
  const current = appointment.current_participants ?? 1;
  const available = maxCapacity - current;
  
  return {
    current,
    max: maxCapacity,
    available: Math.max(0, available),
    isFull: available <= 0,
  };
}

/**
 * Check if a customer can join an appointment
 */
export async function canJoinAppointment(
  appointmentId: string,
  customerId: string
): Promise<{
  canJoin: boolean;
  reason?: string;
  availableSpots?: number;
}> {
  const capacity = await getAvailableCapacity(appointmentId);
  
  if (!capacity) {
    return {
      canJoin: false,
      reason: 'Appointment not found',
    };
  }
  
  // Check if it's a group appointment by checking if max > 1
  if (!capacity.max || capacity.max <= 1) {
    return {
      canJoin: false,
      reason: 'This is not a group appointment',
    };
  }
  
  // Check if customer is already a participant
  const supabase = createAdminClient();
  const participantResult = await supabase
    .from('appointment_participants')
    .select('id, status')
    .eq('appointment_id', appointmentId)
    .eq('customer_id', customerId)
    .maybeSingle() as { data: AppointmentParticipantRow | null; error: any };
  
  if (participantResult.data && participantResult.data.status !== 'cancelled') {
    return {
      canJoin: false,
      reason: 'Customer is already a participant',
    };
  }
  
  if (capacity.isFull) {
    return {
      canJoin: false,
      reason: 'Appointment is full',
      availableSpots: 0,
    };
  }
  
  return {
    canJoin: true,
    availableSpots: capacity.available ?? undefined,
  };
}

/**
 * Add a participant to a group appointment
 */
export async function addParticipantToAppointment(
  appointmentId: string,
  customerId: string,
  status: 'confirmed' | 'waitlist' = 'confirmed'
): Promise<{
  success: boolean;
  participantId?: string;
  error?: string;
}> {
  const supabase = createAdminClient();
  
  // Check if can join
  const canJoin = await canJoinAppointment(appointmentId, customerId);
  if (!canJoin.canJoin) {
    // If full and waitlist is allowed, add as waitlist
    if (canJoin.reason === 'Appointment is full') {
      const appointmentResult = await supabase
        .from('appointments')
        .select('service_id, services!inner (allow_waitlist)')
        .eq('id', appointmentId)
        .single() as { data: any | null; error: any };
      
      if (appointmentResult.data?.services?.allow_waitlist) {
        status = 'waitlist';
      } else {
        return {
          success: false,
          error: canJoin.reason || 'Cannot join appointment',
        };
      }
    } else {
      return {
        success: false,
        error: canJoin.reason || 'Cannot join appointment',
      };
    }
  }
  
  // Check if participant already exists (cancelled)
  const existingResult = await supabase
    .from('appointment_participants')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('customer_id', customerId)
    .maybeSingle() as { data: { id: string } | null; error: any };
  
  if (existingResult.data) {
    // Update existing participant
    const updateResult = await (supabase
      .from('appointment_participants') as any)
      .update({
        status,
        joined_at: new Date().toISOString(),
      })
      .eq('id', existingResult.data.id)
      .select()
      .single() as { data: AppointmentParticipantRow | null; error: any };
    
    if (updateResult.error) {
      return {
        success: false,
        error: updateResult.error.message || 'Failed to update participant',
      };
    }
    
    return {
      success: true,
      participantId: updateResult.data.id,
    };
  }
  
  // Create new participant
  const insertResult = await supabase
    .from('appointment_participants')
    .insert({
      appointment_id: appointmentId,
      customer_id: customerId,
      status,
      joined_at: new Date().toISOString(),
    } as any)
    .select()
    .single() as { data: AppointmentParticipantRow | null; error: any };
  
  if (insertResult.error) {
    return {
      success: false,
      error: insertResult.error.message || 'Failed to add participant',
    };
  }
  
  return {
    success: true,
    participantId: insertResult.data.id,
  };
}

/**
 * Remove a participant from an appointment
 */
export async function removeParticipantFromAppointment(
  appointmentId: string,
  customerId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();
  
  const result = await supabase
    .from('appointment_participants')
    .delete()
    .eq('appointment_id', appointmentId)
    .eq('customer_id', customerId) as { error: any };
  
  if (result.error) {
    return {
      success: false,
      error: result.error.message || 'Failed to remove participant',
    };
  }
  
  return {
    success: true,
  };
}

/**
 * Get all participants for an appointment
 */
export async function getAppointmentParticipants(
  appointmentId: string
): Promise<Array<{
  id: string;
  customerId: string;
  customerName?: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
  joinedAt: string;
}>> {
  const supabase = createAdminClient();
  
  const result = await supabase
    .from('appointment_participants')
    .select(`
      id,
      customer_id,
      status,
      joined_at,
      customers (
        name
      )
    `)
    .eq('appointment_id', appointmentId)
    .order('joined_at', { ascending: true }) as { data: Array<{
      id: string;
      customer_id: string;
      status: 'confirmed' | 'waitlist' | 'cancelled';
      joined_at: string;
      customers: { name: string } | null;
    }> | null; error: any };
  
  if (result.error || !result.data) {
    return [];
  }
  
  return result.data.map(p => ({
    id: p.id,
    customerId: p.customer_id,
    customerName: p.customers?.name,
    status: p.status,
    joinedAt: p.joined_at,
  }));
}

/**
 * Find existing group appointment at the same time/worker for a service
 */
export async function findExistingGroupAppointment(
  serviceId: string,
  workerId: string,
  start: string,
  end: string
): Promise<AppointmentRow | null> {
  const supabase = createAdminClient();
  
  // Check if service is a group service
  const serviceCapacity = await getServiceCapacity(serviceId);
  if (!serviceCapacity || !serviceCapacity.isGroupService) {
    return null;
  }
  
  // Find appointments at the same time/worker/service
  const result = await supabase
    .from('appointments')
    .select('*')
    .eq('service_id', serviceId)
    .eq('worker_id', workerId)
    .eq('start', start)
    .eq('end', end)
    .eq('is_group_appointment', true)
    .neq('status', 'cancelled')
    .maybeSingle() as { data: AppointmentRow | null; error: any };
  
  if (result.error || !result.data) {
    return null;
  }
  
  // Check if it has available capacity
  const capacity = await getAvailableCapacity(result.data.id);
  if (capacity && !capacity.isFull) {
    return result.data;
  }
  
  return null;
}

