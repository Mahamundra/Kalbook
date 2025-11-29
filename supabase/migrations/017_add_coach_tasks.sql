-- ============================================================================
-- COACH TASKS SYSTEM FOR GYM_TRAINER BUSINESSES
-- ============================================================================
-- This migration adds support for task management for coaches
-- for gym_trainer businesses only
-- ============================================================================

-- 1. Create coach_tasks table
CREATE TABLE IF NOT EXISTS coach_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    task_type TEXT CHECK (task_type IN ('follow_up', 'assessment', 'program_update', 'check_in', 'other')) DEFAULT 'other',
    description TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create training_summaries table
CREATE TABLE IF NOT EXISTS training_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    exercises_performed JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_coach_tasks_business_id ON coach_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_coach_tasks_worker_id ON coach_tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_coach_tasks_customer_id ON coach_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_coach_tasks_status ON coach_tasks(business_id, status);
CREATE INDEX IF NOT EXISTS idx_coach_tasks_due_date ON coach_tasks(due_date) WHERE status IN ('pending', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_training_summaries_business_id ON training_summaries(business_id);
CREATE INDEX IF NOT EXISTS idx_training_summaries_appointment_id ON training_summaries(appointment_id);
CREATE INDEX IF NOT EXISTS idx_training_summaries_worker_id ON training_summaries(worker_id);
CREATE INDEX IF NOT EXISTS idx_training_summaries_customer_id ON training_summaries(customer_id);

-- 4. Create functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coach_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_training_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers
DROP TRIGGER IF EXISTS trigger_update_coach_tasks_updated_at ON coach_tasks;
CREATE TRIGGER trigger_update_coach_tasks_updated_at
    BEFORE UPDATE ON coach_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_tasks_updated_at();

DROP TRIGGER IF EXISTS trigger_update_training_summaries_updated_at ON training_summaries;
CREATE TRIGGER trigger_update_training_summaries_updated_at
    BEFORE UPDATE ON training_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_training_summaries_updated_at();

-- 6. Add RLS policies
ALTER TABLE coach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view coach_tasks for their business
DROP POLICY IF EXISTS "Users can view coach_tasks for their business" ON coach_tasks;
CREATE POLICY "Users can view coach_tasks for their business"
    ON coach_tasks FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert coach_tasks for their business
DROP POLICY IF EXISTS "Users can insert coach_tasks for their business" ON coach_tasks;
CREATE POLICY "Users can insert coach_tasks for their business"
    ON coach_tasks FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update coach_tasks for their business
DROP POLICY IF EXISTS "Users can update coach_tasks for their business" ON coach_tasks;
CREATE POLICY "Users can update coach_tasks for their business"
    ON coach_tasks FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete coach_tasks for their business
DROP POLICY IF EXISTS "Users can delete coach_tasks for their business" ON coach_tasks;
CREATE POLICY "Users can delete coach_tasks for their business"
    ON coach_tasks FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can view training_summaries for their business
DROP POLICY IF EXISTS "Users can view training_summaries for their business" ON training_summaries;
CREATE POLICY "Users can view training_summaries for their business"
    ON training_summaries FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert training_summaries for their business
DROP POLICY IF EXISTS "Users can insert training_summaries for their business" ON training_summaries;
CREATE POLICY "Users can insert training_summaries for their business"
    ON training_summaries FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update training_summaries for their business
DROP POLICY IF EXISTS "Users can update training_summaries for their business" ON training_summaries;
CREATE POLICY "Users can update training_summaries for their business"
    ON training_summaries FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete training_summaries for their business
DROP POLICY IF EXISTS "Users can delete training_summaries for their business" ON training_summaries;
CREATE POLICY "Users can delete training_summaries for their business"
    ON training_summaries FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

COMMENT ON TABLE coach_tasks IS 'Tasks assigned to coaches (gym_trainer businesses only)';
COMMENT ON TABLE training_summaries IS 'Training session summaries (gym_trainer businesses only)';

