-- Create your first business
-- Run this in Supabase SQL Editor or via the script

INSERT INTO businesses (
  slug,
  name,
  email,
  phone,
  whatsapp,
  address,
  timezone,
  currency,
  business_type
) VALUES (
  'demo-barbershop',                    -- slug (for URL routing)
  'Demo Barbershop',                     -- name
  'owner@example.com',                   -- email
  '+1234567890',                         -- phone
  '+1234567890',                         -- whatsapp (optional)
  '123 Main St, City, Country',         -- address
  'America/New_York',                    -- timezone (change to your timezone)
  'USD',                                 -- currency
  'barbershop'                           -- business_type: barbershop, nail_salon, gym_trainer, or other
)
RETURNING id, slug, name;

-- After creating the business, save the returned ID
-- You'll need it to create the first user






