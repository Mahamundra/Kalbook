/**
 * Google Calendar synchronization
 * Handles OAuth, syncing appointments to/from Google Calendar
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type GoogleCalendarTokenRow = Database['public']['Tables']['google_calendar_tokens']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

let googleapis: any = null;

async function getGoogleApis() {
  if (!googleapis) {
    googleapis = await import('googleapis');
  }
  return googleapis;
}

/**
 * Get Google OAuth2 client
 */
async function getOAuth2Client() {
  const { google } = await getGoogleApis();
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Initialize Google OAuth flow
 */
export async function initiateGoogleOAuth(businessId: string): Promise<{ authUrl: string }> {
  const oauth2Client = await getOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: businessId, // Pass businessId in state for callback
    prompt: 'consent', // Force consent to get refresh token
  });

  return { authUrl };
}

/**
 * Handle OAuth callback and store tokens
 */
export async function handleGoogleOAuthCallback(
  businessId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const oauth2Client = await getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return { success: false, error: 'No access token received' };
    }

    const supabase = createAdminClient();

    // Calculate token expiration
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Store or update tokens
    const tokenData = {
      business_id: businessId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: expiresAt.toISOString(),
      calendar_id: 'primary',
      sync_enabled: true,
      last_sync_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('google_calendar_tokens')
      .upsert(tokenData, {
        onConflict: 'business_id',
      });

    if (error) {
      console.error('Error storing Google tokens:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error handling Google OAuth callback:', error);
    return { success: false, error: error.message || 'Failed to handle OAuth callback' };
  }
}

/**
 * Refresh access token if expired
 */
export async function refreshGoogleToken(businessId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    
    const tokenResult = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('business_id', businessId)
      .single() as { data: GoogleCalendarTokenRow | null; error: any };

    if (tokenResult.error || !tokenResult.data) {
      return false;
    }

    const token = tokenResult.data;

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = token.token_expires_at ? new Date(token.token_expires_at) : null;
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (expiresAt && expiresAt.getTime() > now.getTime() + buffer) {
      // Token is still valid
      return true;
    }

    if (!token.refresh_token) {
      console.error('No refresh token available for business:', businessId);
      return false;
    }

    const oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: token.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update stored token
    const newExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: credentials.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId);

    return true;
  } catch (error: any) {
    console.error('Error refreshing Google token:', error);
    return false;
  }
}

/**
 * Get authenticated Google Calendar client
 */
async function getCalendarClient(businessId: string) {
  const { google } = await getGoogleApis();
  const supabase = createAdminClient();

  // Refresh token if needed
  await refreshGoogleToken(businessId);

  // Get tokens
  const tokenResult = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('business_id', businessId)
    .eq('sync_enabled', true)
    .single() as { data: GoogleCalendarTokenRow | null; error: any };

  if (tokenResult.error || !tokenResult.data) {
    throw new Error('Google Calendar not connected or disabled');
  }

  const token = tokenResult.data;
  const oauth2Client = await getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Sync appointment to Google Calendar
 */
export async function syncAppointmentToGoogle(
  appointmentId: string,
  businessId: string
): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
  try {
    // Check if business can use Google Calendar sync
    const { canUseGoogleCalendarSync } = await import('@/lib/trial/utils');
    const canSync = await canUseGoogleCalendarSync(businessId);
    
    if (!canSync) {
      return { success: false, error: 'Google Calendar sync not available for this plan' };
    }

    const supabase = createAdminClient();
    const calendar = await getCalendarClient(businessId);

    // Get appointment with related data
    const appointmentResult = await supabase
      .from('appointments')
      .select(`
        *,
        services (name, description),
        customers (name, phone, email),
        workers (name),
        businesses (name, address)
      `)
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .single() as { data: any | null; error: any };

    if (appointmentResult.error || !appointmentResult.data) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentResult.data;
    const service = appointment.services;
    const customer = appointment.customers;
    const worker = appointment.workers;
    const business = appointment.businesses;

    // Check if already synced
    const syncResult = await supabase
      .from('google_calendar_sync')
      .select('google_event_id')
      .eq('appointment_id', appointmentId)
      .single() as { data: { google_event_id: string } | null; error: any };

    const existingEventId = syncResult.data?.google_event_id;

    // Build event data
    const startDate = new Date(appointment.start);
    const endDate = new Date(appointment.end);

    const event = {
      summary: `${service?.name || 'Appointment'} - ${customer?.name || 'Customer'}`,
      description: `Service: ${service?.name || 'N/A'}\nCustomer: ${customer?.name || 'N/A'}\nWorker: ${worker?.name || 'N/A'}\nPhone: ${customer?.phone || 'N/A'}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: business?.timezone || 'UTC',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: business?.timezone || 'UTC',
      },
      location: business?.address || undefined,
      attendees: customer?.email ? [{ email: customer.email }] : undefined,
    };

    // Get calendar ID
    const tokenResult = await supabase
      .from('google_calendar_tokens')
      .select('calendar_id')
      .eq('business_id', businessId)
      .single() as { data: { calendar_id: string } | null; error: any };

    const calendarId = tokenResult.data?.calendar_id || 'primary';

    let googleEventId: string;

    if (existingEventId) {
      // Update existing event
      const response = await calendar.events.update({
        calendarId,
        eventId: existingEventId,
        requestBody: event,
      });
      googleEventId = response.data.id!;
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });
      googleEventId = response.data.id!;

      // Store sync record
      await supabase
        .from('google_calendar_sync')
        .insert({
          appointment_id: appointmentId,
          business_id: businessId,
          google_event_id: googleEventId,
          sync_direction: 'to_google',
        });
    }

    // Update last synced time
    await supabase
      .from('google_calendar_sync')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId);

    await supabase
      .from('google_calendar_tokens')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('business_id', businessId);

    return { success: true, googleEventId };
  } catch (error: any) {
    console.error('Error syncing to Google Calendar:', error);
    return { success: false, error: error.message || 'Failed to sync to Google Calendar' };
  }
}

/**
 * Delete appointment from Google Calendar
 */
export async function deleteAppointmentFromGoogle(
  appointmentId: string,
  businessId: string
): Promise<{ success: boolean }> {
  try {
    const supabase = createAdminClient();
    const calendar = await getCalendarClient(businessId);

    // Get sync record
    const syncResult = await supabase
      .from('google_calendar_sync')
      .select('google_event_id')
      .eq('appointment_id', appointmentId)
      .single() as { data: { google_event_id: string } | null; error: any };

    if (!syncResult.data?.google_event_id) {
      // Not synced, nothing to delete
      return { success: true };
    }

    const googleEventId = syncResult.data.google_event_id;

    // Get calendar ID
    const tokenResult = await supabase
      .from('google_calendar_tokens')
      .select('calendar_id')
      .eq('business_id', businessId)
      .single() as { data: { calendar_id: string } | null; error: any };

    const calendarId = tokenResult.data?.calendar_id || 'primary';

    // Delete event from Google Calendar
    await calendar.events.delete({
      calendarId,
      eventId: googleEventId,
    });

    // Delete sync record
    await supabase
      .from('google_calendar_sync')
      .delete()
      .eq('appointment_id', appointmentId);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting from Google Calendar:', error);
    // Don't fail if event doesn't exist in Google Calendar
    if (error.code === 404) {
      // Delete sync record anyway
      const supabase = createAdminClient();
      await supabase
        .from('google_calendar_sync')
        .delete()
        .eq('appointment_id', appointmentId);
      return { success: true };
    }
    return { success: false };
  }
}

/**
 * Sync appointment from Google Calendar (when updated externally)
 * This would be called by a webhook handler
 */
export async function syncAppointmentFromGoogle(
  googleEventId: string,
  businessId: string
): Promise<{ success: boolean; appointmentId?: string }> {
  try {
    const supabase = createAdminClient();
    const calendar = await getCalendarClient(businessId);

    // Get sync record
    const syncResult = await supabase
      .from('google_calendar_sync')
      .select('appointment_id')
      .eq('google_event_id', googleEventId)
      .eq('business_id', businessId)
      .single() as { data: { appointment_id: string } | null; error: any };

    if (!syncResult.data) {
      return { success: false };
    }

    const appointmentId = syncResult.data.appointment_id;

    // Get calendar ID
    const tokenResult = await supabase
      .from('google_calendar_tokens')
      .select('calendar_id')
      .eq('business_id', businessId)
      .single() as { data: { calendar_id: string } | null; error: any };

    const calendarId = tokenResult.data?.calendar_id || 'primary';

    // Get event from Google Calendar
    const event = await calendar.events.get({
      calendarId,
      eventId: googleEventId,
    });

    if (!event.data.start?.dateTime || !event.data.end?.dateTime) {
      return { success: false };
    }

    // Update appointment
    await supabase
      .from('appointments')
      .update({
        start: new Date(event.data.start.dateTime).toISOString(),
        end: new Date(event.data.end.dateTime).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    // Update sync record
    await supabase
      .from('google_calendar_sync')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId);

    return { success: true, appointmentId };
  } catch (error: any) {
    console.error('Error syncing from Google Calendar:', error);
    return { success: false };
  }
}

/**
 * Setup webhook for Google Calendar changes
 * Note: This requires a public endpoint and proper webhook verification
 */
export async function setupGoogleCalendarWebhook(
  businessId: string
): Promise<{ success: boolean; channelId?: string }> {
  // This is a placeholder - full webhook setup requires:
  // 1. Public webhook endpoint
  // 2. Webhook verification
  // 3. Channel management
  // Implementation depends on your infrastructure
  
  console.warn('Google Calendar webhook setup not fully implemented');
  return { success: false };
}

