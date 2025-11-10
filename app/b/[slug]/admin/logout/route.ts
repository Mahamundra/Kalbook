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

    // Redirect to login page
    return NextResponse.redirect(new URL(`/b/${params.slug}/admin/login`, request.url));
  } catch (error: any) {
    console.error('Logout error:', error);
    // Still redirect to login even if there's an error
    return NextResponse.redirect(new URL(`/b/${params.slug}/admin/login`, request.url));
  }
}

