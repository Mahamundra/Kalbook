import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPCode } from '@/lib/auth/otp';
import { getOrCreateCustomerSession } from '@/lib/auth/session';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { toE164Format } from '@/lib/customers/utils';
import { BUSINESS_SLUG_COOKIE } from '@/lib/tenant';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Get business-specific session cookie name
function getSessionCookieName(businessSlug: string): string {
  return `customer_session_${businessSlug}`;
}

/**
 * POST /api/auth/verify-otp
 * Verify OTP code and create session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, userType = 'customer', email, name } = body;

    // Validate inputs
    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      );
    }

    // Convert to E.164 format for consistency
    const e164Phone = toE164Format(phone);

    // Development mode: accept "1234" as valid code for testing
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_SMS === 'true';
    const isTestCode = code === '1234';
    
    let isValid = false;
    
    if (isDevelopment && isTestCode) {
      // In development, accept test code 1234
      isValid = true;
      console.log('[DEV MODE] Test code 1234 accepted');
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

    // Handle customer authentication
    if (userType === 'customer') {
      // Get business context from middleware
      const tenantInfo = await getTenantInfoFromRequest(request);
      if (!tenantInfo?.businessId) {
        return NextResponse.json(
          { error: 'Business context required' },
          { status: 400 }
        );
      }

      // Get or create customer session
      const customerSession = await getOrCreateCustomerSession(
        tenantInfo.businessId,
        e164Phone
      );

      // Update customer name/email if provided
      if (name || email) {
        const supabase = createAdminClient();
        const updateData: Record<string, string> = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        await supabase
          .from('customers')
          .update(updateData as never)
          .eq('id', customerSession.customerId);
      }

      // Get business slug from cookie (set by middleware)
      const businessSlug = request.cookies.get(BUSINESS_SLUG_COOKIE)?.value || tenantInfo.businessSlug;
      if (!businessSlug) {
        return NextResponse.json(
          { error: 'Business context required' },
          { status: 400 }
        );
      }

      // Set business-specific session cookie
      const response = NextResponse.json({
        success: true,
        session: customerSession,
      });

      const sessionData = JSON.stringify(customerSession);
      const sessionCookieName = getSessionCookieName(businessSlug);
      
      // Clear any old global session cookie
      response.cookies.delete('customer_session');
      
      // Set business-specific session cookie
      response.cookies.set(sessionCookieName, sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });

      return response;
    }

    // Handle business owner authentication
    if (userType === 'business_owner') {
      const { businessSlug } = body;

      if (!businessSlug) {
        return NextResponse.json(
          { error: 'Business slug is required for admin authentication' },
          { status: 400 }
        );
      }

      const supabase = createAdminClient();

      // Get business by slug to verify it exists
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug')
        .eq('slug', businessSlug)
        .maybeSingle();

      if (businessError || !business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }

      // Type assertion for business
      const businessData = business as {
        id: string;
        slug: string;
      };

      // Find user by phone and business_id - must be admin or owner
      // Note: Workers marked as admin are added to users table with role 'admin', so they can login
      // Use E.164 format for lookup (phone is stored in E.164 format)
      // Normalize phone for comparison (trim whitespace)
      const normalizedPhone = e164Phone.trim();
      
      // Try exact match first
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('business_id', businessData.id)
        .in('role', ['admin', 'owner']) // Both admin (from workers) and owner (main admin) can login
        .maybeSingle();
      
      console.log('User lookup attempt:', {
        searchedPhone: normalizedPhone,
        businessId: businessData.id,
        businessSlug,
        found: !!user,
        error: userError?.message,
      });

      // If not found, try alternative phone formats and also check all users in business
      if (userError || !user) {
        // First, get all users in this business to see what phone formats exist
        const { data: allUsersInBusiness } = await supabase
          .from('users')
          .select('id, phone, email, name, role, business_id')
          .eq('business_id', businessData.id);
        
        const usersList = (allUsersInBusiness || []) as Array<{
          id: string;
          phone: string | null;
          email: string;
          name: string;
          role: string;
          business_id: string;
        }>;
        
        console.log('All users in business:', usersList);
        
        // Try alternative formats
        const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone;
        const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;
        
        // Try each format separately
        const formats = [phoneWithoutPlus, phoneWithPlus];
        for (const phoneFormat of formats) {
          if (phoneFormat === normalizedPhone) continue; // Already tried
          
          const { data: userAlt, error: userAltError } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phoneFormat.trim())
            .eq('business_id', businessData.id)
            .in('role', ['admin', 'owner'])
            .maybeSingle();
          
          if (userAlt && !userAltError) {
            user = userAlt;
            userError = null;
            console.log(`Found user with alternative phone format: ${phoneFormat}`);
            break;
          }
        }
        
        // If still not found, try to find by matching phone numbers manually (case-insensitive, whitespace-agnostic)
        if (!user && usersList.length > 0) {
          const normalizedSearched = normalizedPhone.replace(/\s/g, '').toLowerCase();
          for (const dbUser of usersList) {
            if (dbUser.role === 'admin' || dbUser.role === 'owner') {
              const dbPhone = (dbUser.phone || '').replace(/\s/g, '').toLowerCase();
              if (dbPhone === normalizedSearched) {
                // Found a match! Get the full user record
                const { data: matchedUser } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', dbUser.id)
                  .single();
                if (matchedUser) {
                  user = matchedUser;
                  userError = null;
                  console.log(`Found user by manual phone matching: ${dbUser.phone}`);
                  break;
                }
              }
            }
          }
        }
      }

      // If still not found, get all users in this business for debugging
      if (userError || !user) {
        const { data: allUsers, error: allUsersError } = await supabase
          .from('users')
          .select('id, phone, email, name, role, business_id')
          .eq('business_id', businessData.id);
        
        // Also check if there's a user with this phone in ANY business (for debugging)
        const { data: userWithPhone } = await supabase
          .from('users')
          .select('id, phone, email, name, role, business_id')
          .eq('phone', e164Phone)
          .maybeSingle();
        
        const userWithPhoneData = userWithPhone as { id: string; phone: string; email: string; name: string; role: string; business_id: string } | null;
        
        console.error('User lookup failed:', {
          e164Phone,
          businessId: businessData.id,
          businessSlug,
          allUsersInBusiness: allUsers,
          userWithPhoneInAnyBusiness: userWithPhoneData,
          userError: userError?.message,
        });
        
        // Provide helpful error message
        let errorMessage = 'Admin user not found for this business.';
        if (userWithPhoneData && userWithPhoneData.business_id !== businessData.id) {
          errorMessage += ' This phone number is registered to a different business.';
        } else if (allUsers && allUsers.length > 0) {
          errorMessage += ' Found users in this business but none match your phone number.';
        } else {
          errorMessage += ' No users found in this business.';
        }
        errorMessage += ' Make sure you are using the phone number you registered with.';
        
        return NextResponse.json(
          { 
            error: errorMessage,
            debug: process.env.NODE_ENV === 'development' ? {
              searchedPhone: e164Phone,
              businessId: businessData.id,
              businessSlug,
              usersInBusiness: allUsers,
              userWithPhoneInAnyBusiness: userWithPhone,
            } : undefined
          },
          { status: 404 }
        );
      }

      // Type assertion for user
      const userData = user as {
        id: string;
        business_id: string;
        email: string;
        phone: string | null;
        name: string;
        role: string;
      };

      // Use Supabase Admin API to create a session
      // First, check if user exists in Supabase Auth
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(userData.id);
      
      // If user doesn't exist in Auth, create them
      if (getUserError || !authUser) {
        // Check if email or phone already exists before creating
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
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
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
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
            const errorMsg = createError?.message?.toLowerCase() || '';
            if (errorMsg.includes('email') || errorMsg.includes('already registered')) {
              // Check if email also belongs to different user
              if (existingUserByEmail && existingUserByEmail.id !== userData.id) {
                return NextResponse.json(
                  { error: 'Email address already registered by another user' },
                  { status: 409 }
                );
              }
            }
            // Continue anyway - we'll use session cookie
            console.log('Continuing with session cookie despite auth creation error');
          }
        } else {
          // Neither exists - create with both
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
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
              // This is okay - the phone is already in the users table, we just can't add it to auth
              const { data: retryUser, error: retryError } = await supabase.auth.admin.createUser({
                email: userData.email,
                email_confirm: true,
                user_metadata: {
                  name: userData.name,
                  business_id: userData.business_id,
                },
              });
              if (retryError || !retryUser) {
                const retryErrorMsg = retryError?.message?.toLowerCase() || '';
                if (retryErrorMsg.includes('email') || retryErrorMsg.includes('already registered')) {
                  // Email also exists - check if it's the same user
                  const existingUserByEmail = existingUsers?.users?.find(u => u.email === userData.email);
                  if (existingUserByEmail && existingUserByEmail.id === userData.id) {
                    // Same user - this is fine, continue
                    console.log('User already exists in auth with same ID, continuing');
                  } else {
                    return NextResponse.json(
                      { error: 'Email address already registered by another user' },
                      { status: 409 }
                    );
                  }
                } else {
                  console.error('Failed to create auth user even without phone:', retryError);
                  // Continue anyway - we'll use session cookie
                }
              } else {
                // Successfully created without phone
                console.log('Created auth user without phone (phone already exists)');
              }
            } else if (errorMsg.includes('email') || errorMsg.includes('already registered')) {
              // Check if email belongs to this user
              const existingUserByEmail = existingUsers?.users?.find(u => u.email === userData.email);
              if (existingUserByEmail && existingUserByEmail.id === userData.id) {
                // Same user - this is fine, continue
                console.log('User already exists in auth with this email and ID, continuing');
              } else {
                return NextResponse.json(
                  { error: 'Email address already registered by another user' },
                  { status: 409 }
                );
              }
            } else {
              // Continue anyway - we'll use session cookie
              console.log('Continuing with session cookie despite auth creation error');
            }
          }
        }
      }

      // Create a session using admin API
      // We'll generate a magic link and extract the session from it
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.email,
      });

      // Create response with session data
      const response = NextResponse.json({
        success: true,
        session: {
          type: 'business_owner',
          userId: userData.id,
          businessId: userData.business_id,
          email: userData.email,
          phone: userData.phone,
          name: userData.name,
          role: userData.role,
        },
      });

      // Set admin session cookie for middleware to check
      const sessionData = JSON.stringify({
        type: 'business_owner',
        userId: userData.id,
        businessId: userData.business_id,
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
        role: userData.role,
      });

      response.cookies.set('admin_session', sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      
      // Also set a non-httpOnly cookie for client-side verification (optional)
      // This helps with debugging but admin_session is the main one used by middleware

      // Also try to set Supabase Auth session if we have a link
      if (linkData?.properties?.hashed_token) {
        // Store the auth token in a cookie for Supabase client
        response.cookies.set('sb-auth-token', linkData.properties.hashed_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        });
      }

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid user type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}

