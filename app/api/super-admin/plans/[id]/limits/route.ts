import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type PlanRow = Database['public']['Tables']['plans']['Row'];

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/super-admin/plans/[id]/limits
 * Update plan limits (max_staff, max_services, max_bookings_per_month)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const planId = params.id;
    const body = await request.json();
    const { max_staff, max_services, max_bookings_per_month } = body;

    // Validate inputs
    if (max_staff !== undefined && (isNaN(Number(max_staff)) || Number(max_staff) < -1)) {
      return NextResponse.json(
        { error: 'max_staff must be a number >= -1 (-1 means unlimited)' },
        { status: 400 }
      );
    }

    if (max_services !== undefined && (isNaN(Number(max_services)) || Number(max_services) < -1)) {
      return NextResponse.json(
        { error: 'max_services must be a number >= -1 (-1 means unlimited)' },
        { status: 400 }
      );
    }

    if (max_bookings_per_month !== undefined && (isNaN(Number(max_bookings_per_month)) || Number(max_bookings_per_month) < -1)) {
      return NextResponse.json(
        { error: 'max_bookings_per_month must be a number >= -1 (-1 means unlimited)' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current plan to update features JSONB
    const planResult = await supabase
      .from('plans')
      .select('features')
      .eq('id', planId)
      .single() as { data: PlanRow | null; error: any };

    if (planResult.error || !planResult.data) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    const currentFeatures = planResult.data.features || {};
    const updatedFeatures = { ...currentFeatures };

    // Update limits in features JSONB
    if (max_staff !== undefined) {
      updatedFeatures.max_staff = Number(max_staff);
    }
    if (max_services !== undefined) {
      updatedFeatures.max_services = Number(max_services);
    }
    if (max_bookings_per_month !== undefined) {
      updatedFeatures.max_bookings_per_month = Number(max_bookings_per_month);
    }

    // Update plan with new features
    const updateResult = await supabase
      .from('plans')
      .update({ features: updatedFeatures })
      .eq('id', planId)
      .select()
      .single() as { data: PlanRow | null; error: any };

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message || 'Failed to update plan limits' },
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
    console.error('Error updating plan limits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update plan limits' },
      { status: 500 }
    );
  }
}

