import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/callback
 * Handle OAuth callback from Supabase Auth
 * Redirects back to onboarding with auth state or sends message to parent if popup
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/onboarding';
  const isPopup = requestUrl.searchParams.get('popup') === 'true';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('OAuth callback error:', error);
      
      if (isPopup) {
        // Return HTML page that sends error message to parent
        return new NextResponse(
          `<!DOCTYPE html>
<html>
<head>
  <title>Authentication</title>
</head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'OAUTH_ERROR',
        error: '${error.message || 'Authentication failed'}'
      }, '${requestUrl.origin}');
      window.close();
    }
  </script>
</body>
</html>`,
          {
            headers: { 'Content-Type': 'text/html' },
          }
        );
      }
      
      // Redirect to onboarding with error
      const redirectUrl = new URL('/onboarding', requestUrl.origin);
      redirectUrl.searchParams.set('error', 'oauth_error');
      return NextResponse.redirect(redirectUrl.toString());
    }
  }

  if (isPopup) {
    // Return HTML page that sends success message to parent
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Authentication</title>
</head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'OAUTH_SUCCESS'
      }, '${requestUrl.origin}');
      window.close();
    } else {
      // Fallback: redirect if not in popup
      window.location.href = '${next}';
    }
  </script>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // Redirect to the next URL (onboarding page)
  return NextResponse.redirect(new URL(next, requestUrl.origin).toString());
}

