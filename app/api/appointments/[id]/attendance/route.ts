import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

/**
 * Helper function to check if business is gym_trainer
 */
async function checkGymTrainerBusiness(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('business_type')
    .eq('id', businessId)
    .single() as { data: { business_type: string } | null; error: any };
  
  return business?.business_type === 'gym_trainer';
}

/**
 * PATCH /api/appointments/[id]/attendance
 * Mark attendance for an appointment (gym_trainer only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const tenantInfo = await getTenantInfoFromRequest(request);
    
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business is gym_trainer
    const isGymTrainer = await checkGymTrainerBusiness(tenantInfo.businessId);
    if (!isGymTrainer) {
      return NextResponse.json(
        { error: 'This feature is only available for gym_trainer businesses' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Verify appointment exists and belongs to business
    const { data: existingAppointment, error: checkError } = await supabase
      .from('appointments')
      .select('id, business_id, customer_id, status')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string; business_id: string; customer_id: string; status: string } | null; error: any };

    if (checkError || !existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    
    if (body.attended !== undefined) {
      updateData.attended = body.attended;
      if (body.attended) {
        updateData.attended_at = new Date().toISOString();
        updateData.no_show = false;
      } else {
        updateData.attended_at = null;
      }
    }

    if (body.no_show !== undefined) {
      updateData.no_show = body.no_show;
      if (body.no_show) {
        updateData.attended = false;
        updateData.attended_at = null;
      }
    }

    if (body.attendance_notes !== undefined) {
      updateData.attendance_notes = body.attendance_notes;
    }

    const { data: updatedAppointment, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single() as { data: AppointmentRow | null; error: any };

    if (error || !updatedAppointment) {
      return NextResponse.json(
        { error: error?.message || 'Failed to update attendance' },
        { status: 500 }
      );
    }

    // If attendance is marked and there's an active membership, use a session
    if (body.attended === true) {
      try {
        // Find active membership for this customer
        const { data: activeMembership } = await supabase
          .from('memberships')
          .select('id, remaining_sessions')
          .eq('business_id', tenantInfo.businessId)
          .eq('customer_id', existingAppointment.customer_id)
          .eq('status', 'active')
          .gt('remaining_sessions', 0)
          .order('created_at', { ascending: false })
          .limit(1)
          .single() as { data: { id: string; remaining_sessions: number } | null; error: any };

        if (activeMembership) {
          // Use a session from the membership
          await fetch(`${request.nextUrl.origin}/api/memberships/${activeMembership.id}/use-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('Cookie') || '',
            },
            body: JSON.stringify({
              appointment_id: params.id,
            }),
          });
        }
      } catch (membershipError) {
        console.error('Failed to use membership session:', membershipError);
        // Don't fail the request if membership update fails
      }
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    );
  }
}

