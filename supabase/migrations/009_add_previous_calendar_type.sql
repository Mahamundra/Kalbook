-- ============================================================================
-- ADD PREVIOUS CALENDAR TYPE TO BUSINESSES
-- ============================================================================
-- This migration adds a field to track which calendar system the business
-- was using before onboarding (for analytics and onboarding improvements)
-- ============================================================================

-- Add previous_calendar_type column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS previous_calendar_type TEXT CHECK (
  previous_calendar_type IN (
    'appointment_scheduling_app',
    'paper_calendar',
    'google_phone_calendar',
    'not_using_calendar'
  )
);

-- Add comment
COMMENT ON COLUMN businesses.previous_calendar_type IS 'Calendar system used before onboarding: appointment_scheduling_app, paper_calendar, google_phone_calendar, or not_using_calendar';

