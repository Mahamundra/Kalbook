-- Create admin user for business 899081 with phone 0546147474
-- Phone is converted to E.164 format: +972546147474

-- First, find the business UUID (run this to get the exact UUID):
SELECT id, slug, name 
FROM businesses 
WHERE id::text LIKE '%899081%' 
   OR slug = '899081'
   OR name LIKE '%899081%'
LIMIT 1;

-- Then use the UUID from above in this INSERT query:
INSERT INTO users (
    id,
    business_id,
    email,
    phone,
    name,
    role,
    is_main_admin
)
VALUES (
    gen_random_uuid(),
    'PASTE_BUSINESS_UUID_HERE',  -- Replace with UUID from query above
    NULL,
    '+972546147474',  -- 0546147474 in E.164 format
    'Admin User',
    'admin',
    false
)
RETURNING *;

