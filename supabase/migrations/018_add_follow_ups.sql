-- ============================================================================
-- FOLLOW-UPS SYSTEM FOR GYM_TRAINER BUSINESSES
-- ============================================================================
-- This migration adds support for follow-up tracking
-- for gym_trainer businesses only
-- ============================================================================

-- 1. Create follow_ups table
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('check_in', 'reengagement', 'assessment', 'custom')) DEFAULT 'check_in',
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'cancelled', 'skipped')) DEFAULT 'pending',
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_follow_ups_business_id ON follow_ups(business_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer_id ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(business_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_for ON follow_ups(scheduled_for) WHERE status = 'pending';

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_follow_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trigger_update_follow_ups_updated_at ON follow_ups;
CREATE TRIGGER trigger_update_follow_ups_updated_at
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_ups_updated_at();

-- 5. Add RLS policies
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view follow_ups for their business
DROP POLICY IF EXISTS "Users can view follow_ups for their business" ON follow_ups;
CREATE POLICY "Users can view follow_ups for their business"
    ON follow_ups FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert follow_ups for their business
DROP POLICY IF EXISTS "Users can insert follow_ups for their business" ON follow_ups;
CREATE POLICY "Users can insert follow_ups for their business"
    ON follow_ups FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update follow_ups for their business
DROP POLICY IF EXISTS "Users can update follow_ups for their business" ON follow_ups;
CREATE POLICY "Users can update follow_ups for their business"
    ON follow_ups FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete follow_ups for their business
DROP POLICY IF EXISTS "Users can delete follow_ups for their business" ON follow_ups;
CREATE POLICY "Users can delete follow_ups for their business"
    ON follow_ups FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

COMMENT ON TABLE follow_ups IS 'Follow-up tracking for clients (gym_trainer businesses only)';

