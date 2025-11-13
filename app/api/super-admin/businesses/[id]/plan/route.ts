import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];
type PlanRow = Database['public']['Tables']['plans']['Row'];

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/super-admin/businesses/[id]/plan
 * Change a business's plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const businessId = params.id;
    const body = await request.json();
    const { planId, subscriptionStatus } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify plan exists
    const planResult = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single() as { data: PlanRow | null; error: any };

    if (planResult.error || !planResult.data) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Update business plan
    const updateData: any = {
      plan_id: planId,
    };

    // If setting to active, clear trial dates
    if (subscriptionStatus === 'active') {
      updateData.trial_started_at = null;
      updateData.trial_ends_at = null;
      updateData.subscription_status = 'active';
    } else if (subscriptionStatus) {
      updateData.subscription_status = subscriptionStatus;
    }

    const updateResult = await (supabase
      .from('businesses') as any)
      .update(updateData)
      .eq('id', businessId)
      .select(`
        *,
        plans (*)
      `)
      .single() as { data: (BusinessRow & { plans: PlanRow | null }) | null; error: any };

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message || 'Failed to update business plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      business: updateResult.data,
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    console.error('Error updating business plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update business plan' },
      { status: 500 }
    );
  }
}

