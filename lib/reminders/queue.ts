/**
 * Reminder queue management system
 * Handles scheduling, processing, and cancelling appointment reminders
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { sendAppointmentReminder } from '@/lib/notifications/twilio-reminders';
import type { Database } from '@/lib/supabase/database.types';

type ReminderQueueRow = Database['public']['Tables']['reminder_queue']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

/**
 * Get reminder settings for a business
 */
async function getReminderSettings(businessId: string): Promise<{
  enabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  daysBefore: number[];
  defaultTime: string;
  personalAddition?: string;
  reminderMessage?: string;
}> {
  const supabase = createAdminClient();
  
  const settingsResult = await supabase
    .from('settings')
    .select('notifications')
    .eq('business_id', businessId)
    .maybeSingle() as { data: any | null; error: any };

  const settings = settingsResult.data;
  const reminderSettings = settings?.notifications?.reminders || {};

  return {
    enabled: reminderSettings.enabled !== false, // Default to true
    smsEnabled: reminderSettings.smsEnabled !== false,
    whatsappEnabled: reminderSettings.whatsappEnabled === true,
    daysBefore: reminderSettings.daysBefore || [1], // Default to 1 day before
    defaultTime: reminderSettings.defaultTime || '09:00',
    personalAddition: reminderSettings.personalAddition,
    reminderMessage: reminderSettings.reminderMessage || 
      settings?.notifications?.reminderMessage ||
      'A reminder that you have an appointment for {{service}} on {{date}} at {{time}} with {{worker}}, see you soon!',
  };
}

/**
 * Calculate scheduled time for reminder
 */
function calculateScheduledTime(
  appointmentDate: Date,
  daysBefore: number,
  defaultTime: string
): Date {
  const scheduledDate = new Date(appointmentDate);
  scheduledDate.setDate(scheduledDate.getDate() - daysBefore);
  
  // Parse default time (format: "HH:MM")
  const [hours, minutes] = defaultTime.split(':').map(Number);
  scheduledDate.setHours(hours || 9, minutes || 0, 0, 0);
  
  return scheduledDate;
}

/**
 * Add reminder to queue when appointment is created/updated
 */
export async function scheduleReminders(
  appointmentId: string,
  appointmentDate: Date,
  businessId: string,
  customerId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Check if business can use automated reminders
  const { canUseAutomatedReminders, canUseSMSReminders, canUseWhatsAppReminders } = await import('@/lib/trial/utils');
  const canUseReminders = await canUseAutomatedReminders(businessId);
  
  if (!canUseReminders) {
    console.log(`[Reminders] Business ${businessId} does not have automated reminders enabled`);
    return;
  }

  // Get reminder settings
  const settings = await getReminderSettings(businessId);
  
  if (!settings.enabled) {
    console.log(`[Reminders] Reminders disabled for business ${businessId}`);
    return;
  }

  // Cancel existing reminders for this appointment
  await cancelReminders(appointmentId);

  // Check appointment status
  const appointmentResult = await supabase
    .from('appointments')
    .select('status')
    .eq('id', appointmentId)
    .single() as { data: AppointmentRow | null; error: any };

  if (appointmentResult.error || !appointmentResult.data) {
    console.error('[Reminders] Appointment not found:', appointmentId);
    return;
  }

  if (appointmentResult.data.status !== 'confirmed') {
    console.log(`[Reminders] Appointment ${appointmentId} is not confirmed, skipping reminders`);
    return;
  }

  // Schedule reminders based on daysBefore array
  const remindersToSchedule: Array<{
    scheduled_for: Date;
    reminder_type: 'sms' | 'whatsapp';
    days_before: number;
  }> = [];

  for (const daysBefore of settings.daysBefore) {
    const scheduledTime = calculateScheduledTime(appointmentDate, daysBefore, settings.defaultTime);
    
    // Only schedule if scheduled time is in the future
    if (scheduledTime > new Date()) {
      if (settings.smsEnabled && await canUseSMSReminders(businessId)) {
        remindersToSchedule.push({
          scheduled_for: scheduledTime,
          reminder_type: 'sms',
          days_before: daysBefore,
        });
      }
      
      if (settings.whatsappEnabled && await canUseWhatsAppReminders(businessId)) {
        remindersToSchedule.push({
          scheduled_for: scheduledTime,
          reminder_type: 'whatsapp',
          days_before: daysBefore,
        });
      }
    }
  }

  // Insert reminders into queue
  if (remindersToSchedule.length > 0) {
    const queueItems = remindersToSchedule.map(item => ({
      appointment_id: appointmentId,
      business_id: businessId,
      customer_id: customerId,
      scheduled_for: item.scheduled_for.toISOString(),
      reminder_type: item.reminder_type,
      days_before: item.days_before,
      status: 'pending' as const,
    }));

    const { error } = await supabase
      .from('reminder_queue')
      .insert(queueItems);

    if (error) {
      console.error('[Reminders] Failed to schedule reminders:', error);
      throw error;
    }

    console.log(`[Reminders] Scheduled ${queueItems.length} reminders for appointment ${appointmentId}`);
  }
}

/**
 * Process pending reminders (called by cron job)
 */
export async function processReminderQueue(): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();

  // Get pending reminders that are due
  const { data: pendingReminders, error } = await supabase
    .from('reminder_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now.toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50) as { data: ReminderQueueRow[] | null; error: any };

  if (error) {
    console.error('[Reminders] Failed to fetch pending reminders:', error);
    return;
  }

  if (!pendingReminders || pendingReminders.length === 0) {
    console.log('[Reminders] No pending reminders to process');
    return;
  }

  console.log(`[Reminders] Processing ${pendingReminders.length} reminders`);

  // Process each reminder
  for (const reminder of pendingReminders) {
    try {
      // Check if appointment still exists and is confirmed
      const appointmentResult = await supabase
        .from('appointments')
        .select('status')
        .eq('id', reminder.appointment_id)
        .single() as { data: AppointmentRow | null; error: any };

      if (appointmentResult.error || !appointmentResult.data) {
        // Appointment deleted, cancel reminder
        await supabase
          .from('reminder_queue')
          .update({ status: 'cancelled' })
          .eq('id', reminder.id);
        continue;
      }

      if (appointmentResult.data.status !== 'confirmed') {
        // Appointment cancelled or changed, cancel reminder
        await supabase
          .from('reminder_queue')
          .update({ status: 'cancelled' })
          .eq('id', reminder.id);
        continue;
      }

      // Send reminder
      const result = await sendAppointmentReminder(
        reminder.business_id,
        reminder.appointment_id,
        reminder.reminder_type as 'sms' | 'whatsapp'
      );

      // Update reminder status
      if (result.success) {
        await supabase
          .from('reminder_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);
        
        console.log(`[Reminders] Sent ${reminder.reminder_type} reminder for appointment ${reminder.appointment_id}`);
      } else {
        await supabase
          .from('reminder_queue')
          .update({
            status: 'failed',
            error_message: result.error || 'Unknown error',
          })
          .eq('id', reminder.id);
        
        console.error(`[Reminders] Failed to send reminder ${reminder.id}:`, result.error);
      }
    } catch (error: any) {
      console.error(`[Reminders] Error processing reminder ${reminder.id}:`, error);
      
      // Mark as failed
      await supabase
        .from('reminder_queue')
        .update({
          status: 'failed',
          error_message: error.message || 'Unknown error',
        })
        .eq('id', reminder.id);
    }
  }
}

/**
 * Cancel reminders when appointment is cancelled
 */
export async function cancelReminders(appointmentId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('reminder_queue')
    .update({ status: 'cancelled' })
    .eq('appointment_id', appointmentId)
    .eq('status', 'pending');

  if (error) {
    console.error('[Reminders] Failed to cancel reminders:', error);
    throw error;
  }
}

