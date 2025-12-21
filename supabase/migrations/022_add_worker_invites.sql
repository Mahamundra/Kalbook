-- ============================================================================
-- WORKER INVITE SYSTEM
-- ============================================================================
-- This migration adds support for magic link invites for workers
-- ============================================================================

-- Add invite_token and invite_expires_at columns to workers table
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS invite_token TEXT,
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

-- Create unique index on invite_token for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_invite_token ON workers(invite_token) WHERE invite_token IS NOT NULL;

-- Create index on invite_expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_workers_invite_expires_at ON workers(invite_expires_at) WHERE invite_expires_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN workers.invite_token IS 'Unique token for worker invite link (magic link)';
COMMENT ON COLUMN workers.invite_expires_at IS 'Expiration timestamp for the invite token (7 days from creation)';

