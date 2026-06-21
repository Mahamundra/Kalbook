import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';

export type RateLimitReason =
  | 'phone'
  | 'ip'
  | 'phone_hourly'
  | 'ip_hourly';

export interface RateLimitResult {
  allowed: boolean;
  reason?: RateLimitReason;
  retryAfter?: number;
}

export function getOTPRateLimitConfig() {
  return {
    cooldownMs: 30_000,
    phoneHourlyLimit: parseInt(process.env.OTP_MAX_HOURLY_PER_PHONE || '10', 10),
    ipHourlyLimit: parseInt(process.env.OTP_MAX_HOURLY_PER_IP || '20', 10),
    hourlyWindowMs: 60 * 60 * 1000,
  };
}

/**
 * Prefer platform-set headers (Vercel x-real-ip) over client-spoofable x-forwarded-for.
 */
export function getClientIP(request: NextRequest): string {
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  if (request.ip) {
    return request.ip;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return 'unknown';
}

function getRetryAfterSeconds(lastRequestAt: Date, windowMs: number): number {
  const retryAt = lastRequestAt.getTime() + windowMs;
  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

export async function countOTPRequestsByPhoneSince(
  phone: string,
  since: Date
): Promise<number> {
  const supabase = createAdminClient();
  const result = await supabase
    .from('otp_codes')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', since.toISOString()) as { count: number | null; error: unknown };

  if (result.error) {
    return 0;
  }

  return result.count ?? 0;
}

export async function countOTPRequestsByIPSince(ip: string, since: Date): Promise<number> {
  if (ip === 'unknown') {
    return 0;
  }

  const supabase = createAdminClient();
  const result = await supabase
    .from('otp_codes')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', since.toISOString()) as { count: number | null; error: unknown };

  if (result.error) {
    return 0;
  }

  return result.count ?? 0;
}

export async function countEmailOTPRequestsByEmailSince(
  email: string,
  since: Date
): Promise<number> {
  const supabase = createAdminClient();
  const result = await supabase
    .from('otp_codes')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since.toISOString()) as { count: number | null; error: unknown };

  if (result.error) {
    return 0;
  }

  return result.count ?? 0;
}

/**
 * Check if IP has recent OTP request (rate limiting - 30 seconds per IP)
 */
export async function getLastOTPRequestByIP(ip: string): Promise<Date | null> {
  if (ip === 'unknown') {
    return null;
  }

  const supabase = createAdminClient();
  const config = getOTPRateLimitConfig();
  const since = new Date(Date.now() - config.cooldownMs);

  const recentOtpResult = await supabase
    .from('otp_codes')
    .select('created_at')
    .eq('ip_address', ip)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(1) as { data: Array<{ created_at: string }> | null; error: unknown };

  if (recentOtpResult.data && recentOtpResult.data.length > 0) {
    return new Date(recentOtpResult.data[0].created_at);
  }

  return null;
}

async function getLastOTPRequestByPhone(phone: string): Promise<Date | null> {
  const supabase = createAdminClient();
  const config = getOTPRateLimitConfig();
  const since = new Date(Date.now() - config.cooldownMs);

  const recentOtpResult = await supabase
    .from('otp_codes')
    .select('created_at')
    .eq('phone', phone)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(1) as { data: Array<{ created_at: string }> | null; error: unknown };

  if (recentOtpResult.data && recentOtpResult.data.length > 0) {
    return new Date(recentOtpResult.data[0].created_at);
  }

  return null;
}

/**
 * Combined rate limiting: cooldown + hourly caps for phone and IP
 */
export async function checkRateLimit(
  phone: string,
  ip: string
): Promise<RateLimitResult> {
  const config = getOTPRateLimitConfig();
  const hourAgo = new Date(Date.now() - config.hourlyWindowMs);

  if (ip !== 'unknown') {
    const ipHourlyCount = await countOTPRequestsByIPSince(ip, hourAgo);
    if (ipHourlyCount >= config.ipHourlyLimit) {
      return {
        allowed: false,
        reason: 'ip_hourly',
        retryAfter: Math.ceil(config.hourlyWindowMs / 1000),
      };
    }
  }

  const phoneHourlyCount = await countOTPRequestsByPhoneSince(phone, hourAgo);
  if (phoneHourlyCount >= config.phoneHourlyLimit) {
    return {
      allowed: false,
      reason: 'phone_hourly',
      retryAfter: Math.ceil(config.hourlyWindowMs / 1000),
    };
  }

  const lastPhoneRequest = await getLastOTPRequestByPhone(phone);
  if (lastPhoneRequest) {
    return {
      allowed: false,
      reason: 'phone',
      retryAfter: getRetryAfterSeconds(lastPhoneRequest, config.cooldownMs),
    };
  }

  const lastIPRequest = await getLastOTPRequestByIP(ip);
  if (lastIPRequest) {
    return {
      allowed: false,
      reason: 'ip',
      retryAfter: getRetryAfterSeconds(lastIPRequest, config.cooldownMs),
    };
  }

  return { allowed: true };
}

export async function getLastEmailOTPRequest(email: string): Promise<Date | null> {
  const supabase = createAdminClient();
  const config = getOTPRateLimitConfig();
  const since = new Date(Date.now() - config.cooldownMs);

  const recentOtpResult = await supabase
    .from('otp_codes')
    .select('created_at')
    .eq('email', email)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(1) as { data: Array<{ created_at: string }> | null; error: unknown };

  if (recentOtpResult.data && recentOtpResult.data.length > 0) {
    return new Date(recentOtpResult.data[0].created_at);
  }

  return null;
}

export async function checkEmailRateLimit(
  email: string,
  ip: string
): Promise<RateLimitResult> {
  const config = getOTPRateLimitConfig();
  const hourAgo = new Date(Date.now() - config.hourlyWindowMs);

  if (ip !== 'unknown') {
    const ipHourlyCount = await countOTPRequestsByIPSince(ip, hourAgo);
    if (ipHourlyCount >= config.ipHourlyLimit) {
      return {
        allowed: false,
        reason: 'ip_hourly',
        retryAfter: Math.ceil(config.hourlyWindowMs / 1000),
      };
    }
  }

  const emailHourlyCount = await countEmailOTPRequestsByEmailSince(email, hourAgo);
  if (emailHourlyCount >= config.phoneHourlyLimit) {
    return {
      allowed: false,
      reason: 'phone_hourly',
      retryAfter: Math.ceil(config.hourlyWindowMs / 1000),
    };
  }

  const lastEmailRequest = await getLastEmailOTPRequest(email);
  if (lastEmailRequest) {
    return {
      allowed: false,
      reason: 'phone',
      retryAfter: getRetryAfterSeconds(lastEmailRequest, config.cooldownMs),
    };
  }

  const lastIPRequest = await getLastOTPRequestByIP(ip);
  if (lastIPRequest) {
    return {
      allowed: false,
      reason: 'ip',
      retryAfter: getRetryAfterSeconds(lastIPRequest, config.cooldownMs),
    };
  }

  return { allowed: true };
}
