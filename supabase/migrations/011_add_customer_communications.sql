-- ============================================================================
-- CUSTOMER COMMUNICATIONS TABLE
-- ============================================================================
-- This migration adds support for tracking customer communications
-- (SMS, WhatsApp, Email) with full history
-- ============================================================================

-- 1. Create customer_communications table
CREATE TABLE IF NOT EXISTS customer_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('sms', 'whatsapp', 'email')) NOT NULL,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL DEFAULT 'outbound',
    subject TEXT, -- For email
    message TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who sent it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_business_id ON customer_communications(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_created_at ON customer_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_communications_channel ON customer_communications(channel);
CREATE INDEX IF NOT EXISTS idx_customer_communications_status ON customer_communications(status);

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_customer_communications_updated_at ON customer_communications;
CREATE TRIGGER trigger_update_customer_communications_updated_at
    BEFORE UPDATE ON customer_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_communications_updated_at();

-- 5. Add RLS policies
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view communications for their business
CREATE POLICY "Users can view customer_communications for their business"
    ON customer_communications FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert communications for their business
CREATE POLICY "Users can insert customer_communications for their business"
    ON customer_communications FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update communications for their business
CREATE POLICY "Users can update customer_communications for their business"
    ON customer_communications FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete communications for their business
CREATE POLICY "Users can delete customer_communications for their business"
    ON customer_communications FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

COMMENT ON TABLE customer_communications IS 'Tracks all customer communications (SMS, WhatsApp, Email) with full history';


