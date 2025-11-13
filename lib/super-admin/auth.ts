/**
 * Super admin authentication utilities
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type SuperAdminUserRow = Database['public']['Tables']['super_admin_users']['Row'];

/**
 * Check if current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('[Super Admin Auth] Error getting user:', userError);
      return false;
    }

    if (!user) {
      console.log('[Super Admin Auth] No user found in session');
      return false;
    }

    console.log('[Super Admin Auth] Checking user:', user.id, user.email);

    const adminClient = createAdminClient();
    const adminResult = await adminClient
      .from('super_admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle() as { data: SuperAdminUserRow | null; error: any };

    if (adminResult.error) {
      console.error('[Super Admin Auth] Error checking super_admin_users:', adminResult.error);
      return false;
    }

    const isAdmin = adminResult.data !== null;
    console.log('[Super Admin Auth] Is super admin:', isAdmin, 'User ID:', user.id);
    
    if (!isAdmin) {
      // Check if user exists in super_admin_users table at all
      const { data: anyAdminRecord } = await adminClient
        .from('super_admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      console.log('[Super Admin Auth] User exists in super_admin_users:', anyAdminRecord !== null);
      
      // List all super admin IDs for debugging
      const { data: allAdmins } = await adminClient
        .from('super_admin_users')
        .select('id') as { data: Array<{ id: string }> | null; error: any };
      
      console.log('[Super Admin Auth] All super admin IDs:', allAdmins?.map(a => a.id) || []);
    }

    return isAdmin;
  } catch (error: any) {
    console.error('[Super Admin Auth] Exception:', error);
    return false;
  }
}

/**
 * Require super admin access (throws if not super admin)
 */
export async function requireSuperAdmin(): Promise<void> {
  const isAdmin = await isSuperAdmin();
  if (!isAdmin) {
    throw new Error('Super admin access required');
  }
}

