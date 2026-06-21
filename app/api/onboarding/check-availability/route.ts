import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkOnboardingAvailability } from '@/lib/onboarding/availability';

/**
 * POST /api/onboarding/check-availability
 * Check if email or phone is already registered (without creating anything)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    const supabase = createAdminClient();
    const result = await checkOnboardingAvailability(supabase, { email, phone });

    if (!result.available) {
      return NextResponse.json(
        {
          available: false,
          field: result.field,
          error: result.error,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ available: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check availability';
    return NextResponse.json(
      {
        available: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
