import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection remote address
  return request.ip || 'unknown';
}

/**
 * Check if IP has recent OTP request (rate limiting - 30 seconds per IP)
 * Returns the timestamp of the last request if found, null otherwise
 */
export async function getLastOTPRequestByIP(ip: string): Promise<Date | null> {
  const supabase = createAdminClient();
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

  const recentOtpResult = await supabase
    .from('otp_codes')
    .select('created_at')
    .eq('ip_address', ip)
    .gte('created_at', thirtySecondsAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1) as { data: Array<{ created_at: string }> | null; error: any };

  if (recentOtpResult.data && recentOtpResult.data.length > 0) {
    return new Date(recentOtpResult.data[0].created_at);
  }

  return null;
}

/**
 * Combined rate limiting: check both phone and IP
 * Returns retryAfter in seconds if rate limited
 */
export async function checkRateLimit(
  phone: string,
  ip: string
): Promise<{ allowed: boolean; reason?: 'phone' | 'ip'; retryAfter?: number }> {
  // Check phone-based rate limit
  const lastPhoneRequest = await getLastOTPRequestByPhone(phone);
  if (lastPhoneRequest) {
    const retryAfter = Math.ceil((lastPhoneRequest.getTime() + 30 * 1000 - Date.now()) / 1000);
    return { allowed: false, reason: 'phone', retryAfter: Math.max(0, retryAfter) };
  }

  // Check IP-based rate limit
  const lastIPRequest = await getLastOTPRequestByIP(ip);
  if (lastIPRequest) {
    const retryAfter = Math.ceil((lastIPRequest.getTime() + 30 * 1000 - Date.now()) / 1000);
    return { allowed: false, reason: 'ip', retryAfter: Math.max(0, retryAfter) };
  }

  return { allowed: true };
}

/**
 * Get last OTP request timestamp for phone (used by checkRateLimit)
 */
async function getLastOTPRequestByPhone(phone: string): Promise<Date | null> {
  const supabase = createAdminClient();
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

  const recentOtpResult = await supabase
    .from('otp_codes')
    .select('created_at')
    .eq('phone', phone)
    .gte('created_at', thirtySecondsAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1) as { data: Array<{ created_at: string }> | null; error: any };

  if (recentOtpResult.data && recentOtpResult.data.length > 0) {
    return new Date(recentOtpResult.data[0].created_at);
  }

  return null;
}

