-- ============================================================================
-- PLANS AND TRIAL SYSTEM
-- ============================================================================

-- 1. Plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    features JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Plan features table (for configurable features)
CREATE TABLE IF NOT EXISTS plan_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, feature_name)
);

-- 3. Update businesses table with plan and trial fields
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id),
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'));

-- 4. Super admin users table
CREATE TABLE IF NOT EXISTS super_admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_super_admin BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insert default plans (base prices in ILS)
-- Basic: 14 days free trial, then 39 ILS/month
-- Professional: 79 ILS/month
-- Business: 149 ILS/month
INSERT INTO plans (name, price, features, active) VALUES
('basic', 39, '{"max_staff": 1, "max_bookings_per_month": 100, "custom_branding": false, "analytics": false, "whatsapp_integration": false, "multi_language": true, "cloud_storage": false, "priority_support": false, "advanced_reports": false}', true),
('professional', 79, '{"max_staff": 5, "max_bookings_per_month": -1, "custom_branding": true, "analytics": true, "whatsapp_integration": true, "multi_language": true, "cloud_storage": true, "priority_support": true, "advanced_reports": true}', true),
('business', 149, '{"max_staff": 15, "max_bookings_per_month": -1, "custom_branding": true, "analytics": true, "whatsapp_integration": true, "multi_language": true, "cloud_storage": true, "priority_support": true, "advanced_reports": true, "api_access": true}', true)
ON CONFLICT (name) DO NOTHING;

-- 6. Insert default plan features
DO $$
DECLARE
    basic_plan_id UUID;
    professional_plan_id UUID;
    business_plan_id UUID;
BEGIN
    SELECT id INTO basic_plan_id FROM plans WHERE name = 'basic';
    SELECT id INTO professional_plan_id FROM plans WHERE name = 'professional';
    SELECT id INTO business_plan_id FROM plans WHERE name = 'business';

    -- Basic plan features (Free plan)
    INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
    (basic_plan_id, 'create_appointments', true),
    (basic_plan_id, 'manage_customers', true),
    (basic_plan_id, 'manage_workers', true),
    (basic_plan_id, 'manage_services', true),
    (basic_plan_id, 'manage_templates', true),
    (basic_plan_id, 'view_analytics', false),
    (basic_plan_id, 'custom_branding', false),
    (basic_plan_id, 'whatsapp_integration', false),
    (basic_plan_id, 'multi_language', true),
    (basic_plan_id, 'cloud_storage', false),
    (basic_plan_id, 'priority_support', false),
    (basic_plan_id, 'advanced_reports', false)
    ON CONFLICT (plan_id, feature_name) DO NOTHING;

    -- Professional plan features (49 ILS/month)
    INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
    (professional_plan_id, 'create_appointments', true),
    (professional_plan_id, 'manage_customers', true),
    (professional_plan_id, 'manage_workers', true),
    (professional_plan_id, 'manage_services', true),
    (professional_plan_id, 'manage_templates', true),
    (professional_plan_id, 'view_analytics', true),
    (professional_plan_id, 'custom_branding', true),
    (professional_plan_id, 'whatsapp_integration', true),
    (professional_plan_id, 'multi_language', true),
    (professional_plan_id, 'cloud_storage', true),
    (professional_plan_id, 'priority_support', true),
    (professional_plan_id, 'advanced_reports', true)
    ON CONFLICT (plan_id, feature_name) DO NOTHING;

    -- Business plan features (99 ILS/month)
    INSERT INTO plan_features (plan_id, feature_name, enabled) VALUES
    (business_plan_id, 'create_appointments', true),
    (business_plan_id, 'manage_customers', true),
    (business_plan_id, 'manage_workers', true),
    (business_plan_id, 'manage_services', true),
    (business_plan_id, 'manage_templates', true),
    (business_plan_id, 'view_analytics', true),
    (business_plan_id, 'custom_branding', true),
    (business_plan_id, 'whatsapp_integration', true),
    (business_plan_id, 'multi_language', true),
    (business_plan_id, 'cloud_storage', true),
    (business_plan_id, 'priority_support', true),
    (business_plan_id, 'advanced_reports', true)
    ON CONFLICT (plan_id, feature_name) DO NOTHING;
END $$;

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_plan_id ON businesses(plan_id);
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_status ON businesses(subscription_status);
CREATE INDEX IF NOT EXISTS idx_businesses_trial_ends_at ON businesses(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON plan_features(plan_id);

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Add triggers for updated_at (drop first if they exist to make migration idempotent)
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plan_features_updated_at ON plan_features;
CREATE TRIGGER update_plan_features_updated_at BEFORE UPDATE ON plan_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_super_admin_users_updated_at ON super_admin_users;
CREATE TRIGGER update_super_admin_users_updated_at BEFORE UPDATE ON super_admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUPER ADMIN SETUP
-- ============================================================================
-- 
-- To create the first super admin user, you have two options:
--
-- Option 1: Use the API endpoint (Recommended)
-- POST /api/super-admin/setup
-- Body: { "email": "admin@kalbook.com", "password": "secure-password", "name": "Super Admin" }
--
-- Option 2: Use the setup script
-- npx tsx scripts/setup-super-admin.ts
-- (Set SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME env vars)
--
-- Note: Only ONE super admin user is allowed. The system will prevent creating multiple.
--

