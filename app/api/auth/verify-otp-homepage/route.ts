import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPCode } from '@/lib/auth/otp';
import { createAdminClient } from '@/lib/supabase/admin';
import { toE164Format } from '@/lib/customers/utils';
import { signCookie } from '@/lib/auth/cookie-sign';
import type { Database } from '@/lib/supabase/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * POST /api/auth/verify-otp-homepage
 * Verify OTP code and find user across all businesses (for homepage login)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, userType = 'homepage_admin' } = body;

    // Validate inputs
    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      );
    }

    if (userType !== 'homepage_admin') {
      return NextResponse.json(
        { error: 'Invalid user type for homepage login' },
        { status: 400 }
      );
    }

    // Convert to E.164 format for consistency
    const e164Phone = toE164Format(phone);

    // Test code "123456" - always accept for testing (login if exists, register if not)
    const isTestCode = code === '123456';
    
    let isValid = false;
    
    if (isTestCode) {
      // Always accept test code 123456 for testing
      isValid = true;
      console.log('[TEST MODE] Test code 123456 accepted');
    } else {
      // Normal OTP verification
      isValid = await verifyOTPCode(e164Phone, code);
    }
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Search across all businesses for user with matching phone
    // Check both users table (owners/admins) and workers table
    const normalizedPhone = e164Phone.trim();

    // First, try to find in users table (owners only)
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('role', 'owner')
      .maybeSingle() as { data: UserRow | null; error: any };

    // If not found, try alternative phone formats
    if (userError || !user) {
      const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone;
      const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;
      
      const formats = [phoneWithoutPlus, phoneWithPlus];
      for (const phoneFormat of formats) {
        if (phoneFormat === normalizedPhone) continue;
        
        const userAltResult = await supabase
          .from('users')
          .select('*')
          .eq('phone', phoneFormat.trim())
          .eq('role', 'owner')
          .maybeSingle() as { data: UserRow | null; error: any };
        
        if (userAltResult.data) {
          user = userAltResult.data;
          userError = null;
          break;
        }
      }
    }

    // Only owners can login from homepage, so skip workers check

    // If still not found, try manual matching
    if (userError || !user) {
      // Get all owners to try manual matching
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'owner') as { data: UserRow[] | null; error: any };

      const normalizedSearched = normalizedPhone.replace(/\s/g, '').toLowerCase();
      
      if (allUsers) {
        for (const dbUser of allUsers) {
          const dbPhone = (dbUser.phone || '').replace(/\s/g, '').toLowerCase();
          if (dbPhone === normalizedSearched) {
            user = dbUser;
            userError = null;
            break;
          }
        }
      }

      // Only owners can login, so skip workers check
    }

    // If user not found and using test code, allow them to proceed (they'll register during onboarding)
    if ((userError || !user) && !isTestCode) {
      return NextResponse.json(
        { 
          error: 'No business owner account found with this phone number. Only business owners can login from the homepage. If you have not user yet, please create a new business.',
        },
        { status: 404 }
      );
    }

    // If using test code and user doesn't exist, allow onboarding
    if (isTestCode && (!user || userError)) {
      // Return success with phone number only - user will register during onboarding
      // No session needed - they'll create one during onboarding
      return NextResponse.json({
        success: true,
        user: {
          phone: e164Phone,
        },
        isNewUser: true,
      });
    }

    // At this point, user must exist (early returns handled null cases)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get business info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, slug, name')
      .eq('id', (user as any).business_id)
      .single() as { data: { id: string; slug: string; name: string } | null; error: any };

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business information not found' },
        { status: 404 }
      );
    }

    // Type assertion for user
    const userData = {
      id: user.id,
      business_id: business.id,
      email: (user as any).email || '',
      phone: (user as any).phone || null,
      name: (user as any).name,
      role: (user as any).role || 'admin',
    };

    // Ensure user exists in Supabase Auth
    const adminSupabaseAuth = createAdminClient();
    const { data: authUser, error: getUserError } = await adminSupabaseAuth.auth.admin.getUserById(userData.id);
    
    // If user doesn't exist in Auth, create them
    if (getUserError || !authUser) {
      // Check if email or phone already exists before creating
      const { data: existingUsers } = await adminSupabaseAuth.auth.admin.listUsers();
      const existingUserByEmail = existingUsers?.users?.find(u => u.email === userData.email);
      const existingUserByPhone = userData.phone ? existingUsers?.users?.find(u => u.phone === userData.phone) : null;
      
      // Check if email or phone belongs to this user (by ID)
      if (existingUserByEmail && existingUserByEmail.id === userData.id) {
        // User already exists in auth with this email - that's fine
        console.log('User already exists in auth with this email and ID');
      } else if (existingUserByPhone && existingUserByPhone.id === userData.id) {
        // User already exists in auth with this phone and ID - that's fine
        console.log('User already exists in auth with this phone and ID');
      } else if (existingUserByEmail && existingUserByEmail.id !== userData.id) {
        // Email exists but belongs to different user
        return NextResponse.json(
          { error: 'Email address already registered by another user' },
          { status: 409 }
        );
      } else if (existingUserByPhone && existingUserByPhone.id !== userData.id) {
        // Phone exists but belongs to different user - create without phone
        console.log('Phone exists for different user, creating auth user without phone');
        const { data: newUser, error: createError } = await adminSupabaseAuth.auth.admin.createUser({
          email: userData.email,
          // Skip phone since it already exists for another user
          email_confirm: true,
          user_metadata: {
            name: userData.name,
            business_id: userData.business_id,
          },
        });

        if (createError || !newUser) {
          console.error('Failed to create auth user (phone conflict):', createError);
        }
      } else {
        // Neither exists - create with both
        const { data: newUser, error: createError } = await adminSupabaseAuth.auth.admin.createUser({
          email: userData.email,
          phone: userData.phone || undefined,
          email_confirm: true,
          user_metadata: {
            name: userData.name,
            business_id: userData.business_id,
          },
        });

        if (createError || !newUser) {
          console.error('Failed to create auth user:', createError);
          // Check if it's a phone or email conflict
          const errorMsg = createError?.message?.toLowerCase() || '';
          if (errorMsg.includes('phone') || (errorMsg.includes('already registered') && errorMsg.includes('phone'))) {
            // Phone conflict - try again without phone
            const { data: retryUser, error: retryError } = await adminSupabaseAuth.auth.admin.createUser({
              email: userData.email,
              email_confirm: true,
              user_metadata: {
                name: userData.name,
                business_id: userData.business_id,
              },
            });
            if (retryError || !retryUser) {
              console.error('Failed to create auth user even without phone:', retryError);
            }
          }
        }
      }
    }

    // Create response with user and business info
    const response = NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
      },
      business: {
        id: business.id,
        slug: business.slug,
        name: business.name,
      },
    });

    // Set admin_session cookie so UI can detect logged-in user (for homepage)
    const sessionData = JSON.stringify({
      type: 'business_owner',
      userId: userData.id,
      businessId: business.id,
      email: userData.email,
      phone: userData.phone,
      name: userData.name,
      role: userData.role,
    });

    // Sign the cookie data to prevent tampering
    const signedSessionData = signCookie(sessionData);

    response.cookies.set('admin_session', signedSessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    // Set non-httpOnly flag cookie for client-side check
    response.cookies.set('is_logged_in', 'true', {
      httpOnly: false, // Can be read by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}

