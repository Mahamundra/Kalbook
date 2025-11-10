-- Verify your businesses are properly separated
-- Run this to check all businesses and their customer counts

-- 1. List all businesses
SELECT 
  id, 
  slug, 
  name, 
  business_type,
  created_at
FROM businesses 
ORDER BY created_at;

-- 2. Check customer counts per business
SELECT 
  b.slug,
  b.name,
  COUNT(c.id) as customer_count
FROM businesses b
LEFT JOIN customers c ON c.business_id = b.id
GROUP BY b.id, b.slug, b.name
ORDER BY b.created_at;

-- 3. Check which business each user belongs to
SELECT 
  u.id as user_id,
  u.email,
  u.name as user_name,
  b.slug as business_slug,
  b.name as business_name,
  b.id as business_id
FROM users u
JOIN businesses b ON b.id = u.business_id
ORDER BY b.slug;

-- 4. Check if you have duplicate slugs (should be none)
SELECT slug, COUNT(*) as count
FROM businesses
GROUP BY slug
HAVING COUNT(*) > 1;

