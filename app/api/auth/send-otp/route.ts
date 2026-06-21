import { NextRequest, NextResponse } from 'next/server';
import { apiError, apiErrorFromMessage } from '@/lib/api/responses';
import { parseJsonBody } from '@/lib/api/parse-request-body';
import { sendOtpSchema } from '@/lib/api/validation/schemas';
import { generateOTP, getOTPExpiration, storeOTPCode } from '@/lib/auth/otp';
import { sendOTP } from '@/lib/auth/twilio';
import { toE164Format } from '@/lib/customers/utils';
import { getClientIP, checkRateLimit } from '@/lib/auth/rate-limit';

type Locale = 'en' | 'he' | 'ar' | 'ru';

const RATE_LIMIT_MESSAGES: Record<Locale, string> = {
  en: 'Please wait {seconds} seconds before requesting another code',
  he: 'אנא המתן {seconds} שניות לפני בקשת קוד נוסף',
  ar: 'يرجى الانتظار {seconds} ثانية قبل طلب رمز آخر',
  ru: 'Пожалуйста, подождите {seconds} секунд перед запросом другого кода',
};

const getLocale = (request: NextRequest): Locale => {
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale === 'he' || cookieLocale === 'ar' || cookieLocale === 'ru') {
    return cookieLocale;
  }
  return 'en';
};

/**
 * POST /api/auth/send-otp
 * Send OTP code to phone number
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, sendOtpSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { phone, method } = parsed.data;

    // Convert to E.164 format (required by Twilio and Supabase Auth)
    const e164Phone = toE164Format(phone);
    const clientIP = getClientIP(request);

    // Combined rate limiting (phone + IP)
    const rateLimitCheck = await checkRateLimit(e164Phone, clientIP);
    if (!rateLimitCheck.allowed) {
      const locale = getLocale(request);
      const retryAfter = rateLimitCheck.retryAfter || 30;
      const message = RATE_LIMIT_MESSAGES[locale].replace('{seconds}', retryAfter.toString());
      return apiError('RATE_LIMITED', message, 429, { retryAfter });
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = getOTPExpiration();

    // Store OTP in database (using E.164 format) with IP address
    await storeOTPCode(e164Phone, code, expiresAt, clientIP);

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

