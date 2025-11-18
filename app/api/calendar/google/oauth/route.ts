import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { initiateGoogleOAuth, handleGoogleOAuthCallback } from '@/lib/calendar/google-sync';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar/google/oauth/initiate
 * Start Google OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'initiate') {
      // Get tenant context
      const tenantInfo = await getTenantInfoFromRequest(request);
      if (!tenantInfo?.businessId) {
        return NextResponse.json(
          { error: 'Business context required' },
          { status: 400 }
        );
      }

      const { authUrl } = await initiateGoogleOAuth(tenantInfo.businessId);
      return NextResponse.json({ authUrl });
    }

    if (action === 'callback') {
      const code = searchParams.get('code');
      const state = searchParams.get('state'); // businessId

      if (!code || !state) {
        return NextResponse.json(
          { error: 'Missing code or state parameter' },
          { status: 400 }
        );
      }

      const result = await handleGoogleOAuthCallback(state, code);
      
      if (result.success) {
        // Redirect to settings page with success message
        const redirectUrl = new URL('/admin/settings', request.url);
        redirectUrl.searchParams.set('google_calendar', 'connected');
        return NextResponse.redirect(redirectUrl.toString());
      } else {
        // Redirect with error
        const redirectUrl = new URL('/admin/settings', request.url);
        redirectUrl.searchParams.set('google_calendar', 'error');
        redirectUrl.searchParams.set('error', result.error || 'Failed to connect');
        return NextResponse.redirect(redirectUrl.toString());
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=initiate or ?action=callback' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in Google OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process OAuth request' },
      { status: 500 }
    );
  }
}

