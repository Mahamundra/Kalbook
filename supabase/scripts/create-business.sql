-- Script to create a new business
-- Usage: Replace the values below and run in Supabase SQL Editor

INSERT INTO businesses (slug, name, email, phone, business_type)
VALUES (
  'demo-lox',           -- Change this to your desired slug
  'Demo lox',           -- Change this to your business name
  'lox@example.com',          -- Change this to your email
  '+1234567890',               -- Change this to your phone
  'other'                      -- Must be one of: 'barbershop', 'nail_salon', 'gym_trainer', 'other'
)
RETURNING id, slug, name;

-- After creating the business, you'll need to:
-- 1. Create a user for this business (link to your auth user)
-- 2. The returned id is your business_id

-- Example: Create a user for this business
-- (Replace USER_AUTH_ID with your actual auth.users.id)
-- INSERT INTO users (id, business_id, email, name, role)
-- VALUES (
--   'USER_AUTH_ID',  -- This should be the id from auth.users table
--   (SELECT id FROM businesses WHERE slug = 'demo-barbershop'),
--   'owner@example.com',
--   'Owner Name',
--   'owner'
-- );

