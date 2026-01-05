/**
 * Send email OTP code via Brevo
 */

type Locale = 'en' | 'he' | 'ar' | 'ru';

interface EmailOTPTranslations {
  subject: string;
  greeting: string;
  body: string;
  codeLabel: string;
  expires: string;
  security: string;
  footer: string;
}

const TRANSLATIONS: Record<Locale, EmailOTPTranslations> = {
  en: {
    subject: 'Your KalBook Verification Code',
    greeting: 'Hello,',
    body: 'Use the verification code below to complete your authentication:',
    codeLabel: 'Verification Code',
    expires: 'This code will expire in 10 minutes.',
    security: 'If you didn\'t request this code, you can safely ignore this email.',
    footer: 'This is an automated message from KalBook. Please do not reply to this email.',
  },
  he: {
    subject: 'קוד האימות שלך מ-KalBook',
    greeting: 'שלום,',
    body: 'השתמש בקוד האימות למטה כדי להשלים את האימות שלך:',
    codeLabel: 'קוד אימות',
    expires: 'קוד זה יפוג בעוד 10 דקות.',
    security: 'אם לא ביקשת קוד זה, תוכל להתעלם בבטחה מהאימייל הזה.',
    footer: 'זהו הודעה אוטומטית מ-KalBook. אנא אל תשיב לאימייל זה.',
  },
  ar: {
    subject: 'رمز التحقق الخاص بك من KalBook',
    greeting: 'مرحباً،',
    body: 'استخدم رمز التحقق أدناه لإكمال المصادقة الخاصة بك:',
    codeLabel: 'رمز التحقق',
    expires: 'سينتهي صلاحية هذا الرمز خلال 10 دقائق.',
    security: 'إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
    footer: 'هذه رسالة تلقائية من KalBook. يرجى عدم الرد على هذا البريد الإلكتروني.',
  },
  ru: {
    subject: 'Ваш код подтверждения KalBook',
    greeting: 'Здравствуйте,',
    body: 'Используйте код подтверждения ниже для завершения аутентификации:',
    codeLabel: 'Код подтверждения',
    expires: 'Этот код истечет через 10 минут.',
    security: 'Если вы не запрашивали этот код, вы можете безопасно проигнорировать это письмо.',
    footer: 'Это автоматическое сообщение от KalBook. Пожалуйста, не отвечайте на это письмо.',
  },
};

/**
 * Generate HTML email template for OTP code
 */
function generateOTPEmailTemplate(code: string, translations: EmailOTPTranslations, isRTL: boolean): string {
  const direction = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';
  const codeFontSize = '48px';
  const codeLetterSpacing = '8px';

  return `
<!DOCTYPE html>
<html dir="${direction}" lang="${isRTL ? 'he' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translations.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: ${textAlign}; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">KalBook</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #374151; text-align: ${textAlign};">
                ${translations.greeting}
              </p>
              
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.5; color: #374151; text-align: ${textAlign};">
                ${translations.body}
              </p>
              
              <!-- OTP Code Box -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 30px; background-color: #f9fafb; border-radius: 8px; border: 2px dashed #d1d5db;">
                    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 500; color: #6b7280; text-align: center;">
                      ${translations.codeLabel}
                    </p>
                    <p style="margin: 0; font-size: ${codeFontSize}; font-weight: 700; color: #111827; letter-spacing: ${codeLetterSpacing}; text-align: center; font-family: 'Courier New', monospace;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: ${textAlign};">
                ${translations.expires}
              </p>
              
              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280; text-align: ${textAlign};">
                ${translations.security}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                ${translations.footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of OTP email
 */
function generateOTPEmailText(code: string, translations: EmailOTPTranslations): string {
  return `
${translations.greeting}

${translations.body}

${translations.codeLabel}: ${code}

${translations.expires}

${translations.security}

---
${translations.footer}
  `.trim();
}

/**
 * Send OTP code via email using Brevo API
 */
export async function sendEmailOTP(
  email: string,
  code: string,
  locale: Locale = 'en'
): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey) {
    console.error('[EMAIL OTP] BREVO_API_KEY is not set');
    throw new Error('BREVO_API_KEY environment variable is not set');
  }

  console.log('[EMAIL OTP] Attempting to send email:', {
    to: email,
    locale,
    hasApiKey: !!brevoApiKey,
    apiKeyLength: brevoApiKey?.length,
    apiKeyPrefix: brevoApiKey?.substring(0, 10) + '...',
  });

  const translations = TRANSLATIONS[locale] || TRANSLATIONS.en;
  const isRTL = locale === 'he' || locale === 'ar';
  const htmlContent = generateOTPEmailTemplate(code, translations, isRTL);
  const textContent = generateOTPEmailText(code, translations);

  console.log('[EMAIL OTP] Sending request to Brevo API...');
  
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
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
          },
        ],
        subject: translations.subject,
        htmlContent,
        textContent,
      }),
    });

    console.log('[EMAIL OTP] Brevo API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(async () => {
        const text = await response.text().catch(() => 'Unable to read response');
        return { message: 'Unknown error', rawResponse: text };
      });
      
      console.error('[EMAIL OTP] Brevo API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      
      throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
    }

    // Try to get response body for success confirmation
    try {
      const responseData = await response.json();
      console.log('[EMAIL OTP] Brevo API success response:', responseData);
    } catch (e) {
      // Response might not have JSON body, that's okay
      console.log('[EMAIL OTP] Email sent successfully (no response body)');
    }

    console.log('[EMAIL OTP] Email sent successfully to:', email);
  } catch (error: any) {
    console.error('[EMAIL OTP] Error during email send:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    throw error;
  }
}



