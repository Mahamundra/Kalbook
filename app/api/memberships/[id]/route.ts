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
 * GET /api/memberships/[id]
 * Get a specific membership (gym_trainer only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const { data: membership, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: MembershipRow | null; error: any };

    if (error || !membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      membership,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch membership' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/memberships/[id]
 * Update a membership (gym_trainer only)
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

    // Verify membership exists and belongs to business
    const { data: existingMembership, error: checkError } = await supabase
      .from('memberships')
      .select('id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };

    if (checkError || !existingMembership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.remaining_sessions !== undefined) {
      updateData.remaining_sessions = body.remaining_sessions;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.expires_at !== undefined) {
      updateData.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;
    }

    const { data: updatedMembership, error } = await supabase
      .from('memberships')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single() as { data: MembershipRow | null; error: any };

    if (error || !updatedMembership) {
      return NextResponse.json(
        { error: error?.message || 'Failed to update membership' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      membership: updatedMembership,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update membership' },
      { status: 500 }
    );
  }
}

