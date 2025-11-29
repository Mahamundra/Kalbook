-- ============================================================================
-- ATTENDANCE TRACKING FOR GYM_TRAINER BUSINESSES
-- ============================================================================
-- This migration adds attendance tracking columns to appointments table
-- for gym_trainer businesses only
-- ============================================================================

-- 1. Add attendance columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attendance_notes TEXT,
ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

-- 2. Create index for attendance queries
CREATE INDEX IF NOT EXISTS idx_appointments_attended ON appointments(business_id, attended) WHERE attended = true;
CREATE INDEX IF NOT EXISTS idx_appointments_no_show ON appointments(business_id, no_show) WHERE no_show = true;

-- 3. Add comment
COMMENT ON COLUMN appointments.attended IS 'Whether the client attended the session (gym_trainer businesses)';
COMMENT ON COLUMN appointments.attended_at IS 'Timestamp when attendance was marked (gym_trainer businesses)';
COMMENT ON COLUMN appointments.attendance_notes IS 'Notes about the attendance (gym_trainer businesses)';
COMMENT ON COLUMN appointments.no_show IS 'Whether the client did not show up (gym_trainer businesses)';

