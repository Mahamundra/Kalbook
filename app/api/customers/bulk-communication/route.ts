import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { sendCustomerSMS, sendCustomerWhatsApp, sendCustomerEmail } from '@/lib/customers/communications';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/customers/bulk-communication
 * Send SMS/WhatsApp/Email to multiple customers
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { customerIds, channel, message, subject } = body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: 'Customer IDs are required' },
        { status: 400 }
      );
    }

    if (!channel || !['sms', 'whatsapp', 'email'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be "sms", "whatsapp", or "email"' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (channel === 'email' && (!subject || typeof subject !== 'string' || subject.trim() === '')) {
      return NextResponse.json(
        { error: 'Subject is required for email' },
        { status: 400 }
      );
    }

    // Get user ID from session
    const session = await getSession();
    const userId = session?.user?.id;

    const results = {
      total: customerIds.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ customerId: string; error: string }>,
    };

    // Send communication to each customer
    for (const customerId of customerIds) {
      try {
        let result;
        if (channel === 'sms') {
          result = await sendCustomerSMS(customerId, tenantInfo.businessId, message.trim(), userId);
        } else if (channel === 'whatsapp') {
          result = await sendCustomerWhatsApp(customerId, tenantInfo.businessId, message.trim(), userId);
        } else {
          result = await sendCustomerEmail(customerId, tenantInfo.businessId, subject!.trim(), message.trim(), userId);
        }

        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            customerId,
            error: result.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          customerId,
          error: error.message || 'Failed to send communication',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Error sending bulk communication:', error);
    return NextResponse.json(
      { error: 'Failed to send bulk communication' },
      { status: 500 }
    );
  }
}


