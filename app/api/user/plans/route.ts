import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBusinessPlan } from '@/lib/trial/utils';
import type { Database } from '@/lib/supabase/database.types';

type PlanRow = Database['public']['Tables']['plans']['Row'];
type PlanFeatureRow = Database['public']['Tables']['plan_features']['Row'];
type BusinessRow = Database['public']['Tables']['businesses']['Row'];

export const dynamic = 'force-dynamic';

/**
 * Get admin session from cookie
 */
function getAdminSession(request: NextRequest): { userId: string; businessId: string; email: string; phone: string; name: string; role: string } | null {
  const adminSessionCookie = request.cookies.get('admin_session')?.value;
  if (!adminSessionCookie) {
    return null;
  }

  try {
    return JSON.parse(adminSessionCookie);
  } catch (error) {
    console.error('Error parsing admin_session cookie:', error);
    return null;
  }
}

/**
 * GET /api/user/plans
 * Get available plans and current business plan
 * Query params: businessId (optional, defaults to session businessId)
 */
export async function GET(request: NextRequest) {
  try {
    const session = getAdminSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get businessId from query params or use session businessId
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId') || session.businessId;

    const supabase = createAdminClient();

    // Get all active plans
    const plansResult = await supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('price', { ascending: true }) as { data: PlanRow[] | null; error: any };

    if (plansResult.error) {
      return NextResponse.json(
        { error: plansResult.error.message || 'Failed to fetch plans' },
        { status: 500 }
      );
    }

    // Get features for each plan
    const plansWithFeatures = await Promise.all(
      (plansResult.data || []).map(async (plan) => {
        const featuresResult = await supabase
          .from('plan_features')
          .select('*')
          .eq('plan_id', plan.id) as { data: PlanFeatureRow[] | null; error: any };
        
        return {
          ...plan,
          planFeatures: featuresResult.data || [],
        };
      })
    );

    // Get current business plan for the specified business
    const currentPlan = await getBusinessPlan(businessId);

    // Get business subscription status and dates
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('subscription_status, trial_started_at, trial_ends_at, subscription_started_at, subscription_ends_at, renewed_at')
      .eq('id', businessId)
      .single() as { data: BusinessRow | null; error: any };

    // Calculate days remaining until expiration
    let daysRemaining: number | null = null;
    let expiresIn7Days = false;
    const now = new Date();
    
    if (business) {
      const endDate = business.subscription_ends_at || business.trial_ends_at;
      if (endDate) {
        const end = new Date(endDate);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, diffDays);
        expiresIn7Days = daysRemaining <= 7 && daysRemaining > 0;
      }
    }

    return NextResponse.json({
      success: true,
      plans: plansWithFeatures,
      currentPlan: currentPlan ? {
        id: currentPlan.id,
        name: currentPlan.name,
        price: currentPlan.price,
      } : null,
      subscriptionStatus: business?.subscription_status || null,
      trialStartedAt: business?.trial_started_at || null,
      trialEndsAt: business?.trial_ends_at || null,
      subscriptionStartedAt: business?.subscription_started_at || null,
      subscriptionEndsAt: business?.subscription_ends_at || null,
      renewedAt: business?.renewed_at || null,
      daysRemaining,
      expiresIn7Days,
    });
  } catch (error: any) {
    console.error('Error getting plans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get plans' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/plans
 * Change business plan (owner only - validates role)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = getAdminSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is owner (only owners can change plans)
    if (session.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only business owners can change plans' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId, subscriptionStatus, businessId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify the user has access to this business (must be owner of this business)
    const { data: userCheck, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .eq('business_id', businessId)
      .eq('role', 'owner')
      .maybeSingle();

    if (userCheckError || !userCheck) {
      return NextResponse.json(
        { error: 'You do not have permission to change plans for this business' },
        { status: 403 }
      );
    }

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

    // Get current business to check if renewing or first time
    const { data: currentBusiness } = await supabase
      .from('businesses')
      .select('subscription_started_at, subscription_status')
      .eq('id', businessId)
      .single() as { data: BusinessRow | null; error: any };

    // Update business plan
    const updateData: any = {
      plan_id: planId,
    };

    // If setting to active, handle subscription dates
    if (subscriptionStatus === 'active') {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // If already had an active subscription, this is a renewal
      if (currentBusiness?.subscription_status === 'active' && currentBusiness?.subscription_started_at) {
        updateData.renewed_at = now.toISOString();
        updateData.subscription_ends_at = thirtyDaysFromNow.toISOString();
      } else {
        // First time activating subscription
        updateData.subscription_started_at = now.toISOString();
        updateData.subscription_ends_at = thirtyDaysFromNow.toISOString();
        updateData.trial_started_at = null;
        updateData.trial_ends_at = null;
      }
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
      message: 'Plan updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update plan' },
      { status: 500 }
    );
  }
}

