import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logout } from '@/lib/auth/session';

const SESSION_COOKIE_NAME = 'customer_session';

/**
 * POST /api/auth/logout
 * Logout and clear session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userType = 'customer' } = body;

    // Clear customer session cookie
    const cookieStore = await cookies();
    const response = NextResponse.json({ success: true });

    response.cookies.delete(SESSION_COOKIE_NAME);

    // If business owner, also sign out from Supabase Auth
    if (userType === 'business_owner') {
      await logout();
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

