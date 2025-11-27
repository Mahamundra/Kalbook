/**
 * Customer communication helper functions
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const USE_MOCK = process.env.USE_MOCK_SMS === 'true' || !TWILIO_ACCOUNT_SID;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

export interface CommunicationLog {
  id: string;
  business_id: string;
  customer_id: string;
  channel: 'sms' | 'whatsapp' | 'email';
  direction: 'inbound' | 'outbound';
  subject?: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Send SMS to customer and log communication
 */
export async function sendCustomerSMS(
  customerId: string,
  businessId: string,
  message: string,
  userId?: string
): Promise<{ success: boolean; error?: string; communicationId?: string }> {
  try {
    const supabase = createAdminClient();

    // Get customer phone
    const customerResult = await supabase
      .from('customers')
      .select('phone, name')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single() as {
      data: { phone: string; name: string } | null;
      error: any;
    };

    if (customerResult.error || !customerResult.data) {
      return { success: false, error: 'Customer not found' };
    }

    const { phone, name } = customerResult.data;

    // Log communication as pending
    const logResult = await supabase
      .from('customer_communications')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        channel: 'sms',
        direction: 'outbound',
        message,
        status: 'pending',
        created_by: userId || null,
      } as never)
      .select()
      .single() as {
      data: CommunicationLog | null;
      error: any;
    };

    if (logResult.error) {
      console.error('Error logging communication:', logResult.error);
    }

    const communicationId = logResult.data?.id;

    // Send SMS via Twilio
    if (USE_MOCK) {
      console.log(`[MOCK SMS] Sending to ${phone}: ${message}`);
      // Update status to sent
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          } as never)
          .eq('id', communicationId);
      }
      return { success: true, communicationId };
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      // Update status to failed
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({ status: 'failed' } as never)
          .eq('id', communicationId);
      }
      return { success: false, error: 'Twilio credentials not configured' };
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
            ).toString('base64')}`,
          },
          body: new URLSearchParams({
            From: TWILIO_PHONE_NUMBER,
            To: phone,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        // Update status to failed
        if (communicationId) {
          await supabase
            .from('customer_communications')
            .update({ status: 'failed' } as never)
            .eq('id', communicationId);
        }
        throw new Error(`Twilio SMS error: ${error}`);
      }

      // Update status to sent
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          } as never)
          .eq('id', communicationId);
      }

      return { success: true, communicationId };
    } catch (error: any) {
      // Update status to failed
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({ status: 'failed' } as never)
          .eq('id', communicationId);
      }
      return { success: false, error: error.message || 'Failed to send SMS' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

/**
 * Send WhatsApp message to customer and log communication
 */
export async function sendCustomerWhatsApp(
  customerId: string,
  businessId: string,
  message: string,
  userId?: string
): Promise<{ success: boolean; error?: string; communicationId?: string }> {
  try {
    const supabase = createAdminClient();

    // Get customer phone
    const customerResult = await supabase
      .from('customers')
      .select('phone, name')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single() as {
      data: { phone: string; name: string } | null;
      error: any;
    };

    if (customerResult.error || !customerResult.data) {
      return { success: false, error: 'Customer not found' };
    }

    const { phone, name } = customerResult.data;

    // Log communication as pending
    const logResult = await supabase
      .from('customer_communications')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        channel: 'whatsapp',
        direction: 'outbound',
        message,
        status: 'pending',
        created_by: userId || null,
      } as never)
      .select()
      .single() as {
      data: CommunicationLog | null;
      error: any;
    };

    if (logResult.error) {
      console.error('Error logging communication:', logResult.error);
    }

    const communicationId = logResult.data?.id;

    // Send WhatsApp via Twilio
    if (USE_MOCK) {
      console.log(`[MOCK WhatsApp] Sending to ${phone}: ${message}`);
      // Update status to sent
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          } as never)
          .eq('id', communicationId);
      }
      return { success: true, communicationId };
    }

    if (
      !TWILIO_ACCOUNT_SID ||
      !TWILIO_AUTH_TOKEN ||
      !TWILIO_WHATSAPP_NUMBER
    ) {
      // Update status to failed
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({ status: 'failed' } as never)
          .eq('id', communicationId);
      }
      return { success: false, error: 'Twilio WhatsApp credentials not configured' };
    }

    try {
      // Format phone for WhatsApp (must include whatsapp: prefix)
      const whatsappPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
      const whatsappFrom = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
        ? TWILIO_WHATSAPP_NUMBER
        : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
            ).toString('base64')}`,
          },
          body: new URLSearchParams({
            From: whatsappFrom,
            To: whatsappPhone,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        // Update status to failed
        if (communicationId) {
          await supabase
            .from('customer_communications')
            .update({ status: 'failed' } as never)
            .eq('id', communicationId);
        }
        throw new Error(`Twilio WhatsApp error: ${error}`);
      }

      // Update status to sent
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          } as never)
          .eq('id', communicationId);
      }

      return { success: true, communicationId };
    } catch (error: any) {
      // Update status to failed
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({ status: 'failed' } as never)
          .eq('id', communicationId);
      }
      return { success: false, error: error.message || 'Failed to send WhatsApp' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send WhatsApp' };
  }
}

/**
 * Send email to customer and log communication
 */
export async function sendCustomerEmail(
  customerId: string,
  businessId: string,
  subject: string,
  body: string,
  userId?: string
): Promise<{ success: boolean; error?: string; communicationId?: string }> {
  try {
    const supabase = createAdminClient();

    // Get customer email
    const customerResult = await supabase
      .from('customers')
      .select('email, name')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single() as {
      data: { email: string | null; name: string } | null;
      error: any;
    };

    if (customerResult.error || !customerResult.data) {
      return { success: false, error: 'Customer not found' };
    }

    const { email, name } = customerResult.data;

    if (!email) {
      return { success: false, error: 'Customer does not have an email address' };
    }

    // Log communication as pending
    const logResult = await supabase
      .from('customer_communications')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        channel: 'email',
        direction: 'outbound',
        subject,
        message: body,
        status: 'pending',
        created_by: userId || null,
      } as never)
      .select()
      .single() as {
      data: CommunicationLog | null;
      error: any;
    };

    if (logResult.error) {
      console.error('Error logging communication:', logResult.error);
    }

    const communicationId = logResult.data?.id;

    // Send email via Brevo
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY not set, skipping email notification');
      // Update status to failed
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({ status: 'failed' } as never)
          .eq('id', communicationId);
      }
      return { success: false, error: 'Email service not configured' };
    }

    try {
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
              email,
              name,
            },
          ],
          subject,
          htmlContent: body,
          textContent: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        // Update status to failed
        if (communicationId) {
          await supabase
            .from('customer_communications')
            .update({ status: 'failed' } as never)
            .eq('id', communicationId);
        }
        throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
      }

      // Update status to sent
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          } as never)
          .eq('id', communicationId);
      }

      return { success: true, communicationId };
    } catch (error: any) {
      // Update status to failed
      if (communicationId) {
        await supabase
          .from('customer_communications')
          .update({ status: 'failed' } as never)
          .eq('id', communicationId);
      }
      return { success: false, error: error.message || 'Failed to send email' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Get communication templates (placeholder - can be enhanced)
 */
export async function getCommunicationTemplates(
  businessId: string,
  channel: 'sms' | 'whatsapp' | 'email'
): Promise<Array<{ id: string; name: string; content: string }>> {
  // TODO: Implement template storage and retrieval
  // For now, return default templates
  return [
    {
      id: 'default',
      name: 'Default',
      content: channel === 'email' 
        ? 'Hello {{name}},\n\n{{message}}\n\nBest regards,\nYour Service Team'
        : 'Hello {{name}}, {{message}}',
    },
  ];
}


