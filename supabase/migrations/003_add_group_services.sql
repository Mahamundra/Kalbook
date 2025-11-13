-- ============================================================================
-- GROUP SERVICES AND APPOINTMENT PARTICIPANTS
-- ============================================================================
-- This migration adds support for group appointments where multiple customers
-- can book the same service time slot (e.g., pilates classes, therapy groups)

-- 1. Add group service fields to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_group_service BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER,
ADD COLUMN IF NOT EXISTS min_capacity INTEGER,
ADD COLUMN IF NOT EXISTS allow_waitlist BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS group_pricing_type TEXT CHECK (group_pricing_type IN ('per_person', 'fixed')) DEFAULT 'per_person';

-- Add constraint: if is_group_service is true, max_capacity must be set and > 1
ALTER TABLE services
ADD CONSTRAINT check_group_service_capacity 
CHECK (
  (is_group_service = false) OR 
  (is_group_service = true AND max_capacity IS NOT NULL AND max_capacity > 1)
);

-- 2. Create appointment_participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS appointment_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('confirmed', 'waitlist', 'cancelled')) DEFAULT 'confirmed',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id, customer_id)
);

-- 3. Add optional fields to appointments table for group management
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS is_group_appointment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 1;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_participants_appointment_id ON appointment_participants(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_participants_customer_id ON appointment_participants(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointment_participants_status ON appointment_participants(status);
CREATE INDEX IF NOT EXISTS idx_appointments_is_group ON appointments(is_group_appointment);
CREATE INDEX IF NOT EXISTS idx_services_is_group_service ON services(is_group_service);

-- 5. Enable RLS on appointment_participants
ALTER TABLE appointment_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment_participants
-- Allow read access for business owners/admins
CREATE POLICY "Allow business users to view participants"
ON appointment_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN businesses b ON a.business_id = b.id
    WHERE a.id = appointment_participants.appointment_id
  )
);

-- Allow insert for business context (via API with proper auth)
CREATE POLICY "Allow business users to add participants"
ON appointment_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN businesses b ON a.business_id = b.id
    WHERE a.id = appointment_participants.appointment_id
  )
);

-- Allow update for business context
CREATE POLICY "Allow business users to update participants"
ON appointment_participants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN businesses b ON a.business_id = b.id
    WHERE a.id = appointment_participants.appointment_id
  )
);

-- Allow delete for business context
CREATE POLICY "Allow business users to delete participants"
ON appointment_participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN businesses b ON a.business_id = b.id
    WHERE a.id = appointment_participants.appointment_id
  )
);

-- 6. Create function to update current_participants count on appointments
CREATE OR REPLACE FUNCTION update_appointment_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE appointments
    SET current_participants = (
        SELECT COUNT(*) 
        FROM appointment_participants 
        WHERE appointment_id = COALESCE(NEW.appointment_id, OLD.appointment_id)
        AND status = 'confirmed'
    )
    WHERE id = COALESCE(NEW.appointment_id, OLD.appointment_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers to automatically update participant count
DROP TRIGGER IF EXISTS trigger_update_participant_count_insert ON appointment_participants;
CREATE TRIGGER trigger_update_participant_count_insert
AFTER INSERT ON appointment_participants
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION update_appointment_participant_count();

DROP TRIGGER IF EXISTS trigger_update_participant_count_update ON appointment_participants;
CREATE TRIGGER trigger_update_participant_count_update
AFTER UPDATE ON appointment_participants
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_appointment_participant_count();

DROP TRIGGER IF EXISTS trigger_update_participant_count_delete ON appointment_participants;
CREATE TRIGGER trigger_update_participant_count_delete
AFTER DELETE ON appointment_participants
FOR EACH ROW
EXECUTE FUNCTION update_appointment_participant_count();

-- 8. Migrate existing appointments: Create participant records for existing appointments
-- This ensures all existing appointments have at least one participant
INSERT INTO appointment_participants (appointment_id, customer_id, status, joined_at)
SELECT 
    a.id,
    a.customer_id,
    CASE 
        WHEN a.status = 'cancelled' THEN 'cancelled'
        ELSE 'confirmed'
    END,
    a.created_at
FROM appointments a
WHERE NOT EXISTS (
    SELECT 1 FROM appointment_participants ap 
    WHERE ap.appointment_id = a.id
)
ON CONFLICT (appointment_id, customer_id) DO NOTHING;

-- 9. Update existing appointments to set is_group_appointment = false by default
UPDATE appointments
SET is_group_appointment = false
WHERE is_group_appointment IS NULL;

-- 10. Update current_participants count for all existing appointments
UPDATE appointments a
SET current_participants = (
    SELECT COUNT(*) 
    FROM appointment_participants ap
    WHERE ap.appointment_id = a.id
    AND ap.status = 'confirmed'
);

