-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. businesses table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'USD',
    business_type TEXT CHECK (business_type IN ('barbershop', 'nail_salon', 'gym_trainer', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. users table (business owners/admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('owner', 'admin')) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, email)
);

-- 3. services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    duration INTEGER NOT NULL, -- in minutes
    price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. workers table
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    color TEXT DEFAULT '#3B82F6', -- hex color for calendar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. worker_services table (many-to-many)
CREATE TABLE worker_services (
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (worker_id, service_id)
);

-- 6. customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    last_visit DATE,
    notes TEXT,
    date_of_birth DATE,
    gender TEXT,
    consent_marketing BOOLEAN DEFAULT false,
    blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. customer_tags table (many-to-many)
CREATE TABLE customer_tags (
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (customer_id, tag)
);

-- 8. visits table (customer visit history)
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    service_name TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    "start" TIMESTAMPTZ NOT NULL,
    "end" TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'pending', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK ("end" > "start")
);

-- 10. settings table (business settings as JSONB)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    branding JSONB DEFAULT '{}',
    locale JSONB DEFAULT '{}',
    notifications JSONB DEFAULT '{}',
    calendar JSONB DEFAULT '{}',
    registration JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. templates table (email/SMS templates)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('email', 'message')) NOT NULL,
    type TEXT CHECK (type IN ('booking_confirmation', 'reminder', 'cancellation')) NOT NULL,
    locale TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. otp_codes table (phone verification)
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL CHECK (char_length(code) = 6),
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index on business_id for all tenant tables (for multi-tenant isolation)
CREATE INDEX idx_users_business_id ON users(business_id);
CREATE INDEX idx_services_business_id ON services(business_id);
CREATE INDEX idx_workers_business_id ON workers(business_id);
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_visits_business_id ON visits(business_id);
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_settings_business_id ON settings(business_id);
CREATE INDEX idx_templates_business_id ON templates(business_id);

-- Index on slug for businesses (for URL routing)
CREATE INDEX idx_businesses_slug ON businesses(slug);

-- Index on phone for customers and otp_codes
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);

-- Index on start/end dates for appointments (for calendar queries)
CREATE INDEX idx_appointments_start ON appointments("start");
CREATE INDEX idx_appointments_end ON appointments("end");
CREATE INDEX idx_appointments_start_end ON appointments("start", "end");
CREATE INDEX idx_appointments_business_start ON appointments(business_id, "start");

-- Index on customer_id for appointments and visits
CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_visits_customer_id ON visits(customer_id);

-- Index on worker_id for appointments
CREATE INDEX idx_appointments_worker_id ON appointments(worker_id);

-- Index on service_id for appointments
CREATE INDEX idx_appointments_service_id ON appointments(service_id);

-- Index on status for appointments
CREATE INDEX idx_appointments_status ON appointments(status);

-- Index on worker_services for efficient lookups
CREATE INDEX idx_worker_services_worker_id ON worker_services(worker_id);
CREATE INDEX idx_worker_services_service_id ON worker_services(service_id);

-- Index on customer_tags
CREATE INDEX idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX idx_customer_tags_tag ON customer_tags(tag);

-- Index on otp_codes for verification lookups
CREATE INDEX idx_otp_codes_phone_code ON otp_codes(phone, code);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Note: These policies assume you'll use Supabase Auth and store business_id
-- in the user's metadata or have a separate user_business mapping table.
-- Adjust based on your authentication strategy.

-- Helper function to get user's business_id
-- This assumes you store business_id in auth.users.raw_user_meta_data
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() ->> 'business_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: If you have a user_business mapping in your users table
CREATE OR REPLACE FUNCTION get_current_user_business_id(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT business_id FROM users WHERE id = user_uuid LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Businesses policies
CREATE POLICY "Users can view their own business"
    ON businesses FOR SELECT
    USING (
        id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own business"
    ON businesses FOR UPDATE
    USING (
        id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Users policies
CREATE POLICY "Users can view users in their business"
    ON users FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert users in their business"
    ON users FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update users in their business"
    ON users FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete users in their business"
    ON users FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Services policies
CREATE POLICY "Users can manage services in their business"
    ON services FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Workers policies
CREATE POLICY "Users can manage workers in their business"
    ON workers FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Worker services policies
CREATE POLICY "Users can manage worker_services in their business"
    ON worker_services FOR ALL
    USING (
        worker_id IN (
            SELECT w.id FROM workers w
            INNER JOIN users u ON w.business_id = u.business_id
            WHERE u.id = auth.uid()
        )
    );

-- Customers policies
CREATE POLICY "Users can manage customers in their business"
    ON customers FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Customer tags policies
CREATE POLICY "Users can manage customer_tags in their business"
    ON customer_tags FOR ALL
    USING (
        customer_id IN (
            SELECT c.id FROM customers c
            INNER JOIN users u ON c.business_id = u.business_id
            WHERE u.id = auth.uid()
        )
    );

-- Visits policies
CREATE POLICY "Users can manage visits in their business"
    ON visits FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Appointments policies
CREATE POLICY "Users can manage appointments in their business"
    ON appointments FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Settings policies
CREATE POLICY "Users can view settings for their business"
    ON settings FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update settings for their business"
    ON settings FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert settings for their business"
    ON settings FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Templates policies
CREATE POLICY "Users can manage templates in their business"
    ON templates FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- OTP codes policies
-- OTP codes are public (phone-based verification), but we can restrict to prevent enumeration
CREATE POLICY "Anyone can insert OTP codes"
    ON otp_codes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can verify OTP codes"
    ON otp_codes FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update OTP codes"
    ON otp_codes FOR UPDATE
    USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE businesses IS 'Multi-tenant root table - stores business/tenant information';
COMMENT ON TABLE users IS 'Business owners/admins with access to admin panel';
COMMENT ON TABLE services IS 'Services offered by each business';
COMMENT ON TABLE workers IS 'Staff members/workers who provide services';
COMMENT ON TABLE worker_services IS 'Many-to-many relationship: which workers can provide which services';
COMMENT ON TABLE customers IS 'Customer information for each business';
COMMENT ON TABLE customer_tags IS 'Many-to-many tags for customer categorization';
COMMENT ON TABLE visits IS 'Historical customer visit records';
COMMENT ON TABLE appointments IS 'Booking appointments with status tracking';
COMMENT ON TABLE settings IS 'Business settings stored as JSONB for flexibility';
COMMENT ON TABLE templates IS 'Email/SMS templates for notifications';
COMMENT ON TABLE otp_codes IS 'Phone verification codes (not tenant-specific)';

