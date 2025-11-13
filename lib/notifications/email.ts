/**
 * Email notification functions for appointment-related events
 */

interface AppointmentDetails {
  serviceName: string;
  workerName: string;
  oldDate?: Date;
  newDate?: Date;
  appointmentDate?: Date;
}

/**
 * Send reschedule approval email to customer
 */
export async function sendRescheduleApprovalEmail(
  customerEmail: string,
  customerName: string,
  appointmentDetails: AppointmentDetails
): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  
  if (!brevoApiKey) {
    console.warn('BREVO_API_KEY not set, skipping email notification');
    return;
  }

  const { serviceName, workerName, oldDate, newDate } = appointmentDetails;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const emailSubject = 'Your Appointment Reschedule Request Has Been Approved';
  
  const emailBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0EA5E9;">Appointment Reschedule Approved</h2>
          <p>Dear ${customerName},</p>
          <p>Your request to reschedule your appointment has been approved.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Worker:</strong> ${workerName}</p>
            ${oldDate ? `<p><strong>Original Date:</strong> ${formatDate(oldDate)}</p>` : ''}
            ${newDate ? `<p><strong>New Date:</strong> ${formatDate(newDate)}</p>` : ''}
          </div>
          <p>We look forward to seeing you at your new appointment time!</p>
          <p>Best regards,<br>Your Service Team</p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Appointment Reschedule Approved

Dear ${customerName},

Your request to reschedule your appointment has been approved.

Service: ${serviceName}
Worker: ${workerName}
${oldDate ? `Original Date: ${formatDate(oldDate)}` : ''}
${newDate ? `New Date: ${formatDate(newDate)}` : ''}

We look forward to seeing you at your new appointment time!

Best regards,
Your Service Team
  `.trim();

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
            email: customerEmail,
            name: customerName,
          },
        ],
        subject: emailSubject,
        htmlContent: emailBody,
        textContent: textBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending reschedule approval email:', error);
    throw error;
  }
}

/**
 * Send reschedule rejection email to customer
 */
export async function sendRescheduleRejectionEmail(
  customerEmail: string,
  customerName: string,
  appointmentDetails: AppointmentDetails,
  rejectionMessage: string
): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  
  if (!brevoApiKey) {
    console.warn('BREVO_API_KEY not set, skipping email notification');
    return;
  }

  const { serviceName, workerName, appointmentDate } = appointmentDetails;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const emailSubject = 'Your Appointment Reschedule Request';
  
  const emailBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0EA5E9;">Appointment Reschedule Request</h2>
          <p>Dear ${customerName},</p>
          <p>${rejectionMessage}</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Worker:</strong> ${workerName}</p>
            ${appointmentDate ? `<p><strong>Appointment Date:</strong> ${formatDate(appointmentDate)}</p>` : ''}
          </div>
          <p>If you cannot make it to your appointment, please cancel it so we can offer the time slot to another customer.</p>
          <p>Best regards,<br>Your Service Team</p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Appointment Reschedule Request

Dear ${customerName},

${rejectionMessage}

Service: ${serviceName}
Worker: ${workerName}
${appointmentDate ? `Appointment Date: ${formatDate(appointmentDate)}` : ''}

If you cannot make it to your appointment, please cancel it so we can offer the time slot to another customer.

Best regards,
Your Service Team
  `.trim();

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
            email: customerEmail,
            name: customerName,
          },
        ],
        subject: emailSubject,
        htmlContent: emailBody,
        textContent: textBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending reschedule rejection email:', error);
    throw error;
  }
}

