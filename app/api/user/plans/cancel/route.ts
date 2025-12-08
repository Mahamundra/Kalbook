import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/plans/cancel
 * Cancel a business plan (owner only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Get current business to check subscription status
    const { data: currentBusiness, error: businessError } = await adminSupabase
      .from('businesses')
      .select('subscription_status, subscription_ends_at')
      .eq('id', businessId)
      .single() as { data: BusinessRow | null; error: any };

    if (businessError || !currentBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation if subscription is active
    if (currentBusiness.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Can only cancel active subscriptions' },
        { status: 400 }
      );
    }

    // Cancel the subscription (keep subscription_ends_at unchanged)
    const updateResult = await (adminSupabase
      .from('businesses') as any)
      .update({ subscription_status: 'cancelled' })
      .eq('id', businessId)
      .select()
      .single() as { data: BusinessRow | null; error: any };

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message || 'Failed to cancel plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      business: updateResult.data,
      message: 'Plan cancelled successfully. Active until end date.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to cancel plan' },
      { status: 500 }
    );
  }
}

