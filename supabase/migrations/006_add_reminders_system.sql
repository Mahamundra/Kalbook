-- ============================================================================
-- REMINDERS SYSTEM
-- ============================================================================
-- This migration adds support for automated SMS/WhatsApp reminders
-- ============================================================================

-- 1. Add reminder tracking columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_status TEXT CHECK (reminder_status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending';

-- 2. Create reminder_queue table for scheduled reminders
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

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reminder_queue_scheduled_for ON reminder_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminder_queue_appointment_id ON reminder_queue(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminder_queue_business_id ON reminder_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_reminder_queue_status ON reminder_queue(status) WHERE status = 'pending';

-- 4. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminder_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_reminder_queue_updated_at ON reminder_queue;
CREATE TRIGGER trigger_update_reminder_queue_updated_at
    BEFORE UPDATE ON reminder_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_reminder_queue_updated_at();

-- Note: Reminder settings are stored in settings.notifications JSONB
-- Structure:
-- {
--   "reminders": {
--     "enabled": true,
--     "smsEnabled": true,
--     "whatsappEnabled": true,
--     "daysBefore": [1, 2],
--     "defaultTime": "09:00",
--     "personalAddition": "",
--     "reminderMessage": "A reminder that you have an appointment for {{service}} on {{date}} at {{time}} with {{worker}}, see you soon!"
--   }
-- }

