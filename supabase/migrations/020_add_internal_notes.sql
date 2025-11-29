-- ============================================================================
-- INTERNAL NOTES SYSTEM FOR GYM_TRAINER BUSINESSES
-- ============================================================================
-- This migration adds support for internal notes and meeting summaries
-- for gym_trainer businesses only
-- ============================================================================

-- 1. Create internal_notes table
CREATE TABLE IF NOT EXISTS internal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note_type TEXT CHECK (note_type IN ('note', 'meeting', 'reminder', 'other')) DEFAULT 'note',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    meeting_date TIMESTAMPTZ, -- For meeting summaries
    participants TEXT[], -- For meeting summaries
    agenda JSONB DEFAULT '[]'::jsonb, -- For meeting summaries
    decisions JSONB DEFAULT '[]'::jsonb, -- For meeting summaries
    action_items JSONB DEFAULT '[]'::jsonb, -- For meeting summaries
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_internal_notes_business_id ON internal_notes(business_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_note_type ON internal_notes(business_id, note_type);
CREATE INDEX IF NOT EXISTS idx_internal_notes_created_by_user_id ON internal_notes(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_tags ON internal_notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_internal_notes_meeting_date ON internal_notes(meeting_date) WHERE note_type = 'meeting';

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_internal_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trigger_update_internal_notes_updated_at ON internal_notes;
CREATE TRIGGER trigger_update_internal_notes_updated_at
    BEFORE UPDATE ON internal_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_internal_notes_updated_at();

-- 5. Add RLS policies
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view internal_notes for their business
DROP POLICY IF EXISTS "Users can view internal_notes for their business" ON internal_notes;
CREATE POLICY "Users can view internal_notes for their business"
    ON internal_notes FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert internal_notes for their business
DROP POLICY IF EXISTS "Users can insert internal_notes for their business" ON internal_notes;
CREATE POLICY "Users can insert internal_notes for their business"
    ON internal_notes FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update internal_notes for their business
DROP POLICY IF EXISTS "Users can update internal_notes for their business" ON internal_notes;
CREATE POLICY "Users can update internal_notes for their business"
    ON internal_notes FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete internal_notes for their business
DROP POLICY IF EXISTS "Users can delete internal_notes for their business" ON internal_notes;
CREATE POLICY "Users can delete internal_notes for their business"
    ON internal_notes FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

COMMENT ON TABLE internal_notes IS 'Internal notes and meeting summaries (gym_trainer businesses only)';

