-- ============================================================================
-- GOOGLE CALENDAR SYNC
-- ============================================================================
-- This migration adds support for bidirectional Google Calendar synchronization
-- ============================================================================

-- 1. Store Google Calendar OAuth tokens per business
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    calendar_id TEXT DEFAULT 'primary', -- Google Calendar ID (default: 'primary')
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Track synced appointments
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

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_business_id ON google_calendar_tokens(business_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_appointment_id ON google_calendar_sync(appointment_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_google_event_id ON google_calendar_sync(google_event_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_business_id ON google_calendar_sync(business_id);

-- 4. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_calendar_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_google_calendar_tokens_updated_at ON google_calendar_tokens;
CREATE TRIGGER trigger_update_google_calendar_tokens_updated_at
    BEFORE UPDATE ON google_calendar_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_google_calendar_tokens_updated_at();

