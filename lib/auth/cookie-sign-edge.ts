// Edge Runtime compatible cookie signing using Web Crypto API
// This version works in Next.js middleware (Edge Runtime)

const SECRET_KEY = process.env.COOKIE_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || 'fallback-secret-key-change-in-production';

/**
 * Sign cookie data to prevent tampering (Edge Runtime compatible)
 */
export async function signCookieEdge(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const messageData = encoder.encode(data);

  // Import key for HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the message
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  // Convert signature to hex string
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${data}.${signatureHex}`;
}

/**
 * Verify and unsign cookie data (Edge Runtime compatible)
 */
export async function unsignCookieEdge(signedData: string): Promise<string | null> {
  // Find the last dot - that's where the signature starts
  // The format is: {data}.{signature}
  // But data (JSON) can contain dots, so we need to find the LAST dot
  const lastDotIndex = signedData.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0 || lastDotIndex === signedData.length - 1) {
    return null;
  }

  const data = signedData.substring(0, lastDotIndex);
  const signature = signedData.substring(lastDotIndex + 1);

  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const messageData = encoder.encode(data);

  // Import key for HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the message to get expected signature
  const expectedSignature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Timing-safe comparison
  if (signature.length !== expectedSignatureHex.length) {
    return null;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignatureHex.charCodeAt(i);
  }

  if (result === 0) {
    return data;
  }

  return null;
}




