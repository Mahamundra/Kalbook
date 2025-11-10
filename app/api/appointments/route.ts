import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapAppointmentToInterface } from '@/lib/appointments/utils';
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
        services (*),
        customers (*),
        workers (*)
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
    console.error('Error fetching appointments:', error);
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
      console.error('Error getting tenant info:', error);
      return NextResponse.json(
        { error: 'Failed to get business context', details: error.message },
        { status: 500 }
      );
    }

    if (!tenantInfo?.businessId) {
      console.warn('No tenant info found. Headers:', {
        referer: request.headers.get('referer'),
        cookie: request.cookies.get('business-slug')?.value,
      });
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
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
      console.error('Customer lookup error:', customerResult.error);
      console.error('Customer ID:', body.customerId);
      console.error('Business ID:', tenantInfo.businessId);
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
      console.error('Service lookup error:', serviceResult.error);
      console.error('Service ID:', body.serviceId);
      console.error('Business ID:', tenantInfo.businessId);
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
      console.error('Worker lookup error:', workerResult.error);
      console.error('Worker ID:', body.workerId);
      console.error('Business ID:', tenantInfo.businessId);
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

    // Check for conflicts
    const { checkAppointmentConflict } = await import('@/lib/appointments/utils');
    const conflictCheck = await checkAppointmentConflict(
      supabase,
      tenantInfo.businessId,
      body.workerId,
      start,
      end
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

    // Create appointment
    const appointmentData = {
      business_id: tenantInfo.businessId,
      customer_id: body.customerId,
      service_id: body.serviceId,
      worker_id: body.workerId,
      start: start.toISOString(),
      end: end.toISOString(),
      status,
    };

    console.log('Creating appointment with data:', {
      ...appointmentData,
      customer_id: body.customerId,
      service_id: body.serviceId,
      worker_id: body.workerId,
    });

    // First, insert the appointment
    const createResult = await supabase
      .from('appointments')
      .insert(appointmentData as any)
      .select()
      .single() as { data: AppointmentRow | null; error: any };
    const { data: newAppointment, error: createError } = createResult;

    if (createError || !newAppointment) {
      console.error('Error creating appointment in database:', createError);
      console.error('Appointment data attempted:', appointmentData);
      console.error('Error code:', createError?.code);
      console.error('Error details:', createError?.details);
      console.error('Error hint:', createError?.hint);
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

    // Fetch related data for the response
    const appointmentRecord = newAppointment as { id: string };
    const fetchResult = await supabase
      .from('appointments')
      .select(`
        *,
        services (*),
        customers (*),
        workers (*)
      `)
      .eq('id', appointmentRecord.id)
      .single() as { data: any; error: any };
    const { data: appointmentWithRelations, error: fetchError } = fetchResult;

    if (fetchError || !appointmentWithRelations) {
      console.error('Error fetching appointment with relations:', fetchError);
      // Still return the appointment even if relations fetch fails
    }

    // Map to Appointment interface
    let mappedAppointment;
    try {
      const appointmentToMap = appointmentWithRelations || newAppointment;
      mappedAppointment = mapAppointmentToInterface(appointmentToMap);
    } catch (mappingError: any) {
      console.error('Error mapping appointment:', mappingError);
      console.error('Appointment data received:', JSON.stringify(newAppointment, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to process appointment data',
          details: process.env.NODE_ENV === 'development' ? mappingError.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        appointment: mappedAppointment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', requestBody);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create appointment',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

