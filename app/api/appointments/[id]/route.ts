import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapAppointmentToInterface, checkAppointmentConflict } from '@/lib/appointments/utils';

/**
 * GET /api/appointments/[id]
 * Get a single appointment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get appointment with related data
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services (*),
        customers (*),
        workers (*)
      `)
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to fetch appointment' },
        { status: 500 }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Map to Appointment interface
    const mappedAppointment = mapAppointmentToInterface(appointment);

    return NextResponse.json({
      success: true,
      appointment: mappedAppointment,
    });
  } catch (error: any) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/appointments/[id]
 * Update an appointment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const body = await request.json();

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
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (fetchError || !existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    let start = new Date(existingAppointment.start);
    let end = new Date(existingAppointment.end);
    let workerId = existingAppointment.worker_id;
    let serviceId = existingAppointment.service_id;

    if (body.start !== undefined) {
      start = new Date(body.start);
      updateData.start = start.toISOString();
    }

    if (body.end !== undefined) {
      end = new Date(body.end);
      updateData.end = end.toISOString();
    }

    if (body.workerId !== undefined) {
      workerId = body.workerId;
      updateData.worker_id = workerId;
    }

    if (body.serviceId !== undefined) {
      serviceId = body.serviceId;
      updateData.service_id = serviceId;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Validate dates if changed
    if (body.start !== undefined || body.end !== undefined) {
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

      // Check for conflicts if time or worker changed
      if (body.start !== undefined || body.end !== undefined || body.workerId !== undefined) {
        const conflictCheck = await checkAppointmentConflict(
          supabase,
          tenantInfo.businessId,
          workerId,
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
      }

      // Validate service duration if service or time changed
      if (body.serviceId !== undefined || body.start !== undefined || body.end !== undefined) {
        const { data: service } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .eq('business_id', tenantInfo.businessId)
          .single();

        if (service) {
          const durationMs = end.getTime() - start.getTime();
          const durationMinutes = durationMs / (1000 * 60);
          if (Math.abs(durationMinutes - service.duration) > 5) {
            return NextResponse.json(
              {
                error: `Service duration mismatch. Expected ${service.duration} minutes`,
              },
              { status: 400 }
            );
          }
        }
      }

      // Validate worker can provide service if changed
      if (body.workerId !== undefined || body.serviceId !== undefined) {
        const { data: worker } = await supabase
          .from('workers')
          .select('*, worker_services!inner(service_id)')
          .eq('id', workerId)
          .eq('business_id', tenantInfo.businessId)
          .single();

        if (worker) {
          const workerServiceIds = (worker.worker_services as any[]).map(
            (ws: any) => ws.service_id
          );
          if (!workerServiceIds.includes(serviceId)) {
            return NextResponse.json(
              { error: 'Worker cannot provide this service' },
              { status: 400 }
            );
          }
        }
      }
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      const { data: appointment } = await supabase
        .from('appointments')
        .select(`
          *,
          services (*),
          customers (*),
          workers (*)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointment) {
        return NextResponse.json({
          success: true,
          appointment: mapAppointmentToInterface(appointment),
        });
      }
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .select(`
        *,
        services (*),
        customers (*),
        workers (*)
      `)
      .single();

    if (updateError || !updatedAppointment) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update appointment' },
        { status: 500 }
      );
    }

    // Map to Appointment interface
    const mappedAppointment = mapAppointmentToInterface(updatedAppointment);

    return NextResponse.json({
      success: true,
      appointment: mappedAppointment,
    });
  } catch (error: any) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/appointments/[id]
 * Delete an appointment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify appointment exists and belongs to business
    const { data: existingAppointment, error: checkError } = await supabase
      .from('appointments')
      .select('id, business_id, status, start')
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (checkError || !existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of appointments that have already started
    const appointmentStart = new Date(existingAppointment.start);
    if (appointmentStart < new Date()) {
      return NextResponse.json(
        {
          error: 'Cannot delete appointments that have already started',
          message: 'Please cancel the appointment instead.',
        },
        { status: 400 }
      );
    }

    // Delete appointment
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete appointment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    );
  }
}

