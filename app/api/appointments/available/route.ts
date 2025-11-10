import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { checkAppointmentConflict, isWithinWorkingHours } from '@/lib/appointments/utils';
import type { Database } from '@/lib/supabase/database.types';

type ServiceRow = Database['public']['Tables']['services']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

interface AvailableTimeSlot {
  start: string;
  end: string;
  workerId: string;
  workerName: string;
}

/**
 * GET /api/appointments/available
 * Get available time slots for a date/service/worker
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');
    const workerId = searchParams.get('workerId');
    const timeSlotGap = parseInt(searchParams.get('timeSlotGap') || '30', 10);

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get service details
    const serviceResult = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('business_id', tenantInfo.businessId)
      .eq('active', true)
      .single() as { data: ServiceRow | null; error: any };
    const { data: service, error: serviceError } = serviceResult;

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404 }
      );
    }

    // Get working hours from settings
    const settingsResult = await supabase
      .from('settings')
      .select('calendar')
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { calendar?: any } | null; error: any };
    const settings = settingsResult.data;

    const workingHours = settings?.calendar?.workingHours || {
      start: '09:00',
      end: '18:00',
    };
    const workingDays = settings?.calendar?.workingDays || [0, 1, 2, 3, 4, 5, 6];
    const slotGap = settings?.calendar?.timeSlotGap || timeSlotGap;

    // Check if date is a working day
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    if (!workingDays.includes(dayOfWeek)) {
      return NextResponse.json({
        success: true,
        availableSlots: [],
        message: 'Requested date is not a working day',
      });
    }

    // Get workers who can provide this service
    let workersQuery = supabase
      .from('worker_services')
      .select('worker_id, workers!inner(*)')
      .eq('service_id', serviceId);

    if (workerId) {
      workersQuery = workersQuery.eq('worker_id', workerId);
    }

    const { data: workerServices, error: workersError } = await workersQuery;

    if (workersError || !workerServices || workerServices.length === 0) {
      return NextResponse.json(
        { error: 'No workers available for this service' },
        { status: 404 }
      );
    }

    // Extract workers
    const workers = workerServices
      .map((ws: any) => ws.workers)
      .filter((w: any) => w && w.active && w.business_id === tenantInfo.businessId);

    if (workers.length === 0) {
      return NextResponse.json(
        { error: 'No active workers available for this service' },
        { status: 404 }
      );
    }

    // Get existing appointments for the date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointmentsResult = await supabase
      .from('appointments')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .gte('start', startOfDay.toISOString())
      .lte('start', endOfDay.toISOString())
      .in('status', ['confirmed', 'pending']) as { data: AppointmentRow[] | null; error: any };
    const existingAppointments = appointmentsResult.data;

    // Generate time slots
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    const availableSlots: AvailableTimeSlot[] = [];

    for (const worker of workers) {
      const currentTime = new Date(requestedDate);
      currentTime.setHours(startHour, startMin, 0, 0);

      const endTime = new Date(requestedDate);
      endTime.setHours(endHour, endMin, 0, 0);

      while (currentTime < endTime) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + service.duration);

        // Check if slot fits within working hours
        if (slotEnd <= endTime) {
          // Check if slot conflicts with existing appointments
          const hasConflict = existingAppointments?.some((apt) => {
            if (apt.worker_id !== worker.id) return false;
            const aptStart = new Date(apt.start);
            const aptEnd = new Date(apt.end);
            return slotStart < aptEnd && slotEnd > aptStart;
          });

          if (!hasConflict) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              workerId: worker.id,
              workerName: worker.name,
            });
          }
        }

        // Move to next slot
        currentTime.setMinutes(currentTime.getMinutes() + slotGap);
      }
    }

    // Sort by start time
    availableSlots.sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return NextResponse.json({
      success: true,
      availableSlots,
      count: availableSlots.length,
      service: {
        id: service.id,
        name: service.name,
        duration: service.duration,
      },
      date: date,
    });
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}

