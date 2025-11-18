import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapAppointmentToInterface } from '@/lib/appointments/utils';
import { isTrialExpired, canBusinessPerformAction } from '@/lib/trial/utils';
import type { Appointment } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];
type WorkerRow = Database['public']['Tables']['workers']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

/**
 * GET /api/appointments
 * Get all appointments for the current business (with date filtering)
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const workerId = searchParams.get('workerId');
    const customerId = searchParams.get('customerId');
    const serviceId = searchParams.get('serviceId');
    const status = searchParams.get('status');

    const supabase = createAdminClient();

    // Build query with related data
    let query = supabase
      .from('appointments')
      .select(`
        *,
        services (name, max_capacity),
        customers (name),
        workers (name)
      `)
      .eq('business_id', tenantInfo.businessId);

    // Apply filters
    if (startDate) {
      query = query.gte('start', startDate);
    }

    if (endDate) {
      query = query.lte('start', endDate);
    }

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Order by start time
    query = query.order('start', { ascending: true });

    const { data: appointments, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    // Map to Appointment interface
    const mappedAppointments: Appointment[] = (appointments || []).map(
      mapAppointmentToInterface
    );

    return NextResponse.json({
      success: true,
      appointments: mappedAppointments,
      count: mappedAppointments.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments
 * Create a new appointment with conflict detection
 */
export async function POST(request: NextRequest) {
  let requestBody: any = null;
  try {
    requestBody = await request.json();

    // Get tenant context
    let tenantInfo;
    try {
      tenantInfo = await getTenantInfoFromRequest(request);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Failed to get business context', details: error.message },
        { status: 500 }
      );
    }

    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if trial expired
    const expired = await isTrialExpired(tenantInfo.businessId);
    if (expired) {
      return NextResponse.json(
        { error: 'Trial period has expired. Please upgrade your plan to continue booking appointments.' },
        { status: 403 }
      );
    }

    // Check if business can create appointments
    const canCreate = await canBusinessPerformAction(tenantInfo.businessId, 'create_appointments');
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Your plan does not allow creating appointments. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Check max_bookings_per_month limit
    const { checkPlanLimit, countBusinessAppointmentsThisMonth } = await import('@/lib/trial/utils');
    const currentAppointmentCount = await countBusinessAppointmentsThisMonth(tenantInfo.businessId);
    const limitCheck = await checkPlanLimit(tenantInfo.businessId, 'max_bookings_per_month', currentAppointmentCount);
    if (!limitCheck.canProceed) {
      return NextResponse.json(
        { 
          error: `You have reached the maximum number of appointments this month (${limitCheck.limit}) for your plan. Please upgrade to continue booking.`,
          limit: limitCheck.limit,
          current: currentAppointmentCount
        },
        { status: 403 }
      );
    }

    const body = requestBody;

    // Validate required fields
    if (!body.customerId || !body.serviceId || !body.workerId) {
      return NextResponse.json(
        { error: 'customerId, serviceId, and workerId are required' },
        { status: 400 }
      );
    }

    if (!body.start || !body.end) {
      return NextResponse.json(
        { error: 'start and end times are required' },
        { status: 400 }
      );
    }

    // Determine if appointment is created by customer or admin
    // Check referer header or createdBy parameter
    const referer = request.headers.get('referer') || '';
    const isCustomerRequest = referer.includes('/booking') || referer.includes('/b/') || body.createdBy === 'customer';
    const createdBy = body.createdBy || (isCustomerRequest ? 'customer' : 'admin');

    const supabase = createAdminClient();

    // Parse dates
    const start = new Date(body.start);
    const end = new Date(body.end);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    if (start < new Date()) {
      return NextResponse.json(
        { error: 'Cannot create appointments in the past' },
        { status: 400 }
      );
    }

    // Verify customer exists and belongs to business
    const customerResult = await supabase
      .from('customers')
      .select('id, blocked')
      .eq('id', body.customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: CustomerRow | null; error: any };

    if (customerResult.error || !customerResult.data) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult.data;
    const customerData = customer as { id: string; blocked: boolean };
    if (customerData.blocked) {
      return NextResponse.json(
        { error: 'Cannot create appointment for blocked customer' },
        { status: 403 }
      );
    }

    // Verify service exists and belongs to business
    const serviceResult = await supabase
      .from('services')
      .select('*')
      .eq('id', body.serviceId)
      .eq('business_id', tenantInfo.businessId)
      .eq('active', true)
      .single() as { data: ServiceRow | null; error: any };

    if (serviceResult.error || !serviceResult.data) {
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404 }
      );
    }

    const service = serviceResult.data;
    const serviceData = service as { id: string; duration: number; [key: string]: any };

    // Verify worker exists and belongs to business
    const workerResult = await supabase
      .from('workers')
      .select('*, worker_services!inner(service_id)')
      .eq('id', body.workerId)
      .eq('business_id', tenantInfo.businessId)
      .eq('active', true)
      .single() as { data: (WorkerRow & { worker_services: any[] }) | null; error: any };

    if (workerResult.error || !workerResult.data) {
      return NextResponse.json(
        { error: 'Worker not found or inactive' },
        { status: 404 }
      );
    }

    const worker = workerResult.data;
    const workerData = worker as { worker_services: Array<{ service_id: string }>; [key: string]: any };
    // Check if worker can provide this service
    const workerServiceIds = (workerData.worker_services || []).map(
      (ws) => ws.service_id
    );
    if (!workerServiceIds.includes(body.serviceId)) {
      return NextResponse.json(
        { error: 'Worker cannot provide this service' },
        { status: 400 }
      );
    }

    // Validate service duration
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    if (Math.abs(durationMinutes - serviceData.duration) > 5) {
      return NextResponse.json(
        {
          error: `Service duration mismatch. Expected ${serviceData.duration} minutes, got ${Math.round(durationMinutes)} minutes`,
        },
        { status: 400 }
      );
    }

    // Check if service is a group service
    const { isGroupService, findExistingGroupAppointment, addParticipantToAppointment } = await import('@/lib/appointments/group-utils');
    const serviceIsGroup = await isGroupService(body.serviceId);
    
    let existingGroupAppointment = null;
    if (serviceIsGroup) {
      // Try to find existing group appointment at same time/worker
      existingGroupAppointment = await findExistingGroupAppointment(
        body.serviceId,
        body.workerId,
        start.toISOString(),
        end.toISOString()
      );
    }
    
    // Check for conflicts (only for non-group services or if no existing group appointment found)
    if (!serviceIsGroup || !existingGroupAppointment) {
      const { checkAppointmentConflict } = await import('@/lib/appointments/utils');
      const conflictCheck = await checkAppointmentConflict(
        supabase,
        tenantInfo.businessId,
        body.workerId,
        start,
        end,
        undefined, // excludeAppointmentId
        body.serviceId // serviceId for group service check
      );

      if (conflictCheck.hasConflict) {
        return NextResponse.json(
          {
            error: 'Time slot is already booked',
            conflict: {
              appointmentId: conflictCheck.conflictingAppointment?.id,
              start: conflictCheck.conflictingAppointment?.start,
              end: conflictCheck.conflictingAppointment?.end,
            },
          },
          { status: 409 }
        );
      }
    }

    // Get working hours from settings (optional validation)
    const settingsResult = await supabase
      .from('settings')
      .select('calendar')
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: any; error: any };
    const settings = settingsResult.data;

    const settingsData = settings as { calendar?: { workingHours?: { start?: string; end?: string } } } | null;
    // Only validate working hours if they are properly configured
    if (settingsData?.calendar?.workingHours) {
      const workingHours = settingsData.calendar.workingHours;
      // Only validate if both start and end are provided
      if (workingHours.start && workingHours.end) {
        const { isWithinWorkingHours } = await import('@/lib/appointments/utils');
        if (
          !isWithinWorkingHours(start, end, workingHours)
        ) {
          return NextResponse.json(
            { error: 'Appointment time is outside working hours' },
            { status: 400 }
          );
        }
      }
    }

    // Validate and normalize status
    const validStatuses = ['confirmed', 'pending', 'cancelled'] as const;
    const status = validStatuses.includes(body.status as any) 
      ? (body.status as 'confirmed' | 'pending' | 'cancelled')
      : 'pending';

    let newAppointment: AppointmentRow;
    
    // If group service and existing appointment found, join it
    if (serviceIsGroup && existingGroupAppointment) {
      // Add customer as participant to existing appointment
      const addResult = await addParticipantToAppointment(
        existingGroupAppointment.id,
        body.customerId,
        'confirmed'
      );
      
      if (!addResult.success) {
        return NextResponse.json(
          { error: addResult.error || 'Failed to join group appointment' },
          { status: 400 }
        );
      }
      
      // Get updated appointment
      const updatedResult = await supabase
        .from('appointments')
        .select('*')
        .eq('id', existingGroupAppointment.id)
        .single() as { data: AppointmentRow | null; error: any };
      
      if (updatedResult.error || !updatedResult.data) {
        return NextResponse.json(
          { error: 'Failed to retrieve updated appointment' },
          { status: 500 }
        );
      }
      
      newAppointment = updatedResult.data;
    } else {
      // Create new appointment
      const appointmentData: any = {
        business_id: tenantInfo.businessId,
        customer_id: body.customerId,
        service_id: body.serviceId,
        worker_id: body.workerId,
        start: start.toISOString(),
        end: end.toISOString(),
        status,
        is_group_appointment: serviceIsGroup,
        current_participants: 1,
      };

      // Insert the appointment
      const createResult = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single() as { data: AppointmentRow | null; error: any };
      const { data: createdAppointment, error: createError } = createResult;

      if (createError || !createdAppointment) {
        return NextResponse.json(
          { 
            error: createError?.message || 'Failed to create appointment',
            details: process.env.NODE_ENV === 'development' ? {
              code: createError?.code,
              details: createError?.details,
              hint: createError?.hint,
            } : undefined
          },
          { status: 500 }
        );
      }
      
      newAppointment = createdAppointment;
      
      // If group service, add customer as first participant
      if (serviceIsGroup) {
        const addResult = await addParticipantToAppointment(
          newAppointment.id,
          body.customerId,
          'confirmed'
        );
        
        if (!addResult.success) {
          // Rollback: delete the appointment if participant creation fails
          await supabase.from('appointments').delete().eq('id', newAppointment.id);
          return NextResponse.json(
            { error: addResult.error || 'Failed to add participant to group appointment' },
            { status: 500 }
          );
        }
      }
    }

    // Fetch related data for the response
    const appointmentRecord = newAppointment as { id: string };
    const fetchResult = await supabase
      .from('appointments')
      .select(`
        *,
        services (name, max_capacity),
        customers (name),
        workers (name)
      `)
      .eq('id', appointmentRecord.id)
      .single() as { data: any; error: any };
    const { data: appointmentWithRelations, error: fetchError } = fetchResult;

    if (fetchError || !appointmentWithRelations) {
      // Still return the appointment even if relations fetch fails
    }

    // Map to Appointment interface
    let mappedAppointment;
    try {
      const appointmentToMap = appointmentWithRelations || newAppointment;
      mappedAppointment = mapAppointmentToInterface(appointmentToMap);
    } catch (mappingError: any) {
      return NextResponse.json(
        { 
          error: 'Failed to process appointment data',
          details: process.env.NODE_ENV === 'development' ? mappingError.message : undefined
        },
        { status: 500 }
      );
    }

    // Create activity log entry for customer-created appointments
    if (createdBy === 'customer') {
      try {
        const appointmentForLog = appointmentWithRelations || newAppointment;
        await (supabase
          .from('activity_logs') as any)
          .insert({
            business_id: tenantInfo.businessId,
            appointment_id: (newAppointment as any).id,
            customer_id: body.customerId,
            activity_type: 'appointment_created',
            created_by: 'customer',
            metadata: {
              serviceName: appointmentForLog.services?.name || 'Unknown Service',
              workerName: appointmentForLog.workers?.name || 'Unknown Worker',
              start: start.toISOString(),
              end: end.toISOString(),
            },
            status: 'completed',
          } as any);
      } catch (logError) {
        // Don't fail the request if logging fails
      }
    }

    // Schedule reminders for the new appointment
    if (newAppointment && status === 'confirmed') {
      try {
        const { scheduleReminders } = await import('@/lib/reminders/queue');
        await scheduleReminders(
          newAppointment.id,
          new Date(newAppointment.start),
          tenantInfo.businessId,
          body.customerId
        );
      } catch (error) {
        // Log error but don't fail appointment creation
        console.error('Failed to schedule reminders:', error);
      }

      // Sync to Google Calendar if enabled
      try {
        const { syncAppointmentToGoogle } = await import('@/lib/calendar/google-sync');
        await syncAppointmentToGoogle(newAppointment.id, tenantInfo.businessId);
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
        // Don't fail appointment creation if sync fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        appointment: mappedAppointment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create appointment',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

