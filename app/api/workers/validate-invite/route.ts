import { NextRequest, NextResponse } from 'next/server';
import { validateWorkerInvite } from '@/lib/workers/invites';

/**
 * GET /api/workers/validate-invite
 * Validate a worker invite token
 * Query params: invite (token), slug (business slug)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteToken = searchParams.get('invite');
    const businessSlug = searchParams.get('slug');

    if (!inviteToken || !businessSlug) {
      return NextResponse.json(
        { error: 'Invite token and business slug are required' },
        { status: 400 }
      );
    }

    // Validate the invite token
    const inviteData = await validateWorkerInvite(inviteToken, businessSlug);

    if (!inviteData) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 400 }
      );
    }

    // Return worker info (without sensitive data)
    return NextResponse.json({
      success: true,
      worker: {
        id: inviteData.worker.id,
        name: inviteData.worker.name,
        email: inviteData.worker.email,
      },
      business: {
        slug: inviteData.businessSlug,
        name: inviteData.businessName,
      },
    });
  } catch (error: any) {
    console.error('Error validating invite:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite' },
      { status: 500 }
    );
  }
}







