import { NextRequest, NextResponse } from 'next/server';
import { syncAppointmentFromGoogle } from '@/lib/calendar/google-sync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/calendar/google/webhook
 * Handle incoming webhooks from Google Calendar
 * Note: This requires proper webhook verification and channel setup
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (Google Calendar webhook verification)
    // This is a simplified version - full implementation requires:
    // 1. Verify X-Goog-Channel-Token header
    // 2. Verify X-Goog-Channel-ID header
    // 3. Handle sync token for incremental sync

    const body = await request.json();
    
    // Google Calendar sends notifications in this format
    // For now, we'll log and acknowledge
    // Full implementation would:
    // 1. Extract event ID from notification
    // 2. Find business by channel ID
    // 3. Sync appointment from Google Calendar

    console.log('[Google Calendar Webhook] Received notification:', body);

    // Acknowledge the webhook
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Google Calendar Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/google/webhook
 * Handle webhook verification (Google Calendar sends GET request to verify endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    // Google Calendar sends a GET request with challenge parameter
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('challenge');

    if (challenge) {
      // Return the challenge to verify the webhook endpoint
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json({ message: 'Webhook endpoint active' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to verify webhook' },
      { status: 500 }
    );
  }
}

