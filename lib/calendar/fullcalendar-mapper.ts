/**
 * Data mapper for converting between Appointment/Worker and FullCalendar event formats
 */

import type { Appointment, Worker } from '@/types/admin';
import type { EventInput } from '@fullcalendar/core';

/**
 * Map worker color to FullCalendar event color
 */
function mapWorkerColorToEventColor(workerColor?: string): string {
  if (!workerColor) return '#9CA3AF'; // gray default
  
  // If it's already a hex color, use it
  if (workerColor.startsWith('#')) {
    return workerColor;
  }
  
  // Map color names to hex
  const colorLower = workerColor.toLowerCase();
  if (colorLower.includes('blue') || colorLower === '#3b82f6' || colorLower === '#2563eb') return '#3B82F6';
  if (colorLower.includes('green') || colorLower === '#10b981' || colorLower === '#059669') return '#10B981';
  if (colorLower.includes('red') || colorLower === '#ef4444' || colorLower === '#dc2626') return '#EF4444';
  if (colorLower.includes('yellow') || colorLower === '#f59e0b' || colorLower === '#d97706') return '#F59E0B';
  if (colorLower.includes('purple') || colorLower === '#8b5cf6' || colorLower === '#7c3aed') return '#8B5CF6';
  if (colorLower.includes('orange') || colorLower === '#f97316' || colorLower === '#ea580c') return '#F97316';
  
  return '#9CA3AF'; // gray default
}

/**
 * Get event border color based on status
 */
function getStatusBorderColor(status: 'confirmed' | 'pending' | 'cancelled'): string {
  switch (status) {
    case 'confirmed':
      return '#10B981'; // green
    case 'pending':
      return '#F59E0B'; // yellow
    case 'cancelled':
      return '#EF4444'; // red
    default:
      return '#9CA3AF'; // gray
  }
}

/**
 * Convert Appointment to FullCalendar EventInput format
 */
export function appointmentToFullCalendarEvent(
  appointment: Appointment,
  worker?: Worker
): EventInput {
  // Build title based on appointment type
  let title = appointment.service;
  if (appointment.isGroupAppointment && appointment.maxCapacity) {
    title = `${appointment.service} (${appointment.currentParticipants || 1}/${appointment.maxCapacity})`;
  } else {
    // Add customer name for non-group appointments
    title = `${appointment.service} - ${appointment.customer}`;
  }

  // Map worker color to event background color
  const backgroundColor = mapWorkerColorToEventColor(worker?.color);
  const borderColor = getStatusBorderColor(appointment.status);

  return {
    id: appointment.id,
    title,
    start: appointment.start,
    end: appointment.end,
    backgroundColor,
    borderColor,
    textColor: '#FFFFFF',
    extendedProps: {
      appointmentId: appointment.id,
      serviceId: appointment.serviceId,
      customerId: appointment.customerId,
      workerId: appointment.workerId || appointment.staffId,
      service: appointment.service,
      customer: appointment.customer,
      worker: worker?.name || 'Unknown',
      status: appointment.status,
      isGroupAppointment: appointment.isGroupAppointment,
      currentParticipants: appointment.currentParticipants,
      maxCapacity: appointment.maxCapacity,
    },
  };
}

/**
 * Convert array of Appointments to FullCalendar EventInput array
 */
export function appointmentsToFullCalendarEvents(
  appointments: Appointment[],
  workers: Worker[]
): EventInput[] {
  return appointments.map((appointment) => {
    const worker = workers.find(
      (w) => w.id === appointment.workerId || w.id === appointment.staffId
    );
    return appointmentToFullCalendarEvent(appointment, worker);
  });
}

/**
 * Get appointment ID from FullCalendar event
 */
export function getAppointmentIdFromFullCalendarEvent(event: EventInput): string | undefined {
  if (typeof event.id === 'string') {
    return event.id;
  }
  return event.extendedProps?.appointmentId as string | undefined;
}












