import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/activity-logs/[id]/reject-reschedule
 * Reject a reschedule request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityLogId = params.id;
    const body = await request.json();
    const rejectionMessage = body.message || "We're sorry but we could not change the date. If you can't arrive, please cancel.";

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
      .select(`
        *,
        customers (name, email),
        appointments (
          id,
          start,
          end,
          status,
          services (name),
          workers (name)
        )
      `)
      .eq('id', activityLogId)
      .eq('business_id', tenantInfo.businessId)
      .eq('activity_type', 'reschedule_requested')
      .eq('status', 'pending')
      .single() as { data: any; error: any };

    if (logResult.error || !logResult.data) {
      return NextResponse.json(
        { error: 'Reschedule request not found or already processed' },
        { status: 404 }
      );
    }

    const activityLog = logResult.data;
    const metadata = activityLog.metadata as any;

    // Update activity log status
    await (supabase
      .from('activity_logs') as any)
      .update({ status: 'rejected' })
      .eq('id', activityLogId);

    // Restore appointment status to confirmed if it was pending
    if (activityLog.appointment_id) {
      const appointmentResult = await supabase
        .from('appointments')
        .select('status')
        .eq('id', activityLog.appointment_id)
        .single() as { data: AppointmentRow | null; error: any };

      if (appointmentResult.data && appointmentResult.data.status === 'pending') {
        await (supabase
          .from('appointments') as any)
          .update({ status: 'confirmed' })
          .eq('id', activityLog.appointment_id);
      }
    }

    // Create new activity log entry for rejected reschedule
    await (supabase
      .from('activity_logs') as any)
      .insert({
        business_id: tenantInfo.businessId,
        appointment_id: activityLog.appointment_id,
        customer_id: activityLog.customer_id,
        activity_type: 'reschedule_rejected',
        created_by: 'admin',
        metadata: {
          originalStart: metadata.originalStart,
          originalEnd: metadata.originalEnd,
          requestedStart: metadata.requestedStart,
          requestedEnd: metadata.requestedEnd,
          serviceName: activityLog.appointments?.services?.name || metadata.serviceName,
          workerName: activityLog.appointments?.workers?.name || metadata.workerName,
          rejectionMessage,
        },
        status: 'completed',
      } as any);

    // Send email notification to customer
    try {
      const { sendRescheduleRejectionEmail } = await import('@/lib/notifications/email');
      if (activityLog.customers?.email) {
        await sendRescheduleRejectionEmail(
          activityLog.customers.email,
          activityLog.customers.name || 'Customer',
          {
            serviceName: activityLog.appointments?.services?.name || 'Service',
            workerName: activityLog.appointments?.workers?.name || 'Worker',
            appointmentDate: new Date(metadata.originalStart),
          },
          rejectionMessage
        );
      }
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Reschedule request rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting reschedule request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject reschedule request' },
      { status: 500 }
    );
  }
}

