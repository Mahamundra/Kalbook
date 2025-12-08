import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /b/[slug]/admin/logout
 * Logout admin user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    
    // Sign out from Supabase Auth
    await supabase.auth.signOut();

    // Clear admin_session and is_logged_in cookies
    const response = NextResponse.redirect(new URL('/', request.url));
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

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    // Still redirect to homepage even if there's an error
    return NextResponse.redirect(new URL('/', request.url));
  }
}

