-- ============================================================================
-- WORKER PENDING STATUS
-- ============================================================================
-- This migration adds support for pending worker status
-- Workers with invite_token and active=false are considered pending
-- ============================================================================

-- Add comment to clarify pending status
COMMENT ON COLUMN workers.active IS 'Worker active status. false + invite_token = pending invite, false + no invite_token = inactive, true = active';

