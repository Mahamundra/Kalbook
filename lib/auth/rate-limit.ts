import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';
import { hasRecentOTPRequest } from './otp';

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
 */
export async function hasRecentOTPRequestByIP(ip: string): Promise<boolean> {
  const supabase = createAdminClient();
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

  const recentOtpResult = await supabase
    .from('otp_codes')
    .select('id')
    .eq('ip_address', ip)
    .gte('created_at', thirtySecondsAgo.toISOString())
    .limit(1) as { data: Array<{ id: string }> | null; error: any };

  return !!(recentOtpResult.data && recentOtpResult.data.length > 0);
}

/**
 * Combined rate limiting: check both phone and IP
 */
export async function checkRateLimit(
  phone: string,
  ip: string
): Promise<{ allowed: boolean; reason?: 'phone' | 'ip' }> {
  // Check phone-based rate limit
  const hasRecentPhone = await hasRecentOTPRequest(phone);
  if (hasRecentPhone) {
    return { allowed: false, reason: 'phone' };
  }

  // Check IP-based rate limit
  const hasRecentIP = await hasRecentOTPRequestByIP(ip);
  if (hasRecentIP) {
    return { allowed: false, reason: 'ip' };
  }

  return { allowed: true };
}

