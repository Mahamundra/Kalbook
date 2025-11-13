import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type SuperAdminUserRow = Database['public']['Tables']['super_admin_users']['Row'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/super-admin/setup
 * Create the first super admin user
 * This should only be called once to set up the initial super admin
 * 
 * Body: { email: string, password: string, name: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'email, password, and name are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if any super admin already exists
    const existingAdminsResult = await supabase
      .from('super_admin_users')
      .select('id')
      .limit(1) as { data: SuperAdminUserRow[] | null; error: any };

    if (existingAdminsResult.data && existingAdminsResult.data.length > 0) {
      return NextResponse.json(
        { error: 'Super admin already exists. Only one super admin is allowed.' },
        { status: 409 }
      );
    }

    // Check if email already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    
    if (emailExists) {
      return NextResponse.json(
        { error: 'Email already registered. Please use a different email.' },
        { status: 409 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name,
        role: 'super_admin',
      },
      app_metadata: {
        role: 'super_admin',
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user' },
        { status: 500 }
      );
    }

    // Create super admin record
    const { data: superAdmin, error: superAdminError } = await supabase
      .from('super_admin_users')
      .insert({
        id: authData.user.id,
        is_super_admin: true,
      } as any)
      .select()
      .single() as { data: SuperAdminUserRow | null; error: any };

    if (superAdminError) {
      // Rollback: delete auth user if super admin creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: superAdminError.message || 'Failed to create super admin record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name,
      },
    });
  } catch (error: any) {
    console.error('Error setting up super admin:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup super admin' },
      { status: 500 }
    );
  }
}

