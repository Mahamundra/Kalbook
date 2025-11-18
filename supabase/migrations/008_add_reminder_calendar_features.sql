-- ============================================================================
-- ADD REMINDER AND GOOGLE CALENDAR FEATURES TO PLANS
-- ============================================================================
-- This migration adds reminder and Google Calendar sync features to plan_features
-- ============================================================================

DO $$
DECLARE
    basic_plan_id UUID;
    professional_plan_id UUID;
    business_plan_id UUID;
BEGIN
    SELECT id INTO basic_plan_id FROM plans WHERE name = 'basic';
    SELECT id INTO professional_plan_id FROM plans WHERE name = 'professional';
    SELECT id INTO business_plan_id FROM plans WHERE name = 'business';

    -- Basic plan: No automated reminders or Google Calendar sync
    INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
    (basic_plan_id, 'automated_reminders', false),
    (basic_plan_id, 'sms_reminders', false),
    (basic_plan_id, 'whatsapp_reminders', false),
    (basic_plan_id, 'google_calendar_sync', false)
    ON CONFLICT (plan_id, feature_name) DO NOTHING;

    -- Professional plan: SMS reminders and Google Calendar sync
    INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
    (professional_plan_id, 'automated_reminders', true),
    (professional_plan_id, 'sms_reminders', true),
    (professional_plan_id, 'whatsapp_reminders', false),
    (professional_plan_id, 'google_calendar_sync', true)
    ON CONFLICT (plan_id, feature_name) DO NOTHING;

    -- Business plan: All features (SMS, WhatsApp reminders, Google Calendar sync)
    INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
    (business_plan_id, 'automated_reminders', true),
    (business_plan_id, 'sms_reminders', true),
    (business_plan_id, 'whatsapp_reminders', true),
    (business_plan_id, 'google_calendar_sync', true)
    ON CONFLICT (plan_id, feature_name) DO NOTHING;
END $$;

