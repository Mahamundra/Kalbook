-- ============================================================================
-- UPDATE BASIC PLAN PRICE
-- ============================================================================
-- Update basic plan price from 39 ILS to 29 ILS per month

UPDATE plans
SET price = 29
WHERE name = 'basic' AND price = 39;
