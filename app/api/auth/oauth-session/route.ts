import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * POST /api/auth/oauth-session
 * Create admin_session cookie from Supabase Auth session (for OAuth logins)
 * Checks if user exists in users table and creates session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current Supabase Auth session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Only allow owners to login from homepage
    const adminSupabase = createAdminClient();
    
    // Find user by email in users table (owners only for homepage login)
    let { data: dbUser, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .eq('role', 'owner')
      .maybeSingle() as { data: UserRow | null; error: any };

    // If not found, try case-insensitive search
    if (userError || !dbUser) {
      const { data: allUsers } = await adminSupabase
        .from('users')
        .select('*')
        .eq('role', 'owner') as { data: UserRow[] | null; error: any };

      if (allUsers) {
        const normalizedEmail = (user.email || '').toLowerCase().trim();
        for (const u of allUsers) {
          const dbEmail = (u.email || '').toLowerCase().trim();
          if (dbEmail === normalizedEmail) {
            dbUser = u;
            userError = null;
            break;
          }
        }
      }
    }

    // If user not found, return 404 (will trigger "not registered" message)
    if (userError || !dbUser) {
      return NextResponse.json(
        { 
          error: 'No business owner account found with this email. Only business owners can login from the homepage. If you have not registered yet, please create a new business.',
        },
        { status: 404 }
      );
    }

    // Get business info
    const { data: business, error: businessError } = await adminSupabase
      .from('businesses')
      .select('id, slug, name')
      .eq('id', (dbUser as any).business_id)
      .single() as { data: { id: string; slug: string; name: string } | null; error: any };

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business information not found' },
        { status: 404 }
      );
    }

    // Create response with user and business info
    const response = NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: dbUser.role || 'owner',
      },
      business: {
        id: business.id,
        slug: business.slug,
        name: business.name,
      },
    });

    // Set admin session cookie for middleware to check
    const sessionData = JSON.stringify({
      type: 'business_owner',
      userId: dbUser.id,
      businessId: (dbUser as any).business_id,
      email: dbUser.email,
      phone: dbUser.phone,
      name: dbUser.name,
      role: dbUser.role || 'owner',
    });

    response.cookies.set('admin_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error creating OAuth session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session. Please try again.' },
      { status: 500 }
    );
  }
}

