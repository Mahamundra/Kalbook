import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/callback
 * Handle OAuth callback from Supabase Auth
 * Redirects back to onboarding with auth state
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/onboarding';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('OAuth callback error:', error);
      // Redirect to onboarding with error
      const redirectUrl = new URL('/onboarding', requestUrl.origin);
      redirectUrl.searchParams.set('error', 'oauth_error');
      return NextResponse.redirect(redirectUrl.toString());
    }
  }

  // Redirect to the next URL (onboarding page)
  return NextResponse.redirect(new URL(next, requestUrl.origin).toString());
}

