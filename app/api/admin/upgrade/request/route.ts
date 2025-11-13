import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { sendUpgradeRequestEmail } from '@/lib/email/brevo';
import { getBusinessPlan } from '@/lib/trial/utils';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/upgrade/request
 * Submit upgrade request and send email via Brevo
 */
export async function POST(request: NextRequest) {
  try {
    const tenantInfo = await getTenantInfoFromRequest(request);

    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { desiredPlan, message, contactEmail } = body;

    if (!desiredPlan) {
      return NextResponse.json(
        { error: 'Desired plan is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get business info
    const businessResult = await supabase
      .from('businesses')
      .select('name, email')
      .eq('id', tenantInfo.businessId)
      .single() as { data: BusinessRow | null; error: any };

    if (businessResult.error || !businessResult.data) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const business = businessResult.data;
    const currentPlan = await getBusinessPlan(tenantInfo.businessId);

    // Send email via Brevo
    await sendUpgradeRequestEmail({
      businessName: business.name,
      businessEmail: contactEmail || business.email || 'No email provided',
      currentPlan: currentPlan?.name || 'No plan',
      desiredPlan,
      message: message || 'No message provided',
    });

    return NextResponse.json({
      success: true,
      message: 'Upgrade request submitted successfully. We will contact you soon.',
    });
  } catch (error: any) {
    console.error('Error submitting upgrade request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit upgrade request' },
      { status: 500 }
    );
  }
}

