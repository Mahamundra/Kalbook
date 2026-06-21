import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { findExistingBusinessOwner } from '@/lib/onboarding/availability';

/**
 * POST /api/onboarding/check-existing-business
 * Check if user already has a registered business
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { hasBusiness: false, error: 'Email or phone is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const result = await findExistingBusinessOwner(supabase, { email, phone });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check existing business';
    return NextResponse.json(
      {
        hasBusiness: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
