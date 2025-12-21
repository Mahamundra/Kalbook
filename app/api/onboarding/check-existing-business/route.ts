import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { toE164Format } from '@/lib/customers/utils';

/**
 * POST /api/onboarding/check-existing-business
 * Check if user already has a registered business
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { hasBusiness: false, error: 'Email or phone is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Normalize phone to E.164 format if provided
    let e164Phone: string | null = null;
    if (phone) {
      try {
        e164Phone = toE164Format(phone);
        if (!e164Phone.startsWith('+') || e164Phone.length < 10) {
          e164Phone = null;
        }
      } catch (error) {
        e164Phone = null;
      }
    }

    // Check for existing businesses by email or phone
    let existingUsers: Array<{ business_id: string; role: string }> = [];

    // Check by email if provided
    if (email && typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: usersByEmail } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('email', normalizedEmail)
        .eq('role', 'owner')
        .limit(10);

      if (usersByEmail && usersByEmail.length > 0) {
        existingUsers = [...existingUsers, ...usersByEmail];
      }
    }

    // Check by phone if provided
    if (e164Phone) {
      const { data: usersByPhone } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('phone', e164Phone)
        .eq('role', 'owner')
        .limit(10);

      if (usersByPhone && usersByPhone.length > 0) {
        // Merge with existing users, avoiding duplicates
        const existingBusinessIds = new Set(existingUsers.map(u => u.business_id));
        usersByPhone.forEach(user => {
          if (!existingBusinessIds.has(user.business_id)) {
            existingUsers.push(user);
          }
        });
      }
    }

    // If we found users with businesses, get the business details
    if (existingUsers.length > 0) {
      const businessIds = [...new Set(existingUsers.map(u => u.business_id))];
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, slug, name')
        .in('id', businessIds)
        .limit(10);

      if (businesses && businesses.length > 0) {
        return NextResponse.json({
          hasBusiness: true,
          businesses: businesses,
          // Return first business for redirect
          business: businesses[0],
        });
      }
    }

    // No existing business found
    return NextResponse.json({
      hasBusiness: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        hasBusiness: false, // Default to false on error to not block users
        error: error.message || 'Failed to check existing business' 
      },
      { status: 500 }
    );
  }
}

