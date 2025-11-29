-- ============================================================================
-- MEMBERSHIPS SYSTEM FOR GYM_TRAINER BUSINESSES
-- ============================================================================
-- This migration adds support for membership packages and session balance tracking
-- for gym_trainer businesses only
-- ============================================================================

-- 1. Create membership_packages table
CREATE TABLE IF NOT EXISTS membership_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    session_count INTEGER NOT NULL CHECK (session_count > 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    price DECIMAL(10, 2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    package_id UUID REFERENCES membership_packages(id) ON DELETE SET NULL,
    package_name TEXT NOT NULL, -- Denormalized for history
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    remaining_sessions INTEGER NOT NULL CHECK (remaining_sessions >= 0),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('active', 'expired', 'completed', 'cancelled')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_remaining_sessions CHECK (remaining_sessions <= total_sessions)
);

-- 3. Create session_usage_log table
CREATE TABLE IF NOT EXISTS session_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_membership_packages_business_id ON membership_packages(business_id);
CREATE INDEX IF NOT EXISTS idx_membership_packages_active ON membership_packages(business_id, active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_memberships_business_id ON memberships(business_id);
CREATE INDEX IF NOT EXISTS idx_memberships_customer_id ON memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(business_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_expires_at ON memberships(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_memberships_package_id ON memberships(package_id);

CREATE INDEX IF NOT EXISTS idx_session_usage_log_membership_id ON session_usage_log(membership_id);
CREATE INDEX IF NOT EXISTS idx_session_usage_log_appointment_id ON session_usage_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_session_usage_log_used_at ON session_usage_log(used_at DESC);

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_membership_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_membership_packages_updated_at ON membership_packages;
CREATE TRIGGER trigger_update_membership_packages_updated_at
    BEFORE UPDATE ON membership_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_packages_updated_at();

DROP TRIGGER IF EXISTS trigger_update_memberships_updated_at ON memberships;
CREATE TRIGGER trigger_update_memberships_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_memberships_updated_at();

-- 7. Create function to automatically expire memberships
CREATE OR REPLACE FUNCTION expire_memberships()
RETURNS void AS $$
BEGIN
    UPDATE memberships
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Add RLS policies
ALTER TABLE membership_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_usage_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view membership packages for their business
DROP POLICY IF EXISTS "Users can view membership_packages for their business" ON membership_packages;
CREATE POLICY "Users can view membership_packages for their business"
    ON membership_packages FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert membership packages for their business
DROP POLICY IF EXISTS "Users can insert membership_packages for their business" ON membership_packages;
CREATE POLICY "Users can insert membership_packages for their business"
    ON membership_packages FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update membership packages for their business
DROP POLICY IF EXISTS "Users can update membership_packages for their business" ON membership_packages;
CREATE POLICY "Users can update membership_packages for their business"
    ON membership_packages FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete membership packages for their business
DROP POLICY IF EXISTS "Users can delete membership_packages for their business" ON membership_packages;
CREATE POLICY "Users can delete membership_packages for their business"
    ON membership_packages FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can view memberships for their business
DROP POLICY IF EXISTS "Users can view memberships for their business" ON memberships;
CREATE POLICY "Users can view memberships for their business"
    ON memberships FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert memberships for their business
DROP POLICY IF EXISTS "Users can insert memberships for their business" ON memberships;
CREATE POLICY "Users can insert memberships for their business"
    ON memberships FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update memberships for their business
DROP POLICY IF EXISTS "Users can update memberships for their business" ON memberships;
CREATE POLICY "Users can update memberships for their business"
    ON memberships FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete memberships for their business
DROP POLICY IF EXISTS "Users can delete memberships for their business" ON memberships;
CREATE POLICY "Users can delete memberships for their business"
    ON memberships FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can view session_usage_log for their business
DROP POLICY IF EXISTS "Users can view session_usage_log for their business" ON session_usage_log;
CREATE POLICY "Users can view session_usage_log for their business"
    ON session_usage_log FOR SELECT
    USING (
        membership_id IN (
            SELECT id FROM memberships
            WHERE business_id IN (
                SELECT business_id FROM users 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy: Users can insert session_usage_log for their business
DROP POLICY IF EXISTS "Users can insert session_usage_log for their business" ON session_usage_log;
CREATE POLICY "Users can insert session_usage_log for their business"
    ON session_usage_log FOR INSERT
    WITH CHECK (
        membership_id IN (
            SELECT id FROM memberships
            WHERE business_id IN (
                SELECT business_id FROM users 
                WHERE id = auth.uid()
            )
        )
    );

COMMENT ON TABLE membership_packages IS 'Membership packages available for purchase (gym_trainer businesses only)';
COMMENT ON TABLE memberships IS 'Client memberships tracking session balance (gym_trainer businesses only)';
COMMENT ON TABLE session_usage_log IS 'Log of session usage from memberships (gym_trainer businesses only)';
