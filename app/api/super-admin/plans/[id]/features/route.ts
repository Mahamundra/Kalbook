import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type PlanFeatureRow = Database['public']['Tables']['plan_features']['Row'];

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/super-admin/plans/[id]/features
 * Update plan features
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const planId = params.id;
    const body = await request.json();
    const { features } = body; // Array of { feature_name: string, enabled: boolean }

    if (!Array.isArray(features)) {
      return NextResponse.json(
        { error: 'features must be an array' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Update each feature
    const updates = await Promise.all(
      features.map(async (feature: { feature_name: string; enabled: boolean }) => {
        // Check if feature exists
        const existingResult = await supabase
          .from('plan_features')
          .select('id')
          .eq('plan_id', planId)
          .eq('feature_name', feature.feature_name)
          .maybeSingle() as { data: { id: string } | null; error: any };

        if (existingResult.data) {
          // Update existing
          return (supabase
            .from('plan_features') as any)
            .update({ enabled: feature.enabled })
            .eq('id', existingResult.data.id);
        } else {
          // Insert new
          return supabase
            .from('plan_features')
            .insert({
              plan_id: planId,
              feature_name: feature.feature_name,
              enabled: feature.enabled,
            } as any);
        }
      })
    );

    // Check for errors
    const errors = updates.filter((u: any) => u.error);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Failed to update some features', details: errors },
        { status: 500 }
      );
    }

    // Get updated features
    const featuresResult = await supabase
      .from('plan_features')
      .select('*')
      .eq('plan_id', planId) as { data: PlanFeatureRow[] | null; error: any };

    return NextResponse.json({
      success: true,
      features: featuresResult.data || [],
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    console.error('Error updating plan features:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update plan features' },
      { status: 500 }
    );
  }
}

