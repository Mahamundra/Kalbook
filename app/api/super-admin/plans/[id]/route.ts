import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type PlanRow = Database['public']['Tables']['plans']['Row'];

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/super-admin/plans/[id]
 * Update plan metadata (name, priceNote, cta, note, highlights)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const planId = params.id;
    const body = await request.json();
    const { name, priceNote, cta, note, highlights, highlights_en, highlights_he, highlights_ar, highlights_ru } = body;

    const supabase = createAdminClient();

    // Get current plan to preserve existing features
    const currentPlanResult = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single() as { data: PlanRow | null; error: any };

    if (currentPlanResult.error || !currentPlanResult.data) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    const currentPlan = currentPlanResult.data;
    const currentFeatures = currentPlan.features || {};

    // Build update object
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }

    // Store metadata in features JSONB
    const updatedFeatures = { ...currentFeatures };
    
    if (priceNote !== undefined) {
      updatedFeatures.priceNote = priceNote;
    }
    if (cta !== undefined) {
      updatedFeatures.cta = cta;
    }
    if (note !== undefined) {
      updatedFeatures.note = note;
    }
    // Support both old format (highlights) and new format (highlights_en, highlights_he, etc.)
    if (highlights !== undefined && Array.isArray(highlights)) {
      updatedFeatures.highlights = highlights; // Keep for backward compatibility
    }
    if (highlights_en !== undefined && Array.isArray(highlights_en)) {
      updatedFeatures.highlights_en = highlights_en;
    }
    if (highlights_he !== undefined && Array.isArray(highlights_he)) {
      updatedFeatures.highlights_he = highlights_he;
    }
    if (highlights_ar !== undefined && Array.isArray(highlights_ar)) {
      updatedFeatures.highlights_ar = highlights_ar;
    }
    if (highlights_ru !== undefined && Array.isArray(highlights_ru)) {
      updatedFeatures.highlights_ru = highlights_ru;
    }

    updateData.features = updatedFeatures;

    // Update plan
    const updateResult = await (supabase
      .from('plans') as any)
      .update(updateData)
      .eq('id', planId)
      .select()
      .single() as { data: PlanRow | null; error: any };

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message || 'Failed to update plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: updateResult.data,
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update plan' },
      { status: 500 }
    );
  }
}

