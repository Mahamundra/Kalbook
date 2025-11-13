import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type SuperAdminUserRow = Database['public']['Tables']['super_admin_users']['Row'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/verify
 * Verify if current user is a super admin
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isSuperAdmin: false });
    }

    const adminClient = createAdminClient();
    const adminResult = await adminClient
      .from('super_admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle() as { data: SuperAdminUserRow | null; error: any };

    return NextResponse.json({
      isSuperAdmin: adminResult.data !== null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { isSuperAdmin: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/verify
 * Verify if a specific user ID is a super admin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const adminResult = await supabase
      .from('super_admin_users')
      .select('*')
      .eq('id', userId)
      .eq('is_super_admin', true)
      .maybeSingle() as { data: SuperAdminUserRow | null; error: any };

    return NextResponse.json({
      success: true,
      isSuperAdmin: adminResult.data !== null,
    });
  } catch (error: any) {
    console.error('Error verifying super admin:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify super admin' },
      { status: 500 }
    );
  }
}

