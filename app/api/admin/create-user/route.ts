import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { toE164Format } from '@/lib/customers/utils';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

/**
 * POST /api/admin/create-user
 * Create an admin user for an existing business
 * 
 * Request body:
 * {
 *   businessId: string (optional - uses first business if not provided),
 *   email: string,
 *   name: string,
 *   phone?: string,
 *   password?: string (optional - generates random if not provided)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { businessId, email, name, phone, password, businessSlug } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get business ID
    let targetBusinessId: string;

    if (businessId) {
      // Verify business exists
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }

      targetBusinessId = businessId;
    } else if (businessSlug) {
      // Get business by slug
      const { data: businessBySlug, error: businessError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('slug', businessSlug)
        .single() as { data: BusinessRow | null; error: any };

      if (businessError || !businessBySlug) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }

      targetBusinessId = businessBySlug.id;
    } else {
      // Get first business
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('id, name')
        .limit(1)
        .order('created_at', { ascending: false }) as { data: BusinessRow[] | null; error: any };

      if (businessesError || !businesses || businesses.length === 0) {
        return NextResponse.json(
          { error: 'No business found. Please create a business first.' },
          { status: 404 }
        );
      }

      const firstBusiness = businesses[0] as BusinessRow | undefined;
      if (!firstBusiness) {
        return NextResponse.json(
          { error: 'No business found. Please create a business first.' },
          { status: 404 }
        );
      }

      targetBusinessId = firstBusiness.id;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('business_id', targetBusinessId)
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists for this business' },
        { status: 409 }
      );
    }

    // Generate random password if not provided
    const userPassword = password || Math.random().toString(36).slice(-12) + 'A1!';

    // Convert phone to E.164 format if provided (required by Supabase Auth)
    const e164Phone = phone ? toE164Format(phone) : undefined;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      phone: e164Phone,
      password: userPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name,
        business_id: targetBusinessId,
        role: 'admin',
      },
      app_metadata: {
        business_id: targetBusinessId,
        role: 'admin',
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user in auth' },
        { status: 500 }
      );
    }

    const authUserId = authData.user.id;

    // Create user record in users table (store normalized phone for consistency)
    const userData = {
      id: authUserId,
      business_id: targetBusinessId,
      email: email,
      phone: e164Phone || null,
      name: name.trim(),
      role: 'admin' as const, // Use 'admin' role for OTP-based login
    };

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(userData as any)
      .select()
      .single();

    if (userError) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { error: userError.message || 'Failed to create user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: (newUser as any).id,
        email: (newUser as any).email,
        name: (newUser as any).name,
        businessId: targetBusinessId,
      },
      password: userPassword, // Only return if password was auto-generated
      message: 'Admin user created successfully',
    });
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    );
  }
}

