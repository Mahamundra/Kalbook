import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

/**
 * POST /api/appointments/[id]/reschedule-request
 * Create a reschedule request for an appointment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const body = await request.json();
    const { requestedStart, requestedEnd } = body;

    if (!requestedStart || !requestedEnd) {
      return NextResponse.json(
        { error: 'requestedStart and requestedEnd are required' },
        { status: 400 }
      );
    }

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get existing appointment
    const existingResult = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: AppointmentRow | null; error: any };

    if (existingResult.error || !existingResult.data) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const existingAppointment = existingResult.data;

    // Check if trying to reschedule to the same date and time
    const currentStart = new Date(existingAppointment.start as string);
    const requestedStartDate = new Date(requestedStart);
    
    if (currentStart.getTime() === requestedStartDate.getTime()) {
      return NextResponse.json(
        { error: 'Cannot reschedule to the same date and time' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(requestedStart);
    const end = new Date(requestedEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check for conflicts
    const { checkAppointmentConflict } = await import('@/lib/appointments/utils');
    const conflictCheck = await checkAppointmentConflict(
      supabase,
      tenantInfo.businessId,
      existingAppointment.worker_id,
      start,
      end,
      appointmentId // Exclude current appointment
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

    // Get full appointment details with relations
    const fullAppointmentResult = await supabase
      .from('appointments')
      .select(`
        *,
        services (name),
        customers (name, id),
        workers (name)
      `)
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: any; error: any };

    if (fullAppointmentResult.error || !fullAppointmentResult.data) {
      return NextResponse.json(
        { error: 'Failed to fetch appointment details' },
        { status: 500 }
      );
    }

    const fullAppointment = fullAppointmentResult.data;

    // Store reschedule request in appointment metadata or create a separate table entry
    // For now, we'll use a status field and store the requested times in notes or metadata
    // Update appointment with pending reschedule status
    const updateResult = await supabase
      .from('appointments')
      .update({
        status: 'pending_reschedule',
        // Store requested times in notes field (we can create a separate table later if needed)
        notes: JSON.stringify({
          originalStart: existingAppointment.start,
          originalEnd: existingAppointment.end,
          requestedStart: requestedStart,
          requestedEnd: requestedEnd,
          rescheduleRequestedAt: new Date().toISOString(),
        }),
      })
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .select()
      .single() as { data: any; error: any };

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message || 'Failed to create reschedule request' },
        { status: 500 }
      );
    }

    // Create activity log entry for reschedule request
    try {
      const logResult = await supabase
        .from('activity_logs')
        .insert({
          business_id: tenantInfo.businessId,
          appointment_id: appointmentId,
          customer_id: fullAppointment.customer_id || fullAppointment.customers?.id,
          activity_type: 'reschedule_requested',
          created_by: 'customer', // Reschedule requests are always from customers
          metadata: {
            originalStart: existingAppointment.start,
            originalEnd: existingAppointment.end,
            requestedStart: requestedStart,
            requestedEnd: requestedEnd,
            serviceName: fullAppointment.services?.name || 'Unknown Service',
            workerName: fullAppointment.workers?.name || 'Unknown Worker',
          },
          status: 'pending',
        })
        .select()
        .single() as { data: any; error: any };

      if (logResult.error) {
        console.error('Error creating activity log for reschedule request:', logResult.error);
        // Don't fail the request if logging fails
      }
    } catch (logError) {
      console.error('Error creating activity log for reschedule request:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Reschedule request created successfully',
      appointment: updateResult.data,
    });
  } catch (error: any) {
    console.error('Error creating reschedule request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create reschedule request' },
      { status: 500 }
    );
  }
}

