/**
 * Authorization utilities for API routes
 */

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/middleware';

/**
 * Get current user ID from request (Supabase Auth or admin_session cookie)
 */
export async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  // Try Supabase Auth first
  const { supabase } = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    return user.id;
  }
  
  // Fallback to admin_session cookie
  const adminSessionCookie = request.cookies.get('admin_session')?.value;
  if (adminSessionCookie) {
    try {
      const session = JSON.parse(adminSessionCookie);
      return session.userId || null;
    } catch (error) {
      return null;
    }
  }
  
  return null;
}

/**
 * Check if current user is admin for the given business
 */
export async function isCurrentUserAdmin(
  request: NextRequest,
  businessId: string
): Promise<boolean> {
  const userId = await getCurrentUserId(request);
  
  if (!userId) {
    return false;
  }
  
  const supabase = createAdminClient();
  
  // Check if user is admin or owner for this business
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .eq('business_id', businessId)
    .in('role', ['admin', 'owner'])
    .maybeSingle();
  
  return !!user;
}

/**
 * Require admin role - throws error if user is not admin
 */
export async function requireAdmin(
  request: NextRequest,
  businessId: string
): Promise<void> {
  const isAdmin = await isCurrentUserAdmin(request, businessId);
  
  if (!isAdmin) {
    throw new Error('Only admin users can perform this action');
  }
}



