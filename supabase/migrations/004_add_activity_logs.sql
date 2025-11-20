-- Migration: Add activity_logs table for tracking customer appointment actions
-- Created: 2024

-- Create enum type for activity types
CREATE TYPE activity_type_enum AS ENUM (
  'appointment_created',
  'appointment_cancelled',
  'reschedule_requested',
  'reschedule_approved',
  'reschedule_rejected'
);

-- Create activity_logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  activity_type activity_type_enum NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('customer', 'admin')),
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_activity_logs_business_id ON activity_logs(business_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_appointment_id ON activity_logs(appointment_id);
CREATE INDEX idx_activity_logs_status ON activity_logs(status) WHERE status IS NOT NULL;
CREATE INDEX idx_activity_logs_customer_id ON activity_logs(customer_id);
CREATE INDEX idx_activity_logs_business_type_date ON activity_logs(business_id, activity_type, created_at DESC);
CREATE INDEX idx_activity_logs_pending_reschedule ON activity_logs(business_id, status) WHERE activity_type = 'reschedule_requested' AND status = 'pending';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_activity_logs_updated_at
  BEFORE UPDATE ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_logs_updated_at();

-- Add RLS policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activity logs for their business
CREATE POLICY "Users can view activity_logs for their business"
  ON activity_logs FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Policy: System can insert activity logs (via service role)
-- Note: This will be handled via admin client, so we allow all inserts
-- In production, you might want to restrict this further
CREATE POLICY "Allow inserts for activity_logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update activity logs for their business (for approve/reject)
CREATE POLICY "Users can update activity_logs for their business"
  ON activity_logs FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM users 
      WHERE id = auth.uid()
    )
  );




