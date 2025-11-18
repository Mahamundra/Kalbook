-- ============================================================================
-- ADD NEW BUSINESS TYPES
-- ============================================================================
-- This migration adds new business types for Beauty & Aesthetics, 
-- Fitness & Wellness, and Personal Care & Coaching categories

-- Drop the existing CHECK constraint
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_business_type_check;

-- Add new CHECK constraint with all business types
ALTER TABLE businesses 
ADD CONSTRAINT businesses_business_type_check 
CHECK (business_type IN (
  'barbershop', 
  'nail_salon', 
  'gym_trainer', 
  'other',
  'beauty_salon',
  'makeup_artist',
  'spa',
  'pilates_studio',
  'physiotherapy',
  'life_coach',
  'dietitian'
));


