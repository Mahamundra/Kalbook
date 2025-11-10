/**
 * Appointment utility functions for validation and conflict detection
 */

import type { Database } from '@/lib/supabase/database.types';
import type { Appointment } from '@/components/ported/types/admin';
import type { AppointmentStatus } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Check if appointment time is within working hours
 */
export function isWithinWorkingHours(
  start: Date,
  end: Date,
  workingHours: { start?: string; end?: string } | null | undefined
): boolean {
  // If working hours are not provided, allow the appointment (no restriction)
  if (!workingHours || !workingHours.start || !workingHours.end) {
    return true;
  }

  // Validate that both start and end are strings
  if (typeof workingHours.start !== 'string' || typeof workingHours.end !== 'string') {
    return true; // If invalid format, allow the appointment
  }

  try {
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    // Validate that split resulted in valid numbers
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      return true; // If invalid format, allow the appointment
    }

    const appointmentStart = start.getHours() * 60 + start.getMinutes();
    const appointmentEnd = end.getHours() * 60 + end.getMinutes();
    const workingStart = startHour * 60 + startMin;
    const workingEnd = endHour * 60 + endMin;

    return appointmentStart >= workingStart && appointmentEnd <= workingEnd;
  } catch (error) {
    // If there's any error parsing, allow the appointment (fail open)
    console.error('Error parsing working hours:', error);
    return true;
  }
}

/**
 * Check if worker can provide the service
 */
export function workerCanProvideService(
  workerServices: string[],
  serviceId: string
): boolean {
  return workerServices.includes(serviceId);
}

/**
 * Validate service duration matches appointment duration
 */
export function validateServiceDuration(
  service: ServiceRow,
  start: Date,
  end: Date
): boolean {
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  return Math.abs(durationMinutes - service.duration) < 5; // Allow 5 minute tolerance
}

/**
 * Map database appointment row to Appointment interface
 */
export function mapAppointmentToInterface(
  appointment: AppointmentRow & {
    services?: { name: string };
    customers?: { name: string };
    workers?: { name: string };
  }
): Appointment {
  return {
    id: appointment.id,
    staffId: appointment.worker_id,
    workerId: appointment.worker_id,
    service: (appointment.services as any)?.name || '',
    serviceId: appointment.service_id,
    customer: (appointment.customers as any)?.name || '',
    customerId: appointment.customer_id,
    start: appointment.start,
    end: appointment.end,
    status: appointment.status,
  };
}

/**
 * Check for appointment conflicts
 */
export async function checkAppointmentConflict(
  supabase: any,
  businessId: string,
  workerId: string,
  start: Date,
  end: Date,
  excludeAppointmentId?: string
): Promise<{ hasConflict: boolean; conflictingAppointment?: any }> {
  let query = supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .eq('worker_id', workerId)
    .in('status', ['confirmed', 'pending']); // Only check confirmed and pending

  // Exclude current appointment if updating
  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }

  // Check for overlapping appointments
  query = query
    .lte('start', end.toISOString())
    .gte('end', start.toISOString());

  const { data: conflicts, error } = await query;

  if (error) {
    throw new Error(`Failed to check conflicts: ${error.message}`);
  }

  if (conflicts && conflicts.length > 0) {
    return {
      hasConflict: true,
      conflictingAppointment: conflicts[0],
    };
  }

  return { hasConflict: false };
}

