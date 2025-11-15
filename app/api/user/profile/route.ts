import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

export const dynamic = 'force-dynamic';

/**
 * Get admin session from cookie
 */
function getAdminSession(request: NextRequest): { userId: string; businessId: string; email: string; phone: string; name: string; role: string } | null {
  const adminSessionCookie = request.cookies.get('admin_session')?.value;
  if (!adminSessionCookie) {
    return null;
  }

  try {
    return JSON.parse(adminSessionCookie);
  } catch (error) {
    console.error('Error parsing admin_session cookie:', error);
    return null;
  }
}

/**
 * GET /api/user/profile
 * Get current user profile from admin_session
 */
export async function GET(request: NextRequest) {
  try {
    const session = getAdminSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .single() as { data: UserRow | null; error: any };

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If user is an owner, get ALL businesses where they are owner (by phone number)
    let businesses: Array<{ id: string; slug: string; name: string }> = [];
    
        if (user.role === 'owner' && user.phone) {
          // Find all user records with the same phone number and role='owner'
          const { data: allOwnerUsers, error: allUsersError } = await supabase
            .from('users')
            .select('business_id')
            .eq('phone', user.phone)
            .eq('role', 'owner') as { data: Array<{ business_id: string }> | null; error: any };

          if (!allUsersError && allOwnerUsers && allOwnerUsers.length > 0) {
            const businessIds = allOwnerUsers.map(u => u.business_id);
        
        // Get all businesses for these business_ids
        const { data: allBusinesses, error: businessesError } = await supabase
          .from('businesses')
          .select('id, slug, name')
          .in('id', businessIds);

        if (!businessesError && allBusinesses) {
          businesses = allBusinesses;
        }
      }
    } else {
      // For non-owners, just get the current business
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, name')
        .eq('id', session.businessId)
        .single();

      if (!businessError && business) {
        businesses = [business];
      }
    }

    if (businesses.length === 0) {
      return NextResponse.json(
        { error: 'No businesses found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      businesses: businesses,
      // Keep business for backward compatibility (first business)
      business: businesses[0],
    });
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update user details (name, email, phone)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = getAdminSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, phone } = body;

    const supabase = createAdminClient();

    // Build update object
    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update user
    const { data: updatedUser, error: updateError } = await (supabase
      .from('users') as any)
      .update(updateData as any)
      .eq('id', session.userId)
      .select()
      .single() as { data: UserRow | null; error: any };

    if (updateError || !updatedUser) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update user profile' },
        { status: 500 }
      );
    }

    // Update session cookie with new data
    const updatedSession = {
      ...session,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || session.phone,
    };

    const response = NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
      },
    });

    // Update admin_session cookie
    response.cookies.set('admin_session', JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
}

