import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { checkAppointmentConflict } from '@/lib/appointments/utils';
import type { Database } from '@/lib/supabase/database.types';

type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/activity-logs/[id]/approve-reschedule
 * Approve a reschedule request and update the appointment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityLogId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the activity log entry
    const logResult = await supabase
      .from('activity_logs')
      .select('*')
      .eq('id', activityLogId)
      .eq('business_id', tenantInfo.businessId)
      .eq('activity_type', 'reschedule_requested')
      .eq('status', 'pending')
      .single() as { data: ActivityLogRow | null; error: any };

    if (logResult.error || !logResult.data) {
      return NextResponse.json(
        { error: 'Reschedule request not found or already processed' },
        { status: 404 }
      );
    }

    const activityLog = logResult.data;
    const metadata = activityLog.metadata as any;

    if (!metadata.requestedStart || !metadata.requestedEnd || !activityLog.appointment_id) {
      return NextResponse.json(
        { error: 'Invalid reschedule request data' },
        { status: 400 }
      );
    }

    const requestedStart = new Date(metadata.requestedStart);
    const requestedEnd = new Date(metadata.requestedEnd);

    // Validate dates
    if (isNaN(requestedStart.getTime()) || isNaN(requestedEnd.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format in reschedule request' },
        { status: 400 }
      );
    }

    // Get the appointment
    const appointmentResult = await supabase
      .from('appointments')
      .select('*')
      .eq('id', activityLog.appointment_id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: AppointmentRow | null; error: any };

    if (appointmentResult.error || !appointmentResult.data) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const appointment = appointmentResult.data;

    // Check for conflicts
    const conflictCheck = await checkAppointmentConflict(
      supabase,
      tenantInfo.businessId,
      appointment.worker_id,
      requestedStart,
      requestedEnd,
      appointment.id // Exclude current appointment
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

    // Update the appointment
    const updateResult = await supabase
      .from('appointments')
      .update({
        start: requestedStart.toISOString(),
        end: requestedEnd.toISOString(),
        status: 'confirmed',
        notes: null, // Clear the reschedule request notes
      })
      .eq('id', appointment.id)
      .eq('business_id', tenantInfo.businessId)
      .select(`
        *,
        services (name),
        customers (name, email),
        workers (name)
      `)
      .single() as { data: any; error: any };

    if (updateResult.error || !updateResult.data) {
      return NextResponse.json(
        { error: updateResult.error?.message || 'Failed to update appointment' },
        { status: 500 }
      );
    }

    const updatedAppointment = updateResult.data;

    // Update activity log status
    await supabase
      .from('activity_logs')
      .update({ status: 'approved' })
      .eq('id', activityLogId);

    // Create new activity log entry for approved reschedule
    await supabase
      .from('activity_logs')
      .insert({
        business_id: tenantInfo.businessId,
        appointment_id: appointment.id,
        customer_id: activityLog.customer_id,
        activity_type: 'reschedule_approved',
        created_by: 'admin',
        metadata: {
          originalStart: metadata.originalStart,
          originalEnd: metadata.originalEnd,
          requestedStart: metadata.requestedStart,
          requestedEnd: metadata.requestedEnd,
          serviceName: updatedAppointment.services?.name || metadata.serviceName,
          workerName: updatedAppointment.workers?.name || metadata.workerName,
        },
        status: 'completed',
      });

    // Send email notification to customer
    try {
      const { sendRescheduleApprovalEmail } = await import('@/lib/notifications/email');
      if (updatedAppointment.customers?.email) {
        await sendRescheduleApprovalEmail(
          updatedAppointment.customers.email,
          updatedAppointment.customers.name || 'Customer',
          {
            serviceName: updatedAppointment.services?.name || 'Service',
            workerName: updatedAppointment.workers?.name || 'Worker',
            oldDate: new Date(metadata.originalStart),
            newDate: requestedStart,
          }
        );
      }
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Reschedule request approved successfully',
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    console.error('Error approving reschedule request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve reschedule request' },
      { status: 500 }
    );
  }
}

