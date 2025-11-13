import { NextRequest, NextResponse } from 'next/server';
import { getBusinessBySlug } from '@/lib/business';
import { isTrialExpired, getTrialDaysRemaining } from '@/lib/trial/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trial/status?slug=xxx
 * Get trial status for a business by slug
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Business slug is required' },
        { status: 400 }
      );
    }

    const business = await getBusinessBySlug(slug);

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const expired = await isTrialExpired(business.id);
    const daysRemaining = await getTrialDaysRemaining(business.id);

    return NextResponse.json({
      success: true,
      trialExpired: expired,
      daysRemaining,
      subscriptionStatus: business.subscription_status,
      trialEndsAt: business.trial_ends_at,
    });
  } catch (error: any) {
    console.error('Error checking trial status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check trial status' },
      { status: 500 }
    );
  }
}

