import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type MembershipRow = Database['public']['Tables']['memberships']['Row'];

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
 * POST /api/memberships/[id]/use-session
 * Deduct a session from membership when appointment is completed (gym_trainer only)
 */
export async function POST(
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

    // Get membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: MembershipRow | null; error: any };

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Check if membership is active and has remaining sessions
    if (membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Membership is not active' },
        { status: 400 }
      );
    }

    if (membership.remaining_sessions <= 0) {
      return NextResponse.json(
        { error: 'No remaining sessions in this membership' },
        { status: 400 }
      );
    }

    // Deduct session
    const newRemainingSessions = membership.remaining_sessions - 1;
    let newStatus = membership.status;

    // Update status if no sessions remaining
    if (newRemainingSessions === 0) {
      newStatus = 'completed';
    }

    // Update membership
    const { data: updatedMembership, error: updateError } = await supabase
      .from('memberships')
      .update({
        remaining_sessions: newRemainingSessions,
        status: newStatus,
      })
      .eq('id', params.id)
      .select()
      .single() as { data: MembershipRow | null; error: any };

    if (updateError || !updatedMembership) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update membership' },
        { status: 500 }
      );
    }

    // Log session usage
    const { error: logError } = await supabase
      .from('session_usage_log')
      .insert({
        membership_id: params.id,
        appointment_id: body.appointment_id || null,
        used_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to log session usage:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      membership: updatedMembership,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to use session' },
      { status: 500 }
    );
  }
}

