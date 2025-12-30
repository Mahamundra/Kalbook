// Server-only module - uses Node.js crypto
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET_KEY = process.env.COOKIE_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || 'fallback-secret-key-change-in-production';

/**
 * Sign cookie data to prevent tampering
 */
export function signCookie(data: string): string {
  const hmac = createHmac('sha256', SECRET_KEY);
  hmac.update(data);
  const signature = hmac.digest('hex');
  return `${data}.${signature}`;
}

/**
 * Verify and unsign cookie data
 */
export function unsignCookie(signedData: string): string | null {
  // Find the last dot - that's where the signature starts
  // The format is: {data}.{signature}
  // But data (JSON) can contain dots, so we need to find the LAST dot
  const lastDotIndex = signedData.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0 || lastDotIndex === signedData.length - 1) {
    return null;
  }

  const data = signedData.substring(0, lastDotIndex);
  const signature = signedData.substring(lastDotIndex + 1);
  const hmac = createHmac('sha256', SECRET_KEY);
  hmac.update(data);
  const expectedSignature = hmac.digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  if (timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return data;
  }

  return null;
}

