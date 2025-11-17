import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

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
    return null;
  }
}

/**
 * POST /api/user/plans/cancel
 * Cancel a business plan (owner only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = getAdminSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is owner (only owners can cancel plans)
    if (session.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only business owners can cancel plans' },
        { status: 403 }
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
        { error: 'You do not have permission to cancel plans for this business' },
        { status: 403 }
      );
    }

    // Get current business to check subscription status
    const { data: currentBusiness, error: businessError } = await supabase
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
    const updateResult = await (supabase
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

