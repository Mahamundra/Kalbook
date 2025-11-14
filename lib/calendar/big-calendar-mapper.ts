/**
 * Data mapper for converting between Appointment/Worker and big-calendar IEvent/IUser formats
 */

import type { Appointment, Worker } from '@/components/ported/types/admin';
import type { IEvent, IUser } from '@/calendar/interfaces';
import type { TEventColor } from '@/calendar/types';

/**
 * Map worker color to big-calendar color
 */
function mapWorkerColorToEventColor(workerColor?: string): TEventColor {
  if (!workerColor) return 'gray';
  
  const colorLower = workerColor.toLowerCase();
  if (colorLower.includes('blue') || colorLower === '#3b82f6' || colorLower === '#2563eb') return 'blue';
  if (colorLower.includes('green') || colorLower === '#10b981' || colorLower === '#059669') return 'green';
  if (colorLower.includes('red') || colorLower === '#ef4444' || colorLower === '#dc2626') return 'red';
  if (colorLower.includes('yellow') || colorLower === '#f59e0b' || colorLower === '#d97706') return 'yellow';
  if (colorLower.includes('purple') || colorLower === '#8b5cf6' || colorLower === '#7c3aed') return 'purple';
  if (colorLower.includes('orange') || colorLower === '#f97316' || colorLower === '#ea580c') return 'orange';
  
  return 'gray';
}

/**
 * Convert Worker to big-calendar IUser format
 */
export function workerToBigCalendarUser(worker: Worker): IUser {
  return {
    id: worker.id,
    name: worker.name,
    picturePath: (worker as any).avatar || null,
  };
}

/**
 * Store mapping of event ID to appointment ID for reverse lookup
 */
const eventIdToAppointmentIdMap = new Map<number, string>();

/**
 * Convert Appointment to big-calendar IEvent format
 */
export function appointmentToBigCalendarEvent(
  appointment: Appointment,
  worker?: Worker
): IEvent {
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

  // Map worker color to event color
  const color = mapWorkerColorToEventColor(worker?.color);

  // Create user object for the event
  const user: IUser = worker ? workerToBigCalendarUser(worker) : {
    id: appointment.workerId || appointment.staffId || 'unknown',
    name: worker?.name || 'Unknown',
    picturePath: null,
  };

  // Generate a numeric ID from the appointment ID (for big-calendar compatibility)
  // Use a hash function to convert UUID to number
  const numericId = hashStringToNumber(appointment.id);
  
  // Store mapping for reverse lookup
  eventIdToAppointmentIdMap.set(numericId, appointment.id);

  return {
    id: numericId,
    startDate: appointment.start,
    endDate: appointment.end,
    title,
    color,
    description,
    user,
  };
}

/**
 * Hash string to number for big-calendar ID compatibility
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get original appointment ID from big-calendar event ID
 */
export function getAppointmentIdFromEventId(eventId: number): string | undefined {
  return eventIdToAppointmentIdMap.get(eventId);
}

/**
 * Clear the ID mapping (useful when refreshing events)
 */
export function clearEventIdMapping(): void {
  eventIdToAppointmentIdMap.clear();
}

/**
 * Convert array of Appointments to big-calendar IEvent array
 */
export function appointmentsToBigCalendarEvents(
  appointments: Appointment[],
  workers: Worker[]
): IEvent[] {
  return appointments.map((appointment) => {
    const worker = workers.find(
      (w) => w.id === appointment.workerId || w.id === appointment.staffId
    );
    return appointmentToBigCalendarEvent(appointment, worker);
  });
}

/**
 * Convert array of Workers to big-calendar IUser array
 */
export function workersToBigCalendarUsers(workers: Worker[]): IUser[] {
  return workers.map(workerToBigCalendarUser);
}

