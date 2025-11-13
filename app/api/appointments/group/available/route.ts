import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { getServiceCapacity, getAvailableCapacity } from '@/lib/appointments/group-utils';
import type { Database } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/appointments/group/available
 * Get available group appointment slots for a service
 * Query params: serviceId, workerId (optional), startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const workerId = searchParams.get('workerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const businessSlug = searchParams.get('businessSlug');

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }

    // Get tenant context (support both businessSlug query param and header/cookie)
    let tenantInfo;
    if (businessSlug) {
      const supabase = createAdminClient();
      const businessResult = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', businessSlug)
        .single() as { data: { id: string } | null; error: any };
      
      if (businessResult.error || !businessResult.data) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
      
      tenantInfo = { businessId: businessResult.data.id };
    } else {
      tenantInfo = await getTenantInfoFromRequest(request);
      if (!tenantInfo?.businessId) {
        return NextResponse.json(
          { error: 'Business context required' },
          { status: 400 }
        );
      }
    }

    // Check if service is a group service
    const serviceCapacity = await getServiceCapacity(serviceId);
    if (!serviceCapacity || !serviceCapacity.isGroupService) {
      return NextResponse.json({
        success: true,
        isGroupService: false,
        appointments: [],
      });
    }

    const supabase = createAdminClient();

    // Build query for group appointments
    let query = supabase
      .from('appointments')
      .select(`
        id,
        service_id,
        worker_id,
        start,
        end,
        is_group_appointment,
        current_participants,
        status,
        workers (name),
        services (name, max_capacity)
      `)
      .eq('service_id', serviceId)
      .eq('business_id', tenantInfo.businessId)
      .eq('is_group_appointment', true)
      .neq('status', 'cancelled');

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    if (startDate) {
      query = query.gte('start', startDate);
    }

    if (endDate) {
      query = query.lte('start', endDate);
    }

    const result = await query as { data: Array<any> | null; error: any };
    const { data: appointments, error } = result;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    // Get capacity info for each appointment
    const appointmentsWithCapacity = await Promise.all(
      (appointments || []).map(async (appointment) => {
        const capacity = await getAvailableCapacity(appointment.id);
        return {
          id: appointment.id,
          serviceId: appointment.service_id,
          workerId: appointment.worker_id,
          workerName: appointment.workers?.name || 'Unknown',
          serviceName: appointment.services?.name || 'Unknown',
          start: appointment.start,
          end: appointment.end,
          status: appointment.status,
          currentParticipants: appointment.current_participants || 1,
          maxCapacity: appointment.services?.max_capacity || null,
          availableSpots: capacity?.available || 0,
          isFull: capacity?.isFull || false,
        };
      })
    );

    // Filter to only show appointments with available spots (or allow waitlist)
    const availableAppointments = appointmentsWithCapacity.filter(
      (apt) => !apt.isFull || serviceCapacity.allowWaitlist
    );

    return NextResponse.json({
      success: true,
      isGroupService: true,
      serviceCapacity: {
        maxCapacity: serviceCapacity.maxCapacity,
        minCapacity: serviceCapacity.minCapacity,
        allowWaitlist: serviceCapacity.allowWaitlist,
      },
      appointments: availableAppointments,
    });
  } catch (error: any) {
    console.error('Error fetching available group appointments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch available group appointments' },
      { status: 500 }
    );
  }
}

