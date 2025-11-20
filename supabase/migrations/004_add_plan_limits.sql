-- ============================================================================
-- PLAN LIMITS AND ADDITIONAL FEATURES
-- ============================================================================
-- This migration adds:
-- 1. max_services limit to plans.features JSONB
-- 2. New plan features: group_appointments, custom_templates, qr_codes
-- ============================================================================

-- 1. Update existing plans to include max_services in features JSONB
UPDATE plans 
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{max_services}',
  CASE 
    WHEN name = 'basic' THEN '10'::jsonb
    WHEN name = 'professional' THEN '-1'::jsonb
    WHEN name = 'business' THEN '-1'::jsonb
    ELSE '-1'::jsonb
  END
)
WHERE features->>'max_services' IS NULL;

-- 2. Insert new plan features for all existing plans
DO $$
DECLARE
    plan_record RECORD;
BEGIN
    FOR plan_record IN SELECT id, name FROM plans WHERE active = true
    LOOP
        -- Group Appointments feature
        INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
        (plan_record.id, 'group_appointments', 
         CASE WHEN plan_record.name IN ('professional', 'business') THEN true ELSE false END)
        ON CONFLICT (plan_id, feature_name) DO NOTHING;

        -- Custom Templates feature
        INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
        (plan_record.id, 'custom_templates', 
         CASE WHEN plan_record.name IN ('professional', 'business') THEN true ELSE false END)
        ON CONFLICT (plan_id, feature_name) DO NOTHING;

        -- QR Codes feature
        INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
        (plan_record.id, 'qr_codes', 
         CASE WHEN plan_record.name IN ('professional', 'business') THEN true ELSE false END)
        ON CONFLICT (plan_id, feature_name) DO NOTHING;
    END LOOP;
END $$;

-- 3. Verify the updates
-- This is just for reference, not executed
-- SELECT 
--     name,
--     features->>'max_staff' as max_staff,
--     features->>'max_services' as max_services,
--     features->>'max_bookings_per_month' as max_bookings
-- FROM plans
-- WHERE active = true;




