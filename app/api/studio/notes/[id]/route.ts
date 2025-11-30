import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Database } from '@/lib/supabase/database.types';

type InternalNoteRow = Database['public']['Tables']['internal_notes']['Row'];

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
 * PATCH /api/studio/notes/[id]
 * Update an internal note (gym_trainer only)
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

    // Verify note exists and belongs to business
    const { data: existingNote, error: checkError } = await supabase
      .from('internal_notes')
      .select('id')
      .eq('id', params.id)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };

    if (checkError || !existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.content !== undefined) {
      updateData.content = body.content;
    }
    if (body.note_type !== undefined) {
      updateData.note_type = body.note_type;
    }
    if (body.tags !== undefined) {
      updateData.tags = body.tags;
    }
    if (body.meeting_date !== undefined) {
      updateData.meeting_date = body.meeting_date ? new Date(body.meeting_date).toISOString() : null;
    }
    if (body.participants !== undefined) {
      updateData.participants = body.participants;
    }
    if (body.agenda !== undefined) {
      updateData.agenda = body.agenda;
    }
    if (body.decisions !== undefined) {
      updateData.decisions = body.decisions;
    }
    if (body.action_items !== undefined) {
      updateData.action_items = body.action_items;
    }

    const result = await (supabase
      .from('internal_notes') as any)
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    const { data: updatedNote, error } = result as { data: InternalNoteRow | null; error: any };

    if (error || !updatedNote) {
      return NextResponse.json(
        { error: error?.message || 'Failed to update note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note: updatedNote,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

