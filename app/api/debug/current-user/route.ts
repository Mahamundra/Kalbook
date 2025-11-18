import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/current-user
 * Debug endpoint to check which user is currently logged in
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        loggedIn: false,
        message: 'No user logged in',
        error: authError?.message,
      });
    }

    // Check if user is super admin
    const adminClient = createAdminClient();
    const { data: superAdmin } = await adminClient
      .from('super_admin_users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Get user's business info if they're a regular admin
    const { data: userData } = await adminClient
      .from('users')
      .select('business_id, name, email, role')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      loggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        isSuperAdmin: superAdmin !== null,
      },
      superAdmin: superAdmin,
      businessUser: userData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check user' },
      { status: 500 }
    );
  }
}


