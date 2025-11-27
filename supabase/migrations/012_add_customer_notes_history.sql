-- ============================================================================
-- CUSTOMER NOTES HISTORY TABLE
-- ============================================================================
-- This migration adds support for tracking customer notes history
-- with full audit trail of who created each note and when
-- ============================================================================

-- 1. Create customer_notes_history table
CREATE TABLE IF NOT EXISTS customer_notes_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- User who created the note
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_customer_notes_history_customer_id ON customer_notes_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_history_business_id ON customer_notes_history(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_history_created_at ON customer_notes_history(created_at DESC);

-- 3. Add RLS policies
ALTER TABLE customer_notes_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notes history for their business
CREATE POLICY "Users can view customer_notes_history for their business"
    ON customer_notes_history FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert notes history for their business
CREATE POLICY "Users can insert customer_notes_history for their business"
    ON customer_notes_history FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Note: Notes history is append-only (no updates or deletes)
-- The current notes field in customers table remains for the latest note

COMMENT ON TABLE customer_notes_history IS 'Tracks full history of customer notes with audit trail';


