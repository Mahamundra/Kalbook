import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, getOTPExpiration, storeEmailOTPCode } from '@/lib/auth/otp';
import { sendEmailOTP } from '@/lib/auth/email-otp';
import { getClientIP, checkEmailRateLimit } from '@/lib/auth/rate-limit';

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
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * POST /api/auth/send-email-otp
 * Send OTP code to email address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userType = 'customer' } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    const clientIP = getClientIP(request);

    // Combined rate limiting (email + IP)
    let rateLimitCheck;
    try {
      rateLimitCheck = await checkEmailRateLimit(normalizedEmail, clientIP);
    } catch (rateLimitError: any) {
      console.error('Rate limit check failed:', rateLimitError);
      // If rate limit check fails (e.g., database migration not run), continue anyway in dev mode
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Rate limit check failed: ${rateLimitError?.message || 'Database error'}`);
      }
      console.warn('[DEV MODE] Rate limit check failed, continuing anyway');
      rateLimitCheck = { allowed: true };
    }
    
    if (!rateLimitCheck.allowed) {
      const locale = getLocale(request);
      const retryAfter = rateLimitCheck.retryAfter || 30;
      const message = RATE_LIMIT_MESSAGES[locale].replace('{seconds}', retryAfter.toString());
      return NextResponse.json(
        { 
          error: message,
          retryAfter: retryAfter
        },
        { status: 429 }
      );
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = getOTPExpiration();

    // Store OTP in database with IP address
    try {
      await storeEmailOTPCode(normalizedEmail, code, expiresAt, clientIP);
    } catch (dbError: any) {
      console.error('Failed to store email OTP in database:', dbError);
      // If database error, still try to send email (for development)
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database error: ${dbError?.message || 'Failed to store OTP'}`);
      }
      console.warn('[DEV MODE] Continuing despite database error');
    }

    // Send OTP via email
    try {
      const locale = getLocale(request);
      await sendEmailOTP(normalizedEmail, code, locale);
    } catch (error) {
      console.error('Failed to send email OTP:', error);
      // In development mode, log the code
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV MODE] Email OTP code for ${normalizedEmail}: ${code}`);
      }
      // Still return success in dev mode, but error in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Failed to send email OTP. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTP code sent successfully',
      // In development, return the code for testing
      ...(process.env.NODE_ENV === 'development' && { code }),
    });
  } catch (error: any) {
    console.error('Error sending email OTP:', error);
    // Log more details for debugging
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { 
        error: 'Failed to send email OTP. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

