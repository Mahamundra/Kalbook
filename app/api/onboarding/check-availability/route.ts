import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { toE164Format } from '@/lib/customers/utils';

/**
 * POST /api/onboarding/check-availability
 * Check if email or phone is already registered (without creating anything)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    const supabase = createAdminClient();

    // Check email if provided
    if (email && typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Check in auth users
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const emailExistsInAuth = existingUsers?.users?.some(
        (u: any) => u.email?.toLowerCase() === normalizedEmail
      );

      if (emailExistsInAuth) {
        return NextResponse.json(
          { 
            available: false, 
            field: 'email',
            error: 'Email address already registered by another user' 
          },
          { status: 200 } // 200 because this is a validation check, not an error
        );
      }

      // Check in users table
      const { data: existingUserByEmail } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUserByEmail) {
        return NextResponse.json(
          { 
            available: false, 
            field: 'email',
            error: 'Email address already registered by another user' 
          },
          { status: 200 }
        );
      }
    }

    // Check phone if provided
    if (phone && typeof phone === 'string') {
      let e164Phone: string | null = null;
      try {
        e164Phone = toE164Format(phone);
        // Validate E.164 format
        if (!e164Phone.startsWith('+') || e164Phone.length < 10) {
          // Invalid format, but don't fail - just skip phone check
          e164Phone = null;
        }
      } catch (error) {
        // Invalid format, skip phone check
        e164Phone = null;
      }

      if (e164Phone) {
        // Check in auth users
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const phoneExistsInAuth = existingUsers?.users?.some(
          (u: any) => u.phone === e164Phone
        );

        if (phoneExistsInAuth) {
          return NextResponse.json(
            { 
              available: false, 
              field: 'phone',
              error: 'Phone number already registered by another user' 
            },
            { status: 200 }
          );
        }

        // Check in users table
        const { data: existingUserByPhone } = await supabase
          .from('users')
          .select('id, phone')
          .eq('phone', e164Phone)
          .maybeSingle();

        if (existingUserByPhone) {
          return NextResponse.json(
            { 
              available: false, 
              field: 'phone',
              error: 'Phone number already registered by another user' 
            },
            { status: 200 }
          );
        }
      }
    }

    // All checks passed - email/phone is available
    return NextResponse.json(
      { available: true },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        available: true, // Default to available on error to not block users
        error: error.message || 'Failed to check availability' 
      },
      { status: 500 }
    );
  }
}












