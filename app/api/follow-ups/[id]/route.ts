import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type FollowUpRow = Database['public']['Tables']['follow_ups']['Row'];

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
 * PATCH /api/follow-ups/[id]
 * Update a follow-up (gym_trainer only)
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

    // Verify follow-up exists and belongs to business
    const { data: existingFollowUp, error: checkError } = await supabase
      .from('follow_ups')
      .select('id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };

    if (checkError || !existingFollowUp) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (body.scheduled_for !== undefined) {
      updateData.scheduled_for = new Date(body.scheduled_for).toISOString();
    }
    if (body.type !== undefined) {
      updateData.type = body.type;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    const result = await (supabase
      .from('follow_ups') as any)
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    const { data: updatedFollowUp, error } = result as { data: FollowUpRow | null; error: any };

    if (error || !updatedFollowUp) {
      return NextResponse.json(
        { error: error?.message || 'Failed to update follow-up' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      followUp: updatedFollowUp,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update follow-up' },
      { status: 500 }
    );
  }
}

