import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, getOTPExpiration, storeOTPCode, hasRecentOTPRequest } from '@/lib/auth/otp';
import { sendOTP } from '@/lib/auth/twilio';
import { toE164Format } from '@/lib/customers/utils';

/**
 * POST /api/auth/send-otp
 * Send OTP code to phone number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, method = 'whatsapp', userType = 'customer' } = body;

    // Validate phone number
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Convert to E.164 format (required by Twilio and Supabase Auth)
    const e164Phone = toE164Format(phone);

    // Rate limiting: check if there's a recent request
    const hasRecent = await hasRecentOTPRequest(e164Phone);
    if (hasRecent) {
      return NextResponse.json(
        { error: 'Please wait before requesting another code' },
        { status: 429 }
      );
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = getOTPExpiration();

    // Store OTP in database (using E.164 format)
    await storeOTPCode(e164Phone, code, expiresAt);

    // Send OTP via Twilio
    try {
      await sendOTP(e164Phone, code, method as 'sms' | 'whatsapp');
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // In development/mock mode, log the code
      if (process.env.USE_MOCK_SMS === 'true') {
        console.log(`[DEV MODE] OTP code for ${e164Phone}: ${code}`);
      } else {
        return NextResponse.json(
          { error: 'Failed to send OTP. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Note: Business owners no longer require email for OTP-based login

    return NextResponse.json({
      success: true,
      message: 'OTP code sent successfully',
      // In development, return the code for testing
      ...(process.env.NODE_ENV === 'development' && { code }),
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}

