import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/admin-login
 * Admin login endpoint that sets session cookies properly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, businessSlug } = body;

    if (!email || !password || !businessSlug) {
      return NextResponse.json(
        { error: 'Email, password, and business slug are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify user belongs to this business
    const adminSupabase = createAdminClient();
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('business_id')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'User account not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Get business to verify slug matches
    const { data: businessData, error: businessError } = await adminSupabase
      .from('businesses')
      .select('id, slug')
      .eq('id', (userData as any).business_id)
      .single();

    if (businessError || !businessData) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Business not found. Please contact support.' },
        { status: 404 }
      );
    }

    const userBusinessSlug = (businessData as any).slug;

    // Verify user's business matches the slug
    if (userBusinessSlug !== businessSlug) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: `You don't have access to this business. Your business slug is: ${userBusinessSlug || 'unknown'}` },
        { status: 403 }
      );
    }

    // Get session to ensure cookies are set
    const { data: { session } } = await supabase.auth.getSession();

    // Return success - cookies are already set by Supabase SSR
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        businessSlug: userBusinessSlug,
      },
    });

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during login' },
      { status: 500 }
    );
  }
}








