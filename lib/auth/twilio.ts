/**
 * Twilio integration for SMS/WhatsApp OTP delivery
 * Includes mock mode for development
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const USE_MOCK = process.env.USE_MOCK_SMS === 'true' || !TWILIO_ACCOUNT_SID;

/**
 * Send OTP via SMS using Twilio
 */
export async function sendOTPSMS(phone: string, code: string): Promise<void> {
  if (USE_MOCK) {
    console.log(`[MOCK SMS] Sending OTP ${code} to ${phone}`);
    return;
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  const message = `Your verification code is: ${code}. Valid for 10 minutes.`;

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
 * Send OTP via WhatsApp using Twilio
 */
export async function sendOTPWhatsApp(
  phone: string,
  code: string
): Promise<void> {
  if (USE_MOCK) {
    console.log(`[MOCK WhatsApp] Sending OTP ${code} to ${phone}`);
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

  const message = `Your verification code is: ${code}. Valid for 10 minutes.`;

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
 * Send OTP via preferred method (WhatsApp preferred, falls back to SMS)
 */
export async function sendOTP(
  phone: string,
  code: string,
  preferredMethod: 'sms' | 'whatsapp' = 'whatsapp'
): Promise<void> {
  try {
    if (preferredMethod === 'whatsapp') {
      await sendOTPWhatsApp(phone, code);
    } else {
      await sendOTPSMS(phone, code);
    }
  } catch (error) {
    // If WhatsApp fails, try SMS as fallback
    if (preferredMethod === 'whatsapp') {
      console.warn('WhatsApp failed, falling back to SMS:', error);
      await sendOTPSMS(phone, code);
    } else {
      throw error;
    }
  }
}

