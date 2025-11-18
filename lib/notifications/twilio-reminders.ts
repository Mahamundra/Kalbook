/**
 * Twilio integration for appointment reminders (SMS/WhatsApp)
 * Extends the OTP functionality for reminder messages
 */

import { sendOTPSMS, sendOTPWhatsApp } from '@/lib/auth/twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const USE_MOCK = process.env.USE_MOCK_SMS === 'true' || !TWILIO_ACCOUNT_SID;

export interface AppointmentReminderDetails {
  serviceName: string;
  date: Date;
  workerName: string;
  businessName: string;
  personalMessage?: string;
}

/**
 * Send appointment reminder via SMS using Twilio
 */
export async function sendReminderSMS(
  phone: string,
  appointmentDetails: AppointmentReminderDetails,
  template?: string
): Promise<void> {
  if (USE_MOCK) {
    console.log(`[MOCK SMS] Sending reminder to ${phone}:`, appointmentDetails);
    return;
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  // Format date and time
  const dateStr = appointmentDetails.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = appointmentDetails.date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build message from template or default
  let message = template || 
    `Reminder: You have an appointment for ${appointmentDetails.serviceName} on ${dateStr} at ${timeStr} with ${appointmentDetails.workerName}. See you soon!`;

  // Replace template variables
  message = message
    .replace(/\{\{service\}\}/g, appointmentDetails.serviceName)
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{time\}\}/g, timeStr)
    .replace(/\{\{worker\}\}/g, appointmentDetails.workerName)
    .replace(/\{\{business\}\}/g, appointmentDetails.businessName);

  // Add personal message if provided
  if (appointmentDetails.personalMessage) {
    message += `\n\n${appointmentDetails.personalMessage}`;
  }

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
    throw new Error(`Twilio SMS error: ${error}`);
  }
}

/**
 * Send appointment reminder via WhatsApp using Twilio
 */
export async function sendReminderWhatsApp(
  phone: string,
  appointmentDetails: AppointmentReminderDetails,
  template?: string
): Promise<void> {
  if (USE_MOCK) {
    console.log(`[MOCK WhatsApp] Sending reminder to ${phone}:`, appointmentDetails);
    return;
  }

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_WHATSAPP_NUMBER
  ) {
    throw new Error('Twilio WhatsApp credentials not configured');
  }

  // Format phone for WhatsApp (must include whatsapp: prefix)
  const whatsappPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
  const whatsappFrom = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_NUMBER
    : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

  // Format date and time
  const dateStr = appointmentDetails.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = appointmentDetails.date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build message from template or default
  let message = template || 
    `Reminder: You have an appointment for ${appointmentDetails.serviceName} on ${dateStr} at ${timeStr} with ${appointmentDetails.workerName}. See you soon!`;

  // Replace template variables
  message = message
    .replace(/\{\{service\}\}/g, appointmentDetails.serviceName)
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{time\}\}/g, timeStr)
    .replace(/\{\{worker\}\}/g, appointmentDetails.workerName)
    .replace(/\{\{business\}\}/g, appointmentDetails.businessName);

  // Add personal message if provided
  if (appointmentDetails.personalMessage) {
    message += `\n\n${appointmentDetails.personalMessage}`;
  }

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
    throw new Error(`Twilio WhatsApp error: ${error}`);
  }
}

/**
 * Send reminder via preferred method (check business settings)
 */
export async function sendAppointmentReminder(
  businessId: string,
  appointmentId: string,
  reminderType: 'sms' | 'whatsapp'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // Fetch appointment with related data
    const appointmentResult = await supabase
      .from('appointments')
      .select(`
        *,
        services (name),
        customers (name, phone),
        workers (name),
        businesses (name)
      `)
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .single() as { data: any | null; error: any };

    if (appointmentResult.error || !appointmentResult.data) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentResult.data;
    const customer = appointment.customers;
    const service = appointment.services;
    const worker = appointment.workers;
    const business = appointment.businesses;

    if (!customer?.phone) {
      return { success: false, error: 'Customer phone number not found' };
    }

    // Get reminder settings
    const settingsResult = await supabase
      .from('settings')
      .select('notifications')
      .eq('business_id', businessId)
      .single() as { data: any | null; error: any };

    const settings = settingsResult.data;
    const reminderSettings = settings?.notifications?.reminders || {};
    const reminderMessage = reminderSettings.reminderMessage || 
      settings?.notifications?.reminderMessage ||
      'A reminder that you have an appointment for {{service}} on {{date}} at {{time}} with {{worker}}, see you soon!';

    const appointmentDetails: AppointmentReminderDetails = {
      serviceName: service?.name || 'Service',
      date: new Date(appointment.start),
      workerName: worker?.name || 'Staff',
      businessName: business?.name || 'Business',
      personalMessage: reminderSettings.personalAddition,
    };

    if (reminderType === 'whatsapp') {
      await sendReminderWhatsApp(customer.phone, appointmentDetails, reminderMessage);
    } else {
      await sendReminderSMS(customer.phone, appointmentDetails, reminderMessage);
    }

    // Update reminder status in appointment
    await supabase
      .from('appointments')
      .update({
        reminder_sent_at: new Date().toISOString(),
        reminder_status: 'sent',
      })
      .eq('id', appointmentId);

    return { success: true };
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    return { success: false, error: error.message || 'Failed to send reminder' };
  }
}

