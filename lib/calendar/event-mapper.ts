/**
 * Event mapper for converting between Appointment and Calendar Event interfaces
 * 
 * Note: This file contains legacy event mapping functions for internal use.
 * For big-calendar integration, use the functions in big-calendar-mapper.ts
 */

import type { Appointment, Worker } from '@/components/ported/types/admin';

// Calendar Event interface
export interface SchedulerEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  variant?: 'primary' | 'danger' | 'success' | 'warning' | 'default';
  color?: string;
}

// Extended event with appointment metadata
export interface ExtendedSchedulerEvent extends SchedulerEvent {
  appointmentId?: string;
  serviceId?: string;
  customerId?: string;
  workerId?: string;
  service?: string;
  customer?: string;
  worker?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  isGroupAppointment?: boolean;
  currentParticipants?: number;
  maxCapacity?: number;
}

/**
 * Convert Appointment to Calendar Event
 */
export function appointmentToEvent(
  appointment: Appointment,
  worker?: Worker
): ExtendedSchedulerEvent {
  const startDate = new Date(appointment.start);
  const endDate = new Date(appointment.end);

  // Map status to variant
  let variant: 'primary' | 'danger' | 'success' | 'warning' | 'default' = 'default';
  if (appointment.status === 'confirmed') {
    variant = 'success';
  } else if (appointment.status === 'pending') {
    variant = 'warning';
  } else if (appointment.status === 'cancelled') {
    variant = 'danger';
  }

  // Build title based on appointment type
  let title = appointment.service;
  if (appointment.isGroupAppointment && appointment.maxCapacity) {
    title = `${appointment.service} (${appointment.currentParticipants || 1}/${appointment.maxCapacity})`;
  }

  // Build description with customer and worker info
  let description = '';
  if (appointment.isGroupAppointment) {
    description = `Group class • ${worker?.name || 'Unknown worker'}`;
  } else {
    description = `${appointment.customer} • ${worker?.name || 'Unknown worker'}`;
  }

  return {
    id: appointment.id,
    title,
    description,
    startDate,
    endDate,
    variant,
    color: worker?.color || '#9CA3AF',
    // Store original appointment data
    appointmentId: appointment.id,
    serviceId: appointment.serviceId,
    customerId: appointment.customerId,
    workerId: appointment.workerId || appointment.staffId,
    service: appointment.service,
    customer: appointment.customer,
    worker: worker?.name,
    status: appointment.status,
    isGroupAppointment: appointment.isGroupAppointment,
    currentParticipants: appointment.currentParticipants,
    maxCapacity: appointment.maxCapacity,
  };
}

/**
 * Convert Calendar Event to Appointment
 */
export function eventToAppointment(
  event: ExtendedSchedulerEvent,
  defaultStatus: 'confirmed' | 'pending' | 'cancelled' = 'confirmed'
): Partial<Appointment> {
  return {
    id: event.appointmentId || event.id,
    serviceId: event.serviceId,
    customerId: event.customerId,
    workerId: event.workerId,
    staffId: event.workerId,
    service: event.service || event.title,
    customer: event.customer || '',
    start: event.startDate.toISOString(),
    end: event.endDate.toISOString(),
    status: event.status || defaultStatus,
    isGroupAppointment: event.isGroupAppointment,
    currentParticipants: event.currentParticipants,
    maxCapacity: event.maxCapacity,
  };
}

/**
 * Convert array of Appointments to Events
 */
export function appointmentsToEvents(
  appointments: Appointment[],
  workers: Worker[]
): ExtendedSchedulerEvent[] {
  return appointments.map((appointment) => {
    const worker = workers.find(
      (w) => w.id === appointment.workerId || w.id === appointment.staffId
    );
    return appointmentToEvent(appointment, worker);
  });
}

