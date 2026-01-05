/**
 * OTP generation and validation utilities
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type OTPCode = Database['public']['Tables']['otp_codes']['Row'];

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate expiration time (10 minutes from now)
 */
export function getOTPExpiration(): Date {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 10);
  return expiration;
}

/**
 * Store OTP code in database
 */
export async function storeOTPCode(
  phone: string,
  code: string,
  expiresAt: Date,
  ipAddress?: string
): Promise<void> {
  const supabase = createAdminClient();

  // Invalidate any existing unverified OTPs for this phone
  await (supabase
    .from('otp_codes') as any)
    .update({ verified: true }) // Mark as verified to invalidate
    .eq('phone', phone)
    .eq('verified', false);

  // Insert new OTP code with IP address and type
  const { error } = await supabase.from('otp_codes').insert({
    phone,
    code,
    expires_at: expiresAt.toISOString(),
    verified: false,
    ip_address: ipAddress || null,
    type: 'phone',
  } as any);

  if (error) {
    throw new Error(`Failed to store OTP code: ${error.message}`);
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTPCode(
  phone: string,
  code: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const otpResult = await supabase
    .from('otp_codes')
    .select('*')
    .eq('phone', phone)
    .eq('code', code)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: OTPCode | null; error: any };
  const { data, error } = otpResult;

  if (error || !data) {
    return false;
  }

  // Mark OTP as verified
  await (supabase
    .from('otp_codes') as any)
    .update({ verified: true })
    .eq('id', data.id);

  return true;
}

/**
 * Clean up expired OTP codes (can be run as a cron job)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const supabase = createAdminClient();

  const deleteResult = await supabase
    .from('otp_codes')
    .delete()
    .lt('expires_at', new Date().toISOString()) as { data: OTPCode[] | null; error: any };
  const { data, error } = deleteResult;

  if (error) {
    throw new Error(`Failed to cleanup OTP codes: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Check if phone has recent OTP request (rate limiting - 30 seconds)
 */
export async function hasRecentOTPRequest(phone: string): Promise<boolean> {
  const supabase = createAdminClient();

  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

  const recentOtpResult = await supabase
    .from('otp_codes')
    .select('id')
    .eq('phone', phone)
    .gte('created_at', thirtySecondsAgo.toISOString())
    .limit(1) as { data: Array<{ id: string }> | null; error: any };
  const { data, error } = recentOtpResult;

  if (error || !data || data.length === 0) {
    return false;
  }

  return true;
}

/**
 * Store email OTP code in database
 */
export async function storeEmailOTPCode(
  email: string,
  code: string,
  expiresAt: Date,
  ipAddress?: string
): Promise<void> {
  const supabase = createAdminClient();

  // Invalidate any existing unverified OTPs for this email
  await (supabase
    .from('otp_codes') as any)
    .update({ verified: true }) // Mark as verified to invalidate
    .eq('email', email)
    .eq('verified', false);

  // Insert new OTP code with IP address
  const { error } = await supabase.from('otp_codes').insert({
    email,
    code,
    expires_at: expiresAt.toISOString(),
    verified: false,
    ip_address: ipAddress || null,
    type: 'email',
  } as any);

  if (error) {
    throw new Error(`Failed to store email OTP code: ${error.message}`);
  }
}

/**
 * Verify email OTP code
 */
export async function verifyEmailOTPCode(
  email: string,
  code: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const otpResult = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: OTPCode | null; error: any };
  const { data, error } = otpResult;

  if (error || !data) {
    return false;
  }

  // Mark OTP as verified
  await (supabase
    .from('otp_codes') as any)
    .update({ verified: true })
    .eq('id', data.id);

  return true;
}

/**
 * Check if email has recent OTP request (rate limiting - 30 seconds)
 */
export async function hasRecentEmailOTPRequest(email: string): Promise<boolean> {
  const supabase = createAdminClient();

  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

  const recentOtpResult = await supabase
    .from('otp_codes')
    .select('id')
    .eq('email', email)
    .gte('created_at', thirtySecondsAgo.toISOString())
    .limit(1) as { data: Array<{ id: string }> | null; error: any };
  const { data, error } = recentOtpResult;

  if (error || !data || data.length === 0) {
    return false;
  }

  return true;
}

/**
 * Clean up expired email OTP codes (can be run as a cron job)
 */
export async function cleanupExpiredEmailOTPs(): Promise<number> {
  const supabase = createAdminClient();

  const deleteResult = await supabase
    .from('otp_codes')
    .delete()
    .eq('type', 'email')
    .lt('expires_at', new Date().toISOString()) as { data: OTPCode[] | null; error: any };
  const { data, error } = deleteResult;

  if (error) {
    throw new Error(`Failed to cleanup email OTP codes: ${error.message}`);
  }

  return data?.length || 0;
}

