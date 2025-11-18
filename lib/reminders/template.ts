/**
 * Template processing for reminder messages
 */

export interface AppointmentTemplateData {
  serviceName: string;
  date: Date;
  time: string;
  workerName: string;
  businessName: string;
  personalAddition?: string;
}

/**
 * Process reminder template with appointment data
 */
export function processReminderTemplate(
  template: string,
  appointment: AppointmentTemplateData,
  locale: string = 'en'
): string {
  // Format date based on locale
  const dateStr = appointment.date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format time
  const timeStr = appointment.time || appointment.date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Replace template variables
  let message = template
    .replace(/\{\{service\}\}/g, appointment.serviceName)
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{time\}\}/g, timeStr)
    .replace(/\{\{worker\}\}/g, appointment.workerName)
    .replace(/\{\{business\}\}/g, appointment.businessName);

  // Add personal addition if provided
  if (appointment.personalAddition) {
    message += `\n\n${appointment.personalAddition}`;
  }

  return message;
}

