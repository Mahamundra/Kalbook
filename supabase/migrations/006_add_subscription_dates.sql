-- ============================================================================
-- ADD SUBSCRIPTION DATE FIELDS
-- ============================================================================

-- Add subscription date fields to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMPTZ;

-- Create index for subscription_ends_at for faster queries
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_ends_at ON businesses(subscription_ends_at);

-- Add comment
COMMENT ON COLUMN businesses.subscription_started_at IS 'When the subscription became active';
COMMENT ON COLUMN businesses.subscription_ends_at IS 'When the subscription expires (calculated from plan duration)';
COMMENT ON COLUMN businesses.renewed_at IS 'Last renewal date (if recently renewed)';

