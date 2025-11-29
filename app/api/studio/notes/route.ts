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
 * GET /api/studio/notes
 * Get all internal notes (gym_trainer only)
 * Query params: note_type, tags (comma-separated)
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const noteType = searchParams.get('note_type');
    const tagsParam = searchParams.get('tags');

    let query = supabase
      .from('internal_notes')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .order('created_at', { ascending: false });

    if (noteType) {
      query = query.eq('note_type', noteType);
    }

    if (tagsParam) {
      const tags = tagsParam.split(',').map(t => t.trim());
      query = query.contains('tags', tags);
    }

    const { data: notes, error } = await query as { data: InternalNoteRow[] | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: notes || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/studio/notes
 * Create a new internal note (gym_trainer only)
 */
export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'Note title is required' },
        { status: 400 }
      );
    }

    if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current user for created_by_user_id
    const { createClient } = await import('@/lib/supabase/server');
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const createdByUserId = user?.id || null;

    const noteData: any = {
      business_id: tenantInfo.businessId,
      created_by_user_id: createdByUserId,
      note_type: body.note_type || 'note',
      title: body.title.trim(),
      content: body.content.trim(),
      tags: body.tags || [],
    };

    // Add meeting-specific fields if note_type is 'meeting'
    if (body.note_type === 'meeting') {
      noteData.meeting_date = body.meeting_date ? new Date(body.meeting_date).toISOString() : null;
      noteData.participants = body.participants || [];
      noteData.agenda = body.agenda || [];
      noteData.decisions = body.decisions || [];
      noteData.action_items = body.action_items || [];
    }

    const { data: newNote, error } = await supabase
      .from('internal_notes')
      .insert(noteData)
      .select()
      .single() as { data: InternalNoteRow | null; error: any };

    if (error || !newNote) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note: newNote,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

