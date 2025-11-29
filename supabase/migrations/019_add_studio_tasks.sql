-- ============================================================================
-- STUDIO TASKS SYSTEM FOR GYM_TRAINER BUSINESSES
-- ============================================================================
-- This migration adds support for studio-wide task management
-- for gym_trainer businesses only
-- ============================================================================

-- 1. Create studio_tasks table
CREATE TABLE IF NOT EXISTS studio_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    task_type TEXT CHECK (task_type IN ('admin', 'maintenance', 'marketing', 'client_relation', 'other')) DEFAULT 'other',
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_studio_tasks_business_id ON studio_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_studio_tasks_assigned_to_user_id ON studio_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_studio_tasks_status ON studio_tasks(business_id, status);
CREATE INDEX IF NOT EXISTS idx_studio_tasks_priority ON studio_tasks(business_id, priority);
CREATE INDEX IF NOT EXISTS idx_studio_tasks_due_date ON studio_tasks(due_date) WHERE status IN ('pending', 'in_progress');

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_studio_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trigger_update_studio_tasks_updated_at ON studio_tasks;
CREATE TRIGGER trigger_update_studio_tasks_updated_at
    BEFORE UPDATE ON studio_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_studio_tasks_updated_at();

-- 5. Add RLS policies
ALTER TABLE studio_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view studio_tasks for their business
DROP POLICY IF EXISTS "Users can view studio_tasks for their business" ON studio_tasks;
CREATE POLICY "Users can view studio_tasks for their business"
    ON studio_tasks FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert studio_tasks for their business
DROP POLICY IF EXISTS "Users can insert studio_tasks for their business" ON studio_tasks;
CREATE POLICY "Users can insert studio_tasks for their business"
    ON studio_tasks FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update studio_tasks for their business
DROP POLICY IF EXISTS "Users can update studio_tasks for their business" ON studio_tasks;
CREATE POLICY "Users can update studio_tasks for their business"
    ON studio_tasks FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete studio_tasks for their business
DROP POLICY IF EXISTS "Users can delete studio_tasks for their business" ON studio_tasks;
CREATE POLICY "Users can delete studio_tasks for their business"
    ON studio_tasks FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

COMMENT ON TABLE studio_tasks IS 'Studio-wide task management (gym_trainer businesses only)';

