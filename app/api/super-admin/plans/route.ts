import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type PlanRow = Database['public']['Tables']['plans']['Row'];
type PlanFeatureRow = Database['public']['Tables']['plan_features']['Row'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/plans
 * Get all plans with their features
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const supabase = createAdminClient();

    const plansResult = await supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('price', { ascending: true }) as { data: PlanRow[] | null; error: any };

    const { data: plans, error } = plansResult;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch plans' },
        { status: 500 }
      );
    }

    // Get features for each plan
    const plansWithFeatures = await Promise.all(
      (plans || []).map(async (plan) => {
        try {
          const featuresResult = await supabase
            .from('plan_features')
            .select('*')
            .eq('plan_id', plan.id) as { data: PlanFeatureRow[] | null; error: any };
          
          if (featuresResult.error) {
            console.error(`Error fetching features for plan ${plan.id}:`, featuresResult.error);
          }
          
          return {
            ...plan,
            planFeatures: featuresResult.data || [],
          };
        } catch (error: any) {
          console.error(`Error processing plan ${plan.id}:`, error);
          return {
            ...plan,
            planFeatures: [],
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      plans: plansWithFeatures,
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

