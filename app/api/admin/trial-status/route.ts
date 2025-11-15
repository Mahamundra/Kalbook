import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { isTrialExpired, getTrialDaysRemaining, getBusinessPlan } from '@/lib/trial/utils';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/trial-status
 * Get current business's trial status, plan info, and days remaining
 */
export async function GET(request: NextRequest) {
  try {
    let tenantInfo = await getTenantInfoFromRequest(request);

    // If tenant info not found from headers, try to get from session
    if (!tenantInfo?.businessId) {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user's business_id from users table
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminSupabase = createAdminClient();
        const userDataResult = await adminSupabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single() as { data: { business_id: string } | null; error: any };
        
        if (userDataResult.data?.business_id) {
          tenantInfo = {
            businessId: userDataResult.data.business_id,
            businessSlug: null,
          };
        }
      }
    }

    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // Get business info
    const businessResult = await supabase
      .from('businesses')
      .select('subscription_status, trial_ends_at, subscription_ends_at, plan_id')
      .eq('id', tenantInfo.businessId)
      .single() as { data: BusinessRow | null; error: any };

    if (businessResult.error || !businessResult.data) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const business = businessResult.data;
    const trialExpired = await isTrialExpired(tenantInfo.businessId);
    const daysRemaining = await getTrialDaysRemaining(tenantInfo.businessId);
    const plan = await getBusinessPlan(tenantInfo.businessId);

    return NextResponse.json({
      success: true,
      trialExpired,
      daysRemaining,
      planName: plan?.name || 'No plan',
      subscriptionStatus: business.subscription_status,
      trialEndsAt: business.trial_ends_at,
      subscriptionEndsAt: business.subscription_ends_at,
    });
  } catch (error: any) {
    console.error('Error getting trial status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get trial status' },
      { status: 500 }
    );
  }
}

