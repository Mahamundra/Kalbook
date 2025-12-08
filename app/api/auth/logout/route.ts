import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logout, getBusinessOwnerSession } from '@/lib/auth/session';

const SESSION_COOKIE_NAME = 'customer_session';

/**
 * POST /api/auth/logout
 * Logout and clear session
 */
export async function POST(request: NextRequest) {
  try {
    // Try to parse body, but don't fail if it's empty
    let userType = 'customer';
    try {
      const body = await request.json();
      userType = body.userType || 'customer';
    } catch {
      // Body might be empty, that's okay
    }

    const cookieStore = await cookies();
    const response = NextResponse.json({ success: true });

    // Clear customer session cookie
    response.cookies.delete(SESSION_COOKIE_NAME);

    // Check if there's a business owner session and sign out from Supabase Auth
    // Either explicitly requested or if we detect a business owner session
    const businessOwnerSession = await getBusinessOwnerSession();
    if (userType === 'business_owner' || businessOwnerSession) {
      await logout();
      
      // Clear admin_session and is_logged_in cookies
      response.cookies.delete('admin_session');
      response.cookies.set('admin_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      response.cookies.delete('is_logged_in');
      response.cookies.set('is_logged_in', '', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

