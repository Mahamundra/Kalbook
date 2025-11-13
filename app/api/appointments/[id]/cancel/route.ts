import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapAppointmentToInterface } from '@/lib/appointments/utils';
import type { Database } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

/**
 * POST /api/appointments/[id]/cancel
 * Cancel an appointment
 */
export async function POST(
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

    // Verify appointment exists and belongs to business
    const appointmentResult = await supabase
      .from('appointments')
      .select('id, business_id, status')
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: AppointmentRow | null; error: any };

    if (appointmentResult.error || !appointmentResult.data) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const existingAppointment = appointmentResult.data;

    // Check if already cancelled
    if (existingAppointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Appointment is already cancelled' },
        { status: 400 }
      );
    }

    // Get full appointment details before cancelling
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

    // Update appointment status to cancelled
    const updateResult = await (supabase
      .from('appointments') as any)
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .select(`
        *,
        services (*),
        customers (*),
        workers (*)
      `)
      .single() as { data: any; error: any };
    const { data: updatedAppointment, error: updateError } = updateResult;

    if (updateError || !updatedAppointment) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to cancel appointment' },
        { status: 500 }
      );
    }

    // Determine if cancellation is from customer or admin
    // Check referer header or request body for source
    const referer = request.headers.get('referer') || '';
    const isCustomerRequest = referer.includes('/booking') || referer.includes('/b/');
    const createdBy = body.createdBy || (isCustomerRequest ? 'customer' : 'admin');

    // Create activity log entry for cancellation
    try {
      await supabase
        .from('activity_logs')
        .insert({
          business_id: tenantInfo.businessId,
          appointment_id: appointmentId,
          customer_id: fullAppointment.customer_id || fullAppointment.customers?.id,
          activity_type: 'appointment_cancelled',
          created_by: createdBy,
          metadata: {
            originalStart: fullAppointment.start,
            originalEnd: fullAppointment.end,
            serviceName: fullAppointment.services?.name || 'Unknown Service',
            workerName: fullAppointment.workers?.name || 'Unknown Worker',
          },
          status: 'completed',
        });
    } catch (logError) {
      console.error('Error creating activity log for cancellation:', logError);
      // Don't fail the request if logging fails
    }

    // Map to Appointment interface
    const mappedAppointment = mapAppointmentToInterface(updatedAppointment);

    return NextResponse.json({
      success: true,
      appointment: mappedAppointment,
      message: 'Appointment cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}

