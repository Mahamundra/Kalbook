-- ============================================================================
-- WORKER INVITE TRACKING
-- ============================================================================
-- This migration adds tracking for when invite emails are sent to workers
-- for rate limiting purposes (1 invite per 24 hours)
-- ============================================================================

-- Add last_invite_sent_at column to workers table
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS last_invite_sent_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_workers_last_invite_sent_at 
ON workers(last_invite_sent_at) 
WHERE last_invite_sent_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN workers.last_invite_sent_at IS 'Timestamp of when the last invite email was sent (for rate limiting - 1 invite per 24 hours)';













