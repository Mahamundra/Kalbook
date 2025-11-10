import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

/**
 * POST /api/admin/setup-default-user
 * Create default test admin user (development only)
 * 
 * Request body (optional):
 * {
 *   businessId: string (optional - uses first business if not provided),
 *   email: string (default: "test@example.com"),
 *   password: string (default: "1234")
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = body.email || 'test@example.com';
    const password = body.password || '1234';
    const businessId = body.businessId;

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
    } else {
      // Get first business
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('id, name, slug')
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
    const existingUserResult = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle() as { data: { id: string; email: string } | null; error: any };
    const existingUser = existingUserResult.data;

    let authUserId: string;

    // Try to find existing auth user by email
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users.find(u => u.email === email);

    if (existingAuthUser) {
      // Auth user exists - update password
      await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        password: password,
      });

      authUserId = existingAuthUser.id;

      // Ensure user record exists and is linked to this business
      if (existingUser) {
        // Update existing user record if needed
        if (existingUser.id !== authUserId) {
          // Delete old user record
          // Check if this is a main admin - cannot be deleted
          const userDetailsResult = await supabase
            .from('users')
            .select('is_main_admin')
            .eq('id', existingUser.id)
            .single() as { data: { is_main_admin?: boolean } | null; error: any };
          const userDetails = userDetailsResult.data;
          
          if (!userDetails?.is_main_admin) {
            await supabase.from('users').delete().eq('id', existingUser.id);
          } else {
            console.log('Cannot delete main admin user:', existingUser.id);
          }
          // Create new user record with correct ID
          await supabase.from('users').insert({
            id: authUserId,
            business_id: targetBusinessId,
            email: email,
            name: 'Test Admin',
            role: 'owner',
          } as any);
        } else {
          // Update business_id if different
          await (supabase
            .from('users') as any)
            .update({ business_id: targetBusinessId })
            .eq('id', authUserId);
        }
      } else {
        // Create user record
        await supabase.from('users').insert({
          id: authUserId,
          business_id: targetBusinessId,
          email: email,
          name: 'Test Admin',
          role: 'owner',
        } as any);
      }
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: 'Test Admin',
          business_id: targetBusinessId,
          role: 'owner',
        },
        app_metadata: {
          business_id: targetBusinessId,
          role: 'owner',
        },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: authError?.message || 'Failed to create auth user' },
          { status: 500 }
        );
      }

      authUserId = authData.user.id;

      // Create or update user record
      if (existingUser && existingUser.id !== authUserId) {
        // Delete old user record if ID is different
        await supabase.from('users').delete().eq('id', existingUser.id);
      }

      // Upsert user record (insert or update)
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: authUserId,
          business_id: targetBusinessId,
          email: email,
          name: 'Test Admin',
          role: 'owner',
        } as any, {
          onConflict: 'id'
        });

      if (userError) {
        // Rollback: delete auth user
        await supabase.auth.admin.deleteUser(authUserId);
        return NextResponse.json(
          { error: userError.message || 'Failed to create user record' },
          { status: 500 }
        );
      }
    }

    // Get business slug for response
    const { data: business } = await supabase
      .from('businesses')
      .select('slug, name')
      .eq('id', targetBusinessId)
      .single();

    return NextResponse.json({
      success: true,
      user: {
        email: email,
        password: password,
        businessId: targetBusinessId,
        businessSlug: (business as any)?.slug,
        businessName: (business as any)?.name,
      },
      loginUrl: `/b/${(business as any)?.slug}/admin/login`,
      message: 'Default test user created/updated successfully',
    });
  } catch (error: any) {
    console.error('Error setting up default user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup default user' },
      { status: 500 }
    );
  }
}

