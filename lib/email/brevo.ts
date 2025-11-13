/**
 * Brevo (formerly Sendinblue) email utility
 */

interface UpgradeRequestData {
  businessName: string;
  businessEmail: string;
  currentPlan: string;
  desiredPlan: string;
  message: string;
}

/**
 * Send upgrade request email via Brevo API
 */
export async function sendUpgradeRequestEmail(data: UpgradeRequestData): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const upgradeRequestEmail = process.env.UPGRADE_REQUEST_EMAIL || 'admin@kalbook.com';

  if (!brevoApiKey) {
    throw new Error('BREVO_API_KEY environment variable is not set');
  }

  const emailBody = `
New Upgrade Request

Business Details:
- Business Name: ${data.businessName}
- Contact Email: ${data.businessEmail}
- Current Plan: ${data.currentPlan}
- Desired Plan: ${data.desiredPlan}

Message:
${data.message}

---
This is an automated message from KalBook upgrade system.
  `.trim();

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'KalBook System',
        email: 'noreply@kalbook.com',
      },
      to: [
        {
          email: upgradeRequestEmail,
        },
      ],
      subject: `Upgrade Request - ${data.businessName}`,
      htmlContent: emailBody.replace(/\n/g, '<br>'),
      textContent: emailBody,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
  }
}

