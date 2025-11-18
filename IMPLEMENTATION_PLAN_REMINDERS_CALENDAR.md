# Implementation Plan: Automated Reminders & Google Calendar Sync

## Overview

This document outlines the implementation plan for three high-priority features:
1. **Automated SMS/WhatsApp Reminders** (using Twilio)
2. **Google Calendar Sync** (bidirectional)
3. **Reminder Customization** (time, days before, personal addition)

---

## 1. Automated SMS/WhatsApp Reminders

### 1.1 Database Schema Changes

**Location**: `supabase/migrations/006_add_reminders_system.sql`

**New Tables/Columns Needed**:

```sql
-- Add reminder settings to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_status TEXT CHECK (reminder_status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending';

-- Create reminder_queue table for scheduled reminders
CREATE TABLE IF NOT EXISTS reminder_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL, -- When to send the reminder
    reminder_type TEXT CHECK (reminder_type IN ('sms', 'whatsapp', 'email')) NOT NULL,
    days_before INTEGER NOT NULL, -- 1 or 2 days before appointment
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_reminder_queue_scheduled_for ON reminder_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_reminder_queue_appointment_id ON reminder_queue(appointment_id);
CREATE INDEX idx_reminder_queue_business_id ON reminder_queue(business_id);
```

**Update Settings Schema**:

```sql
-- Add reminder preferences to settings.notifications JSONB
-- Structure:
-- {
--   "reminders": {
--     "enabled": true,
--     "smsEnabled": true,
--     "whatsappEnabled": true,
--     "daysBefore": [1, 2], // Can send 1 day and/or 2 days before
--     "defaultTime": "09:00", // Default time to send reminders
--     "personalAddition": "" // Optional personal message to add
--   }
-- }
```

### 1.2 Extend Twilio Library

**Location**: `lib/auth/twilio.ts` → Extend to `lib/notifications/twilio-reminders.ts`

**New Functions Needed**:

```typescript
// lib/notifications/twilio-reminders.ts

/**
 * Send appointment reminder via SMS
 */
export async function sendReminderSMS(
  phone: string,
  appointmentDetails: {
    serviceName: string;
    date: Date;
    workerName: string;
    businessName: string;
    personalMessage?: string;
  },
  template?: string
): Promise<void>

/**
 * Send appointment reminder via WhatsApp
 */
export async function sendReminderWhatsApp(
  phone: string,
  appointmentDetails: {
    serviceName: string;
    date: Date;
    workerName: string;
    businessName: string;
    personalMessage?: string;
  },
  template?: string
): Promise<void>

/**
 * Send reminder via preferred method (check business settings)
 */
export async function sendAppointmentReminder(
  businessId: string,
  appointmentId: string,
  reminderType: 'sms' | 'whatsapp'
): Promise<{ success: boolean; error?: string }>
```

### 1.3 Reminder Queue Management

**Location**: `lib/reminders/queue.ts` (NEW FILE)

**Functions Needed**:

```typescript
/**
 * Add reminder to queue when appointment is created/updated
 */
export async function scheduleReminders(
  appointmentId: string,
  appointmentDate: Date,
  businessId: string,
  customerId: string
): Promise<void>

/**
 * Process pending reminders (called by cron job)
 */
export async function processReminderQueue(): Promise<void>

/**
 * Cancel reminders when appointment is cancelled
 */
export async function cancelReminders(appointmentId: string): Promise<void>
```

### 1.4 Integration Points

#### A. When Appointment is Created

**Location**: `app/api/appointments/route.ts` (POST handler)

**After line 464** (after appointment is created):

```typescript
// Schedule reminders for the new appointment
if (newAppointment && status === 'confirmed') {
  try {
    const { scheduleReminders } = await import('@/lib/reminders/queue');
    await scheduleReminders(
      newAppointment.id,
      new Date(newAppointment.start),
      tenantInfo.businessId,
      body.customerId
    );
  } catch (error) {
    // Log error but don't fail appointment creation
    console.error('Failed to schedule reminders:', error);
  }
}
```

#### B. When Appointment is Updated

**Location**: `app/api/appointments/[id]/route.ts` (PATCH handler)

**After line 250** (after appointment is updated):

```typescript
// Reschedule reminders if appointment time changed
if (body.start !== undefined || body.end !== undefined) {
  try {
    const { cancelReminders, scheduleReminders } = await import('@/lib/reminders/queue');
    await cancelReminders(appointmentId);
    if (updatedAppointment.status === 'confirmed') {
      await scheduleReminders(
        appointmentId,
        new Date(updatedAppointment.start),
        tenantInfo.businessId,
        updatedAppointment.customer_id
      );
    }
  } catch (error) {
    console.error('Failed to reschedule reminders:', error);
  }
}
```

#### C. When Appointment is Cancelled

**Location**: `app/api/appointments/[id]/cancel/route.ts` (if exists) or in PATCH handler

**When status changes to 'cancelled'**:

```typescript
const { cancelReminders } = await import('@/lib/reminders/queue');
await cancelReminders(appointmentId);
```

### 1.5 Cron Job / Scheduled Task

**Location**: `app/api/cron/process-reminders/route.ts` (NEW FILE)

**Implementation**:

```typescript
// This endpoint will be called by Vercel Cron or external cron service
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { processReminderQueue } = await import('@/lib/reminders/queue');
  await processReminderQueue();
  
  return NextResponse.json({ success: true });
}
```

**Vercel Cron Configuration** (`vercel.json`):

```json
{
  "crons": [{
    "path": "/api/cron/process-reminders",
    "schedule": "*/15 * * * *"
  }]
}
```

---

## 2. Google Calendar Sync

### 2.1 Database Schema Changes

**Location**: `supabase/migrations/007_add_google_calendar_sync.sql`

**New Tables Needed**:

```sql
-- Store Google Calendar OAuth tokens per business
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    calendar_id TEXT, -- Google Calendar ID (default: 'primary')
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track synced appointments
CREATE TABLE IF NOT EXISTS google_calendar_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL, -- Google Calendar event ID
    sync_direction TEXT CHECK (sync_direction IN ('to_google', 'from_google', 'bidirectional')) DEFAULT 'to_google',
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id, google_event_id)
);

-- Indexes
CREATE INDEX idx_google_calendar_tokens_business_id ON google_calendar_tokens(business_id);
CREATE INDEX idx_google_calendar_sync_appointment_id ON google_calendar_sync(appointment_id);
CREATE INDEX idx_google_calendar_sync_google_event_id ON google_calendar_sync(google_event_id);
```

### 2.2 Google Calendar API Integration

**Location**: `lib/calendar/google-sync.ts` (NEW FILE)

**Required Functions**:

```typescript
/**
 * Initialize Google OAuth flow
 */
export async function initiateGoogleOAuth(businessId: string): Promise<{ authUrl: string }>

/**
 * Handle OAuth callback and store tokens
 */
export async function handleGoogleOAuthCallback(
  businessId: string,
  code: string
): Promise<{ success: boolean }>

/**
 * Refresh access token if expired
 */
export async function refreshGoogleToken(businessId: string): Promise<boolean>

/**
 * Sync appointment to Google Calendar
 */
export async function syncAppointmentToGoogle(
  appointmentId: string,
  businessId: string
): Promise<{ success: boolean; googleEventId?: string; error?: string }>

/**
 * Sync appointment from Google Calendar (when updated externally)
 */
export async function syncAppointmentFromGoogle(
  googleEventId: string,
  businessId: string
): Promise<{ success: boolean; appointmentId?: string }>

/**
 * Delete appointment from Google Calendar
 */
export async function deleteAppointmentFromGoogle(
  appointmentId: string,
  businessId: string
): Promise<{ success: boolean }>

/**
 * Setup webhook for Google Calendar changes
 */
export async function setupGoogleCalendarWebhook(
  businessId: string
): Promise<{ success: boolean; channelId?: string }>
```

### 2.3 OAuth Setup Routes

**Location**: `app/api/calendar/google/oauth/route.ts` (NEW FILE)

**Endpoints**:
- `GET /api/calendar/google/oauth/initiate` - Start OAuth flow
- `GET /api/calendar/google/oauth/callback` - Handle OAuth callback

### 2.4 Sync Integration Points

#### A. When Appointment is Created

**Location**: `app/api/appointments/route.ts` (POST handler)

**After appointment creation**:

```typescript
// Sync to Google Calendar if enabled
if (newAppointment && status === 'confirmed') {
  try {
    const { syncAppointmentToGoogle } = await import('@/lib/calendar/google-sync');
    await syncAppointmentToGoogle(newAppointment.id, tenantInfo.businessId);
  } catch (error) {
    console.error('Failed to sync to Google Calendar:', error);
    // Don't fail appointment creation
  }
}
```

#### B. When Appointment is Updated

**Location**: `app/api/appointments/[id]/route.ts` (PATCH handler)

**After appointment update**:

```typescript
// Update Google Calendar event
try {
  const { syncAppointmentToGoogle } = await import('@/lib/calendar/google-sync');
  await syncAppointmentToGoogle(appointmentId, tenantInfo.businessId);
} catch (error) {
  console.error('Failed to sync update to Google Calendar:', error);
}
```

#### C. When Appointment is Cancelled

**Location**: `app/api/appointments/[id]/route.ts` (PATCH handler when status = 'cancelled')

```typescript
// Delete from Google Calendar
try {
  const { deleteAppointmentFromGoogle } = await import('@/lib/calendar/google-sync');
  await deleteAppointmentFromGoogle(appointmentId, tenantInfo.businessId);
} catch (error) {
  console.error('Failed to delete from Google Calendar:', error);
}
```

#### D. Webhook Handler for Google Calendar Changes

**Location**: `app/api/calendar/google/webhook/route.ts` (NEW FILE)

**Handle incoming webhooks from Google Calendar**:

```typescript
export async function POST(request: NextRequest) {
  // Verify webhook signature
  // Process Google Calendar event changes
  // Update local appointments accordingly
}
```

### 2.5 Settings UI

**Location**: `components/ported/pages/admin/Settings.tsx`

**Add Google Calendar section** (around line 1800-1900):

```typescript
// Add Google Calendar sync settings
// - Connect/Disconnect Google Calendar button
// - Show sync status
// - Enable/disable sync toggle
```

---

## 3. Reminder Customization

### 3.1 Settings Schema Extension

**Location**: `supabase/migrations/006_add_reminders_system.sql` (same migration as reminders)

**Update Settings.notifications JSONB structure**:

```typescript
interface ReminderSettings {
  enabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  daysBefore: number[]; // [1] or [2] or [1, 2]
  defaultTime: string; // "09:00" format
  personalAddition?: string; // Optional message to append
  reminderMessage?: string; // Template with {{service}}, {{date}}, {{time}}, {{worker}}
}
```

### 3.2 Settings UI Updates

**Location**: `components/ported/pages/admin/Settings.tsx`

**Add Reminder Settings Section** (after Notifications section, around line 1500-1600):

```typescript
// Reminder Settings UI:
// - Enable/disable reminders toggle
// - SMS reminders toggle
// - WhatsApp reminders toggle
// - Days before selection (1 day, 2 days, both)
// - Default time picker
// - Personal addition textarea
// - Reminder message template editor
```

**Location**: `app/api/settings/route.ts`

**No changes needed** - existing PATCH handler will save reminder settings in `notifications` JSONB.

### 3.3 Template Processing

**Location**: `lib/reminders/template.ts` (NEW FILE)

**Functions**:

```typescript
/**
 * Process reminder template with appointment data
 */
export function processReminderTemplate(
  template: string,
  appointment: {
    serviceName: string;
    date: Date;
    time: string;
    workerName: string;
    businessName: string;
    personalAddition?: string;
  },
  locale: string
): string
```

### 3.4 Integration with Reminder Queue

**Location**: `lib/reminders/queue.ts`

**Update `scheduleReminders` function** to:
- Read reminder settings from business settings
- Respect `daysBefore` array
- Use `defaultTime` for scheduling
- Include `personalAddition` in message

---

## 4. Environment Variables

**Location**: `.env.local` and `ENV_SETUP.md`

**Add to `.env.local`**:

```bash
# Twilio (already exists, but verify)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/google/oauth/callback

# Cron Job Secret
CRON_SECRET=your_random_secret_string
```

---

## 5. Plan Features Integration

**Location**: `supabase/migrations/002_add_plans_system.sql` or new migration

**Add plan features**:

```sql
-- Add reminder features to plan_features
INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
-- Basic plan: No automated reminders
(basic_plan_id, 'automated_reminders', false),
(basic_plan_id, 'sms_reminders', false),
(basic_plan_id, 'whatsapp_reminders', false),
(basic_plan_id, 'google_calendar_sync', false),

-- Professional plan: SMS reminders only
(professional_plan_id, 'automated_reminders', true),
(professional_plan_id, 'sms_reminders', true),
(professional_plan_id, 'whatsapp_reminders', false),
(professional_plan_id, 'google_calendar_sync', true),

-- Business plan: All features
(business_plan_id, 'automated_reminders', true),
(business_plan_id, 'sms_reminders', true),
(business_plan_id, 'whatsapp_reminders', true),
(business_plan_id, 'google_calendar_sync', true);
```

**Location**: `lib/trial/utils.ts`

**Add feature checks**:

```typescript
// Check if business can use automated reminders
export async function canUseAutomatedReminders(businessId: string): Promise<boolean>
export async function canUseSMSReminders(businessId: string): Promise<boolean>
export async function canUseWhatsAppReminders(businessId: string): Promise<boolean>
export async function canUseGoogleCalendarSync(businessId: string): Promise<boolean>
```

---

## 6. Implementation Order

1. **Database Migrations** (Step 1 & 2.1)
   - Create reminder_queue table
   - Create google_calendar_tokens and google_calendar_sync tables
   - Update settings schema

2. **Twilio Reminder Functions** (Step 1.2)
   - Extend Twilio library for reminders
   - Test SMS/WhatsApp reminder sending

3. **Reminder Queue System** (Step 1.3)
   - Implement queue management
   - Schedule reminders on appointment create/update

4. **Cron Job** (Step 1.5)
   - Set up Vercel cron or external service
   - Process reminder queue

5. **Google Calendar OAuth** (Step 2.2-2.3)
   - Implement OAuth flow
   - Store tokens

6. **Google Calendar Sync** (Step 2.4)
   - Sync appointments to Google
   - Handle webhooks from Google

7. **Settings UI** (Step 3.2)
   - Add reminder customization UI
   - Add Google Calendar connection UI

8. **Plan Features** (Step 5)
   - Add feature flags
   - Restrict features by plan

---

## 7. Testing Checklist

- [ ] SMS reminders sent correctly
- [ ] WhatsApp reminders sent correctly
- [ ] Reminders scheduled at correct time
- [ ] Reminders cancelled when appointment cancelled
- [ ] Reminders rescheduled when appointment time changes
- [ ] Google Calendar OAuth flow works
- [ ] Appointments sync to Google Calendar
- [ ] Google Calendar changes sync back to system
- [ ] Reminder customization settings saved and applied
- [ ] Plan restrictions enforced correctly
- [ ] Cron job processes reminders correctly

---

## 8. Files to Create/Modify

### New Files:
- `supabase/migrations/006_add_reminders_system.sql`
- `supabase/migrations/007_add_google_calendar_sync.sql`
- `lib/notifications/twilio-reminders.ts`
- `lib/reminders/queue.ts`
- `lib/reminders/template.ts`
- `lib/calendar/google-sync.ts`
- `app/api/cron/process-reminders/route.ts`
- `app/api/calendar/google/oauth/route.ts`
- `app/api/calendar/google/webhook/route.ts`

### Modified Files:
- `app/api/appointments/route.ts` (POST handler)
- `app/api/appointments/[id]/route.ts` (PATCH handler)
- `components/ported/pages/admin/Settings.tsx`
- `lib/trial/utils.ts`
- `supabase/migrations/002_add_plans_system.sql` (or new migration)
- `ENV_SETUP.md`
- `vercel.json` (if using Vercel cron)

---

## 9. Dependencies to Install

```bash
npm install googleapis
npm install @types/googleapis --save-dev
```

---

## 10. Notes

- **Twilio Costs**: SMS and WhatsApp reminders will incur Twilio costs. Consider rate limiting and plan restrictions.
- **Google Calendar API**: Requires Google Cloud project setup and OAuth consent screen configuration.
- **Cron Jobs**: Vercel cron is free but limited. Consider external service (e.g., cron-job.org) for production.
- **Error Handling**: All sync operations should be non-blocking (don't fail appointment creation if sync fails).
- **Rate Limiting**: Implement rate limiting for reminder sending to avoid Twilio API limits.

