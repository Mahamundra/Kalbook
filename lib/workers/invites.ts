/**
 * Worker invite utilities
 * Handles token generation, validation, and email sending for worker invites
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getBusinessBySlug } from '@/lib/business';
import type { Database } from '@/lib/supabase/database.types';
import { randomBytes } from 'crypto';

type WorkerRow = Database['public']['Tables']['workers']['Row'];

const BREVO_API_KEY = process.env.BREVO_API_KEY;

export interface WorkerInviteData {
  worker: WorkerRow;
  businessSlug: string;
  businessName: string;
}

/**
 * Generate a secure random token for worker invites
 * Uses crypto.randomBytes for cryptographically secure randomness
 */
export function generateInviteToken(): string {
  // Generate 32 random bytes and encode as base64url (URL-safe)
  return randomBytes(32).toString('base64url');
}

/**
 * Validate a worker invite token
 * Returns worker data if valid, null if invalid/expired
 */
export async function validateWorkerInvite(
  inviteToken: string,
  businessSlug: string
): Promise<WorkerInviteData | null> {
  try {
    const supabase = createAdminClient();

    // First, verify the business exists
    const business = await getBusinessBySlug(businessSlug);
    if (!business) {
      return null;
    }

    // Find worker with matching invite token
    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('invite_token', inviteToken)
      .eq('business_id', business.id)
      .single() as { data: WorkerRow | null; error: any };

    if (error || !worker) {
      return null;
    }

    // Check if token has expired
    if (worker.invite_expires_at) {
      const expiresAt = new Date(worker.invite_expires_at);
      const now = new Date();
      if (now > expiresAt) {
        return null; // Token expired
      }
    } else {
      // If no expiry date, token is invalid
      return null;
    }

    // Check if token has already been used (invite_token should be cleared after use)
    // But we check expiry instead, so if it's still here and not expired, it's valid

    return {
      worker,
      businessSlug: business.slug,
      businessName: business.name,
    };
  } catch (error) {
    console.error('Error validating worker invite:', error);
    return null;
  }
}

/**
 * Send worker invite email via Brevo
 */
export async function sendWorkerInviteEmail(
  workerId: string,
  businessId: string,
  businessSlug: string,
  workerName: string,
  workerEmail: string,
  inviteToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY not set, skipping worker invite email');
      return { success: false, error: 'Email service not configured' };
    }

    // Get business name
    const business = await getBusinessBySlug(businessSlug);
    const businessName = business?.name || 'Your Business';

    // Generate invite URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }
    const inviteUrl = `${baseUrl}/b/${businessSlug}/?invite=${inviteToken}`;

    // Create email template
    const emailSubject = `You've been invited to join ${businessName} on KalBook`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Worker Invite</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
    <h1 style="color: #2563eb; margin-top: 0;">Welcome to KalBook!</h1>
    <p>Hello ${workerName},</p>
    <p>You've been invited to join <strong>${businessName}</strong> as a team member on KalBook.</p>
    <p>Click the button below to set up your account and get started:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Set Up My Account</a>
    </div>
    <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
    <p style="font-size: 12px; color: #999; word-break: break-all;">${inviteUrl}</p>
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      <strong>Important:</strong> This invite link will expire in 7 days. Please set up your account soon.
    </p>
    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      If you didn't expect this invite, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated message from KalBook. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
    `.trim();

    // Send email via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'KalBook',
          email: 'noreply@kalbook.com',
        },
        to: [
          {
            email: workerEmail,
            name: workerName,
          },
        ],
        subject: emailSubject,
        htmlContent: emailBody,
        textContent: emailBody.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'), // Strip HTML for text version
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending worker invite email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Invalidate a worker invite token (set to NULL)
 * Called after worker completes account setup
 */
export async function invalidateWorkerInvite(
  workerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { error } = await (supabase
      .from('workers') as any)
      .update({
        invite_token: null,
        invite_expires_at: null,
      })
      .eq('id', workerId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to invalidate invite' };
  }
}

