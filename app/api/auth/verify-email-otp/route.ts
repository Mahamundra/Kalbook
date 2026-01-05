import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailOTPCode } from '@/lib/auth/otp';
import { getOrCreateCustomerSession } from '@/lib/auth/session';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUSINESS_SLUG_COOKIE } from '@/lib/tenant';
import { signCookie } from '@/lib/auth/cookie-sign';
import type { Database } from '@/lib/supabase/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Get business-specific session cookie name
function getSessionCookieName(businessSlug: string): string {
  return `customer_session_${businessSlug}`;
}

/**
 * POST /api/auth/verify-email-otp
 * Verify email OTP code and create session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, userType = 'customer', name, redirectUrl, businessSlug } = body;

    // Validate inputs
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email address and code are required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Development mode: accept "123456" as valid code for testing
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_SMS === 'true';
    const isTestCode = code === '123456';
    
    let isValid = false;
    
    if (isDevelopment && isTestCode) {
      // In development, accept test code 123456
      isValid = true;
      console.log('[DEV MODE] Test code 123456 accepted for email OTP');
    } else {
      // Normal OTP verification
      isValid = await verifyEmailOTPCode(normalizedEmail, code);
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

      // Get or create customer session using email as identifier
      const customerSession = await getOrCreateCustomerSession(
        tenantInfo.businessId,
        normalizedEmail
      );

      // Update customer name/email if provided
      if (name || normalizedEmail) {
        const supabase = createAdminClient();
        const updateData: Record<string, string> = {};
        if (name) updateData.name = name;
        if (normalizedEmail) updateData.email = normalizedEmail;
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

      const businessData = business as {
        id: string;
        slug: string;
      };

      // Find user by email and business_id - must be admin or owner
      const normalizedEmailLower = normalizedEmail.toLowerCase().trim();
      
      // Try exact match first
      const { data: initialUser, error: initialUserError } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmailLower)
        .eq('business_id', businessData.id)
        .in('role', ['admin', 'owner'])
        .maybeSingle();
      
      let user: UserRow | null = initialUser;
      let userError = initialUserError;
      
      // If not found, try case-insensitive search
      if (userError || !user) {
        const { data: allUsers } = await supabase
          .from('users')
          .select('*')
          .eq('business_id', businessData.id)
          .in('role', ['admin', 'owner']) as { data: UserRow[] | null; error: any };

        if (allUsers) {
          for (const u of allUsers) {
            const dbEmail = (u.email || '').toLowerCase().trim();
            if (dbEmail === normalizedEmailLower) {
              user = u;
              userError = null;
              break;
            }
          }
        }
      }

      if (userError || !user) {
        return NextResponse.json(
          { 
            error: 'Admin user not found for this business. Make sure you are using the email address you registered with.',
          },
          { status: 404 }
        );
      }

      const userData = user as {
        id: string;
        business_id: string;
        email: string;
        phone: string | null;
        name: string;
        role: string;
      };

      // Create response - either redirect or JSON
      let response: NextResponse;
      if (redirectUrl && typeof redirectUrl === 'string') {
        const redirectUrlObj = redirectUrl.startsWith('http') 
          ? new URL(redirectUrl)
          : new URL(redirectUrl, request.url);
        response = NextResponse.redirect(redirectUrlObj);
      } else {
        response = NextResponse.json({
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
      }

      // Set admin session cookie
      const sessionData = JSON.stringify({
        type: 'business_owner',
        userId: userData.id,
        businessId: userData.business_id,
        email: userData.email || '',
        phone: userData.phone || '',
        name: userData.name || 'Business Owner',
        role: userData.role || 'owner',
      });

      const signedSessionData = signCookie(sessionData);
      response.cookies.set('admin_session', signedSessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });
      
      response.cookies.set('is_logged_in', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });

      return response;
    }

    // Handle homepage admin authentication
    if (userType === 'homepage_admin') {
      const supabase = createAdminClient();

      // Search across all businesses for user with matching email (owners only)
      const normalizedEmailLower = normalizedEmail.toLowerCase().trim();
      
      // Try exact match first
      const { data: initialUser, error: initialUserError } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmailLower)
        .eq('role', 'owner')
        .maybeSingle();

      let user: UserRow | null = initialUser;
      let userError = initialUserError;

      // If not found, try case-insensitive search
      if (userError || !user) {
        const { data: allUsers } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'owner') as { data: UserRow[] | null; error: any };

        if (allUsers) {
          for (const u of allUsers) {
            const dbEmail = (u.email || '').toLowerCase().trim();
            if (dbEmail === normalizedEmailLower) {
              user = u;
              userError = null;
              break;
            }
          }
        }
      }

      if (userError || !user) {
        // New user - return success but indicate it's a new user
        return NextResponse.json({
          success: true,
          isNewUser: true,
          message: 'Email verified. Please complete registration.',
        });
      }

      const userData = user as {
        id: string;
        business_id: string;
        email: string;
        phone: string | null;
        name: string;
        role: string;
      };

      // Create response
      const response = NextResponse.json({
        success: true,
        isNewUser: false,
        user: {
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
          name: userData.name,
          role: userData.role,
        },
      });

      // Set admin session cookie
      const sessionData = JSON.stringify({
        type: 'business_owner',
        userId: userData.id,
        businessId: userData.business_id,
        email: userData.email || '',
        phone: userData.phone || '',
        name: userData.name || 'Business Owner',
        role: userData.role || 'owner',
      });

      const signedSessionData = signCookie(sessionData);
      response.cookies.set('admin_session', signedSessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });
      
      response.cookies.set('is_logged_in', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid user type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error verifying email OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify email OTP. Please try again.' },
      { status: 500 }
    );
  }
}




