import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/logout
 * Logout user by clearing admin_session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    // Clear admin_session cookie
    response.cookies.delete('admin_session');
    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to logout' },
      { status: 500 }
    );
  }
}

