-- ============================================================================
-- CLIENT MEASUREMENTS TABLE
-- ============================================================================
-- This migration adds support for tracking client body measurements
-- (weight, height, body fat, muscle mass, and custom measurements)
-- for gym_trainer businesses
-- ============================================================================

-- 1. Create client_measurements table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS client_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    weight DECIMAL(10, 2),
    height DECIMAL(10, 2),
    body_fat_percentage DECIMAL(5, 2),
    muscle_mass DECIMAL(10, 2),
    measurements JSONB DEFAULT '{}'::jsonb, -- Flexible storage for custom measurements (chest, waist, hips, arms, thighs, etc.)
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1a. Add any missing columns if table already exists (idempotent)
DO $$ 
BEGIN
    -- Add weight column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client_measurements' AND column_name = 'weight') THEN
        ALTER TABLE client_measurements ADD COLUMN weight DECIMAL(10, 2);
    END IF;
    
    -- Add height column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client_measurements' AND column_name = 'height') THEN
        ALTER TABLE client_measurements ADD COLUMN height DECIMAL(10, 2);
    END IF;
    
    -- Add body_fat_percentage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client_measurements' AND column_name = 'body_fat_percentage') THEN
        ALTER TABLE client_measurements ADD COLUMN body_fat_percentage DECIMAL(5, 2);
    END IF;
    
    -- Add muscle_mass column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client_measurements' AND column_name = 'muscle_mass') THEN
        ALTER TABLE client_measurements ADD COLUMN muscle_mass DECIMAL(10, 2);
    END IF;
    
    -- Add measurements JSONB column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client_measurements' AND column_name = 'measurements') THEN
        ALTER TABLE client_measurements ADD COLUMN measurements JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client_measurements' AND column_name = 'notes') THEN
        ALTER TABLE client_measurements ADD COLUMN notes TEXT;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client_measurements' AND column_name = 'updated_at') THEN
        ALTER TABLE client_measurements ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_client_measurements_customer_id ON client_measurements(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_measurements_business_id ON client_measurements(business_id);
CREATE INDEX IF NOT EXISTS idx_client_measurements_measured_at ON client_measurements(measured_at DESC);

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_client_measurements_updated_at ON client_measurements;
CREATE TRIGGER trigger_update_client_measurements_updated_at
    BEFORE UPDATE ON client_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_client_measurements_updated_at();

-- 5. Add RLS policies
ALTER TABLE client_measurements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view measurements for their business
DROP POLICY IF EXISTS "Users can view client_measurements for their business" ON client_measurements;
CREATE POLICY "Users can view client_measurements for their business"
    ON client_measurements FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert measurements for their business
DROP POLICY IF EXISTS "Users can insert client_measurements for their business" ON client_measurements;
CREATE POLICY "Users can insert client_measurements for their business"
    ON client_measurements FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update measurements for their business
DROP POLICY IF EXISTS "Users can update client_measurements for their business" ON client_measurements;
CREATE POLICY "Users can update client_measurements for their business"
    ON client_measurements FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete measurements for their business
DROP POLICY IF EXISTS "Users can delete client_measurements for their business" ON client_measurements;
CREATE POLICY "Users can delete client_measurements for their business"
    ON client_measurements FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

COMMENT ON TABLE client_measurements IS 'Tracks client body measurements (weight, height, body fat, muscle mass, and custom measurements) for gym_trainer businesses';

