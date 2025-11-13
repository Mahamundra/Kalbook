-- ============================================================================
-- UPDATE PRICING TO PLAN A (Competitive Pricing)
-- ============================================================================
-- Basic: 39 ILS/month (after 14-day free trial)
-- Professional: 79 ILS/month
-- Business: 149 ILS/month
-- ============================================================================

-- Update existing plans with new prices
UPDATE plans 
SET price = 39,
    features = jsonb_set(
      COALESCE(features, '{}'::jsonb),
      '{max_bookings_per_month}',
      '100'
    )
WHERE name = 'basic';

UPDATE plans 
SET price = 79
WHERE name = 'professional';

UPDATE plans 
SET price = 149
WHERE name = 'business';

-- Verify the updates
SELECT name, price, features->>'max_bookings_per_month' as max_bookings
FROM plans
WHERE name IN ('basic', 'professional', 'business')
ORDER BY price;

-- Expected output:
-- basic        | 39  | 100
-- professional | 79  | -1 (unlimited)
-- business     | 149 | -1 (unlimited)

