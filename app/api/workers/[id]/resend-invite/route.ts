import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { generateInviteToken, sendWorkerInviteEmail } from '@/lib/workers/invites';
import type { Database } from '@/lib/supabase/database.types';

type WorkerRow = Database['public']['Tables']['workers']['Row'];

/**
 * POST /api/workers/[id]/resend-invite
 * Resend invite email to a pending worker
 * Rate limited to 1 invite per 24 hours
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const workerId = params.id;
    const supabase = createAdminClient();

    // Get worker details
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: WorkerRow | null; error: any };

    if (workerError || !worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Check if worker is pending (not active)
    if (worker.active) {
      return NextResponse.json(
        { error: 'Cannot resend invite to active worker' },
        { status: 400 }
      );
    }

    // Check if worker has email
    if (!worker.email) {
      return NextResponse.json(
        { error: 'Worker does not have an email address' },
        { status: 400 }
      );
    }

    // Rate limiting: Check if invite was sent within last 24 hours
    if (worker.last_invite_sent_at) {
      const lastSent = new Date(worker.last_invite_sent_at);
      const now = new Date();
      const hoursSinceLastInvite = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastInvite < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastInvite);
        return NextResponse.json(
          { 
            error: `Please wait ${hoursRemaining} hour(s) before resending the invite`,
            hoursRemaining,
            canResendAt: new Date(lastSent.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          },
          { status: 429 } // Too Many Requests
        );
      }
    }

    // Generate new invite token
    const inviteToken = generateInviteToken();
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days from now

    // Update worker with new invite token and timestamp
    const { error: updateError } = await supabase
      .from('workers')
      .update({
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt.toISOString(),
        last_invite_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', workerId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update worker invite' },
        { status: 500 }
      );
    }

    // Send invite email
    if (tenantInfo.businessSlug) {
      const emailResult = await sendWorkerInviteEmail(
        workerId,
        tenantInfo.businessId,
        tenantInfo.businessSlug,
        worker.name,
        worker.email,
        inviteToken
      );

      if (!emailResult.success) {
        // Log error but don't fail - invite token was updated
        console.error('Failed to send resend invite email:', emailResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invite resent successfully',
    });
  } catch (error: any) {
    console.error('Error resending invite:', error);
    return NextResponse.json(
      { error: 'Failed to resend invite' },
      { status: 500 }
    );
  }
}

