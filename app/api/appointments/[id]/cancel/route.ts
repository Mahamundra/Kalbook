import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapAppointmentToInterface } from '@/lib/appointments/utils';

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
    const { data: existingAppointment, error: checkError } = await supabase
      .from('appointments')
      .select('id, business_id, status')
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single();

    if (checkError || !existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (existingAppointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Appointment is already cancelled' },
        { status: 400 }
      );
    }

    // Update appointment status to cancelled
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
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
        { error: updateError?.message || 'Failed to cancel appointment' },
        { status: 500 }
      );
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

