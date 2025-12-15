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
  console.error('=== verify-otp-homepage CALLED ===');
  try {
    const body = await request.json();
    const { phone, code, userType = 'homepage_admin' } = body;
    console.error('verify-otp-homepage - received:', { phone, code, userType });

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

    // If user not found, check if a business exists with this phone number
    // This handles cases where business was created but user record wasn't created
    if (!user && !userError) {
      // Try to find business by phone number
      let businessByPhone: { id: string; slug: string; name: string; phone: string | null } | null = null;
      const businessResult = await supabase
        .from('businesses')
        .select('id, slug, name, phone')
        .eq('phone', normalizedPhone)
        .maybeSingle() as { data: { id: string; slug: string; name: string; phone: string | null } | null; error: any };
      
      const { data: businessData, error: businessError } = businessResult;

      if (businessData) {
        businessByPhone = businessData;
      }

      // If not found with exact match, try alternative formats
      if (!businessByPhone && !businessError) {
        const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone;
        const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;
        
        const formats = [phoneWithoutPlus, phoneWithPlus];
        for (const phoneFormat of formats) {
          if (phoneFormat === normalizedPhone) continue;
          
          const businessAltResult = await supabase
            .from('businesses')
            .select('id, slug, name, phone')
            .eq('phone', phoneFormat.trim())
            .maybeSingle() as { data: { id: string; slug: string; name: string; phone: string | null } | null; error: any };
          
          const { data: businessAlt } = businessAltResult;
          
          if (businessAlt) {
            businessByPhone = businessAlt;
            break;
          }
        }
      }

      // If still not found, try manual matching with normalized comparison
      if (!businessByPhone) {
        const allBusinessesResult = await supabase
          .from('businesses')
          .select('id, slug, name, phone') as { data: Array<{ id: string; slug: string; name: string; phone: string | null }> | null; error: any };
        
        const { data: allBusinesses } = allBusinessesResult;
        
        if (allBusinesses) {
          const normalizedSearched = normalizedPhone.replace(/\s/g, '').toLowerCase();
          for (const dbBusiness of allBusinesses) {
            if (!dbBusiness.phone) continue;
            const dbPhone = toE164Format(dbBusiness.phone).trim().replace(/\s/g, '').toLowerCase();
            if (dbPhone === normalizedSearched) {
              businessByPhone = dbBusiness;
              break;
            }
          }
        }
      }

      // If business found, create or find user record
      if (businessByPhone) {
        console.log('Business found by phone, checking for user record:', {
          businessId: businessByPhone.id,
          businessSlug: businessByPhone.slug,
          phone: normalizedPhone,
        });

        // Check if user already exists for this business (maybe with different phone format)
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('business_id', businessByPhone.id)
          .eq('role', 'owner')
          .maybeSingle() as { data: UserRow | null; error: any };

        if (existingUser) {
          // User exists, use it
          user = existingUser;
          userError = null;
          console.log('Found existing user for business:', existingUser.id);
        } else {
          // Create user record for this business
          const newUserId = crypto.randomUUID();
          const userData = {
            id: newUserId,
            business_id: businessByPhone.id,
            phone: normalizedPhone,
            email: null,
            name: businessByPhone.name || 'Business Owner',
            role: 'owner' as const,
            is_main_admin: true,
          };

          const { data: newUser, error: createUserError } = await supabase
            .from('users')
            .insert(userData as any)
            .select()
            .single() as { data: UserRow | null; error: any };

          if (createUserError || !newUser) {
            console.error('Failed to create user record:', createUserError);
            // Continue anyway - we'll handle it below
          } else {
            user = newUser;
            userError = null;
            console.log('Created new user record for business:', newUser.id);
          }
        }
      }
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
      phone: (user as any).phone || '', // Ensure phone is always a string, not null
      name: (user as any).name || 'Business Owner',
      role: (user as any).role || 'owner', // Default to 'owner' for homepage login
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
      // Temporary debug info
      _debug: {
        cookieSet: true,
        userId: userData.id,
        businessId: userData.business_id,
        hasPhone: !!userData.phone,
        phoneLength: userData.phone?.length || 0,
      },
    });

    // Set admin_session cookie so UI can detect logged-in user (for homepage)
    // Ensure all fields are strings (not null) for consistency
    const sessionData = JSON.stringify({
      type: 'business_owner',
      userId: userData.id,
      businessId: userData.business_id, // Use userData.business_id for consistency
      email: userData.email || '', // Ensure email is always a string
      phone: userData.phone || '', // Ensure phone is always a string (not null)
      name: userData.name || 'Business Owner',
      role: userData.role || 'owner', // Ensure role is always set
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

    // Debug logging
    console.error('Setting admin_session cookie:', {
      userId: userData.id,
      businessId: userData.business_id,
      hasEmail: !!userData.email,
      hasPhone: !!userData.phone,
      role: userData.role,
      cookieLength: signedSessionData.length,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}

