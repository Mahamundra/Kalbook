import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { getAppointmentParticipants, addParticipantToAppointment, removeParticipantFromAppointment } from '@/lib/appointments/group-utils';
import type { Database } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/appointments/[id]/participants
 * Get all participants for an appointment
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

    // Verify appointment exists and belongs to business
    const appointmentResult = await supabase
      .from('appointments')
      .select('id, business_id')
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: AppointmentRow | null; error: any };

    if (appointmentResult.error || !appointmentResult.data) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Get participants
    const participants = await getAppointmentParticipants(appointmentId);

    return NextResponse.json({
      success: true,
      participants,
    });
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments/[id]/participants
 * Add a participant to an appointment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
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

    // Verify appointment exists and belongs to business
    const appointmentResult = await supabase
      .from('appointments')
      .select('id, business_id, is_group_appointment')
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: AppointmentRow | null; error: any };

    if (appointmentResult.error || !appointmentResult.data) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (!appointmentResult.data.is_group_appointment) {
      return NextResponse.json(
        { error: 'This is not a group appointment' },
        { status: 400 }
      );
    }

    // Verify customer exists and belongs to business
    const customerResult = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };

    if (customerResult.error || !customerResult.data) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Add participant
    const result = await addParticipantToAppointment(
      appointmentId,
      customerId,
      body.status || 'confirmed'
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add participant' },
        { status: 400 }
      );
    }

    // Get updated participants list
    const participants = await getAppointmentParticipants(appointmentId);

    return NextResponse.json({
      success: true,
      participantId: result.participantId,
      participants,
    });
  } catch (error: any) {
    console.error('Error adding participant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add participant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/appointments/[id]/participants
 * Remove a participant from an appointment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId query parameter is required' },
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

    // Verify appointment exists and belongs to business
    const appointmentResult = await supabase
      .from('appointments')
      .select('id, business_id')
      .eq('id', appointmentId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: AppointmentRow | null; error: any };

    if (appointmentResult.error || !appointmentResult.data) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Remove participant
    const result = await removeParticipantFromAppointment(
      appointmentId,
      customerId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove participant' },
        { status: 400 }
      );
    }

    // Get updated participants list
    const participants = await getAppointmentParticipants(appointmentId);

    return NextResponse.json({
      success: true,
      participants,
    });
  } catch (error: any) {
    console.error('Error removing participant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove participant' },
      { status: 500 }
    );
  }
}


