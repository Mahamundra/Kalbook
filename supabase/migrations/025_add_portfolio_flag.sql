-- ============================================================================
-- PORTFOLIO MODE FEATURE
-- ============================================================================
-- Add is_portfolio flag to businesses table and create portfolio plan

-- 1. Add is_portfolio column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS is_portfolio BOOLEAN DEFAULT false;

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_businesses_is_portfolio 
ON businesses(is_portfolio);

-- 3. Add comment explaining the column purpose
COMMENT ON COLUMN businesses.is_portfolio IS 
'When true, business homepage shows portfolio view without login/booking functionality';

-- 4. Insert portfolio plan (free forever)
INSERT INTO plans (name, price, features, active) VALUES
('portfolio', 0, '{"max_staff": 0, "max_bookings_per_month": 0, "custom_branding": true, "analytics": false, "whatsapp_integration": false, "multi_language": true, "cloud_storage": true, "priority_support": false, "advanced_reports": false, "portfolio_mode": true}', true)
ON CONFLICT (name) DO NOTHING;

-- 5. Add portfolio plan features
DO $$
DECLARE
    portfolio_plan_id UUID;
BEGIN
    SELECT id INTO portfolio_plan_id FROM plans WHERE name = 'portfolio';
    
    -- Only insert if portfolio plan exists
    IF portfolio_plan_id IS NOT NULL THEN
        INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
        (portfolio_plan_id, 'create_appointments', false),
        (portfolio_plan_id, 'manage_customers', false),
        (portfolio_plan_id, 'manage_workers', false),
        (portfolio_plan_id, 'manage_services', true),
        (portfolio_plan_id, 'manage_templates', false),
        (portfolio_plan_id, 'view_analytics', false),
        (portfolio_plan_id, 'custom_branding', true),
        (portfolio_plan_id, 'whatsapp_integration', false),
        (portfolio_plan_id, 'multi_language', true),
        (portfolio_plan_id, 'cloud_storage', true),
        (portfolio_plan_id, 'priority_support', false),
        (portfolio_plan_id, 'advanced_reports', false),
        (portfolio_plan_id, 'portfolio_mode', true)
        ON CONFLICT (plan_id, feature_name) DO NOTHING;
    END IF;
END $$;
