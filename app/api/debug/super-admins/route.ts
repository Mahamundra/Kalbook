import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/super-admins
 * Debug endpoint to list all super admin users
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get all super admin users
    const { data: superAdmins, error } = await supabase
      .from('super_admin_users')
      .select('*') as { data: Array<{ id: string; is_super_admin: boolean; created_at: string }> | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get auth user info for each super admin
    const adminsWithEmail = await Promise.all(
      (superAdmins || []).map(async (admin) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(admin.id);
        return {
          id: admin.id,
          email: authUser?.user?.email || 'Unknown',
          isSuperAdmin: admin.is_super_admin,
          createdAt: admin.created_at,
        };
      })
    );

    return NextResponse.json({
      success: true,
      superAdmins: adminsWithEmail,
      count: adminsWithEmail.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get super admins' },
      { status: 500 }
    );
  }
}

