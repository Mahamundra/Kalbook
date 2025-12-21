import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateWorkerInvite, invalidateWorkerInvite } from '@/lib/workers/invites';
import { toE164Format } from '@/lib/customers/utils';
import { signCookie } from '@/lib/auth/cookie-sign';
import type { Database } from '@/lib/supabase/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

/**
 * POST /api/workers/setup-account
 * Set up worker account from invite
 * Body: { inviteToken, businessSlug, phone, password }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteToken, businessSlug, name, phone, password } = body;

    if (!inviteToken || !businessSlug || !name || !phone || !password) {
      return NextResponse.json(
        { error: 'Invite token, business slug, name, phone, and password are required' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate invite token
    const inviteData = await validateWorkerInvite(inviteToken, businessSlug);

    if (!inviteData) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const worker = inviteData.worker;

    // Convert phone to E.164 format
    let e164Phone: string;
    try {
      e164Phone = toE164Format(phone);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use E.164 format (e.g., +972542636737)' },
        { status: 400 }
      );
    }

    // Update worker with name, phone number, and set to active (registration complete)
    const { error: updateError } = await supabase
      .from('workers')
      .update({
        name: name.trim(),
        phone: e164Phone,
        active: true, // Set to active after registration
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', worker.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update worker' },
        { status: 500 }
      );
    }

    // Check if user already exists for this worker
    const existingUserResult = await supabase
      .from('users')
      .select('*')
      .eq('business_id', worker.business_id)
      .or(`email.eq.${worker.email || ''},phone.eq.${e164Phone}`)
      .maybeSingle() as { data: UserRow | null; error: any };

    const { data: existingUser } = existingUserResult;

    let userId: string;

    if (existingUser) {
      // User already exists - update it
      userId = existingUser.id;

      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          name: worker.name,
          email: worker.email || existingUser.email,
          phone: e164Phone,
          role: 'admin', // Workers with accounts are admins
          is_main_admin: false,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', userId);

      if (updateUserError) {
        return NextResponse.json(
          { error: 'Failed to update user account' },
          { status: 500 }
        );
      }
    } else {
      // Create new user in users table
      // Generate UUID for user (users.id doesn't have to match auth user ID)
      userId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          business_id: worker.business_id,
          email: worker.email || null,
          phone: e164Phone,
          name: worker.name,
          role: 'admin', // Workers with accounts are admins
          is_main_admin: false,
        } as any);

      if (userError) {
        return NextResponse.json(
          { error: 'Failed to create user account: ' + userError.message },
          { status: 500 }
        );
      }
    }

    // Create or update Supabase Auth user
    // Check if auth user exists by email or phone
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(
      (u) => u.email === worker.email || u.phone === e164Phone
    );

    if (existingAuthUser) {
      // Update existing auth user password
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          password: password,
          email: worker.email || existingAuthUser.email,
          phone: e164Phone,
          user_metadata: {
            name: worker.name,
            business_id: worker.business_id,
            role: 'admin',
          },
          app_metadata: {
            business_id: worker.business_id,
            role: 'admin',
          },
        }
      );

      if (updateAuthError) {
        console.error('Failed to update auth user:', updateAuthError);
        // Continue - user record exists, they can login via OTP
      }
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: worker.email || undefined,
        phone: e164Phone,
        password: password,
        email_confirm: worker.email ? true : false,
        user_metadata: {
          name: worker.name,
          business_id: worker.business_id,
          role: 'admin',
        },
        app_metadata: {
          business_id: worker.business_id,
          role: 'admin',
        },
      });

      if (authError) {
        console.error('Failed to create auth user:', authError);
        // Continue - user record exists, they can login via OTP
      }
    }

    // Invalidate invite token
    await invalidateWorkerInvite(worker.id);

    // Create session response
    const sessionData = JSON.stringify({
      type: 'business_owner',
      userId: userId,
      businessId: worker.business_id,
      email: worker.email || null,
      phone: e164Phone,
      name: worker.name,
      role: 'admin',
    });

    const signedSessionData = signCookie(sessionData);

    const response = NextResponse.json({
      success: true,
      message: 'Account set up successfully',
    });

    // Set admin session cookie
    response.cookies.set('admin_session', signedSessionData, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: any) {
    console.error('Error setting up worker account:', error);
    return NextResponse.json(
      { error: 'Failed to set up account' },
      { status: 500 }
    );
  }
}

