import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { sendCustomerEmail } from '@/lib/customers/communications';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/customers/[id]/send-email
 * Send email to customer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const customerId = params.id;
    const body = await request.json();
    const { subject, body: emailBody } = body;

    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!emailBody || typeof emailBody !== 'string' || emailBody.trim() === '') {
      return NextResponse.json(
        { error: 'Email body is required' },
        { status: 400 }
      );
    }

    // Get user ID from session
    const session = await getSession();
    const userId = session?.user?.id;

    // Send email
    const result = await sendCustomerEmail(
      customerId,
      tenantInfo.businessId,
      subject.trim(),
      emailBody.trim(),
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      communicationId: result.communicationId,
      message: 'Email sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}


