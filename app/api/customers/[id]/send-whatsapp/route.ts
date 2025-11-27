import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { sendCustomerWhatsApp } from '@/lib/customers/communications';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/customers/[id]/send-whatsapp
 * Send WhatsApp message to customer
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
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get user ID from session
    const session = await getSession();
    const userId = session?.user?.id;

    // Send WhatsApp
    const result = await sendCustomerWhatsApp(
      customerId,
      tenantInfo.businessId,
      message.trim(),
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send WhatsApp' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      communicationId: result.communicationId,
      message: 'WhatsApp message sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp' },
      { status: 500 }
    );
  }
}


