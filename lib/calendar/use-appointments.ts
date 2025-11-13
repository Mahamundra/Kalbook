/**
 * Custom hook for managing appointments with calendar
 */

import { useState, useEffect, useCallback } from 'react';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '@/lib/api/services';
import { getWorkers, getServices } from '@/lib/api/services';
import type { Appointment, Worker, Service } from '@/components/ported/types/admin';
import { appointmentsToEvents, type ExtendedSchedulerEvent } from './event-mapper';

interface UseAppointmentsOptions {
  startDate?: Date;
  endDate?: Date;
  workerId?: string;
  autoRefresh?: boolean;
}

interface UseAppointmentsReturn {
  events: ExtendedSchedulerEvent[];
  appointments: Appointment[];
  workers: Worker[];
  services: Service[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (appointment: Omit<Appointment, 'id'>) => Promise<Appointment | null>;
  update: (id: string, appointment: Partial<Appointment>) => Promise<Appointment | null>;
  remove: (id: string) => Promise<boolean>;
}

export function useAppointments(
  options: UseAppointmentsOptions = {}
): UseAppointmentsReturn {
  const { startDate, endDate, workerId, autoRefresh = true } = options;

  const [events, setEvents] = useState<ExtendedSchedulerEvent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create stable date strings for comparison
  const startDateStr = startDate ? startDate.toISOString() : undefined;
  const endDateStr = endDate ? endDate.toISOString() : undefined;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [appointmentsData, workersData, servicesData] = await Promise.all([
        getAppointments().then((apps) => {
          // Filter by date range if provided
          let filtered = apps;
          if (startDate) {
            filtered = filtered.filter((apt) => new Date(apt.start) >= startDate);
          }
          if (endDate) {
            filtered = filtered.filter((apt) => new Date(apt.start) <= endDate);
          }
          if (workerId) {
            filtered = filtered.filter(
              (apt) => apt.workerId === workerId || apt.staffId === workerId
            );
          }
          return filtered;
        }),
        getWorkers().then((w) => w.filter((worker) => worker.active)),
        getServices(),
      ]);

      setAppointments(appointmentsData);
      setWorkers(workersData);
      setServices(servicesData);

      // Convert appointments to events
      const eventsData = appointmentsToEvents(appointmentsData, workersData);
      setEvents(eventsData);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError(err.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
    // Use string versions to avoid Date object reference issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDateStr, endDateStr, workerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const create = useCallback(
    async (appointment: Omit<Appointment, 'id'>): Promise<Appointment | null> => {
      try {
        const newAppointment = await createAppointment({
          ...appointment,
          createdBy: 'admin',
        });
        await refresh();
        return newAppointment;
      } catch (err: any) {
        console.error('Error creating appointment:', err);
        setError(err.message || 'Failed to create appointment');
        return null;
      }
    },
    [refresh]
  );

  const update = useCallback(
    async (
      id: string,
      appointment: Partial<Appointment>
    ): Promise<Appointment | null> => {
      try {
        const updatedAppointment = await updateAppointment(id, appointment);
        await refresh();
        return updatedAppointment;
      } catch (err: any) {
        console.error('Error updating appointment:', err);
        setError(err.message || 'Failed to update appointment');
        return null;
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const success = await deleteAppointment(id);
        if (success) {
          await refresh();
        }
        return success;
      } catch (err: any) {
        console.error('Error deleting appointment:', err);
        setError(err.message || 'Failed to delete appointment');
        return false;
      }
    },
    [refresh]
  );

  return {
    events,
    appointments,
    workers,
    services,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
  };
}

