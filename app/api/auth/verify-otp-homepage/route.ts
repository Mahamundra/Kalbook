import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPCode } from '@/lib/auth/otp';
import { createAdminClient } from '@/lib/supabase/admin';
import { toE164Format } from '@/lib/customers/utils';
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

    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'No business owner account found with this phone number. Only business owners can login from the homepage. If you have not user yet, please create a new business.',
        },
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
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error verifying OTP for homepage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}

