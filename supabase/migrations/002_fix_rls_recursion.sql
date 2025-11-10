-- Fix RLS infinite recursion by using SECURITY DEFINER functions
-- This migration fixes the circular dependency in RLS policies

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own business" ON businesses;
DROP POLICY IF EXISTS "Users can update their own business" ON businesses;
DROP POLICY IF EXISTS "Users can view users in their business" ON users;
DROP POLICY IF EXISTS "Users can insert users in their business" ON users;
DROP POLICY IF EXISTS "Users can update users in their business" ON users;
DROP POLICY IF EXISTS "Users can delete users in their business" ON users;
DROP POLICY IF EXISTS "Users can manage services in their business" ON services;
DROP POLICY IF EXISTS "Users can manage workers in their business" ON workers;
DROP POLICY IF EXISTS "Users can manage worker_services in their business" ON worker_services;
DROP POLICY IF EXISTS "Users can manage customers in their business" ON customers;
DROP POLICY IF EXISTS "Users can manage customer_tags in their business" ON customer_tags;
DROP POLICY IF EXISTS "Users can manage visits in their business" ON visits;
DROP POLICY IF EXISTS "Users can manage appointments in their business" ON appointments;
DROP POLICY IF EXISTS "Users can view settings for their business" ON settings;
DROP POLICY IF EXISTS "Users can update settings for their business" ON settings;
DROP POLICY IF EXISTS "Users can insert settings for their business" ON settings;
DROP POLICY IF EXISTS "Users can manage templates in their business" ON templates;

-- Create a SECURITY DEFINER function to get user's business_id
-- This bypasses RLS and can safely query the users table
CREATE OR REPLACE FUNCTION auth_user_business_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT business_id INTO result
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Recreate policies using the SECURITY DEFINER function (no recursion)

-- Businesses policies
-- Allow public read access (for booking pages)
CREATE POLICY "Anyone can view businesses"
    ON businesses FOR SELECT
    USING (true);

-- Allow authenticated users to update their own business
CREATE POLICY "Users can update their own business"
    ON businesses FOR UPDATE
    USING (id = auth_user_business_id());

-- Users policies (allow users to see themselves and others in their business)
CREATE POLICY "Users can view users in their business"
    ON users FOR SELECT
    USING (business_id = auth_user_business_id());

CREATE POLICY "Users can insert users in their business"
    ON users FOR INSERT
    WITH CHECK (business_id = auth_user_business_id());

CREATE POLICY "Users can update users in their business"
    ON users FOR UPDATE
    USING (business_id = auth_user_business_id());

CREATE POLICY "Users can delete users in their business"
    ON users FOR DELETE
    USING (business_id = auth_user_business_id());

-- Services policies
-- Allow public read access (for booking pages)
CREATE POLICY "Anyone can view services"
    ON services FOR SELECT
    USING (true);

-- Allow authenticated users to manage services in their business
CREATE POLICY "Users can manage services in their business"
    ON services FOR ALL
    USING (business_id = auth_user_business_id())
    WITH CHECK (business_id = auth_user_business_id());

-- Workers policies
-- Allow public read access (for booking pages)
CREATE POLICY "Anyone can view workers"
    ON workers FOR SELECT
    USING (true);

-- Allow authenticated users to manage workers in their business
CREATE POLICY "Users can manage workers in their business"
    ON workers FOR ALL
    USING (business_id = auth_user_business_id())
    WITH CHECK (business_id = auth_user_business_id());

-- Worker services policies
-- Allow public read access (for booking pages)
CREATE POLICY "Anyone can view worker_services"
    ON worker_services FOR SELECT
    USING (true);

-- Allow authenticated users to manage worker_services in their business
CREATE POLICY "Users can manage worker_services in their business"
    ON worker_services FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workers w
            WHERE w.id = worker_services.worker_id
            AND w.business_id = auth_user_business_id()
        )
    );

-- Customers policies
CREATE POLICY "Users can manage customers in their business"
    ON customers FOR ALL
    USING (business_id = auth_user_business_id())
    WITH CHECK (business_id = auth_user_business_id());

-- Customer tags policies
CREATE POLICY "Users can manage customer_tags in their business"
    ON customer_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM customers c
            WHERE c.id = customer_tags.customer_id
            AND c.business_id = auth_user_business_id()
        )
    );

-- Visits policies
CREATE POLICY "Users can manage visits in their business"
    ON visits FOR ALL
    USING (business_id = auth_user_business_id())
    WITH CHECK (business_id = auth_user_business_id());

-- Appointments policies
CREATE POLICY "Users can manage appointments in their business"
    ON appointments FOR ALL
    USING (business_id = auth_user_business_id())
    WITH CHECK (business_id = auth_user_business_id());

-- Settings policies
CREATE POLICY "Users can view settings for their business"
    ON settings FOR SELECT
    USING (business_id = auth_user_business_id());

CREATE POLICY "Users can update settings for their business"
    ON settings FOR UPDATE
    USING (business_id = auth_user_business_id());

CREATE POLICY "Users can insert settings for their business"
    ON settings FOR INSERT
    WITH CHECK (business_id = auth_user_business_id());

-- Templates policies
CREATE POLICY "Users can manage templates in their business"
    ON templates FOR ALL
    USING (business_id = auth_user_business_id())
    WITH CHECK (business_id = auth_user_business_id());

