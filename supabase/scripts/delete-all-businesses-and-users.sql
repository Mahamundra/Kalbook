-- ============================================================================
-- DELETE ALL BUSINESSES AND USERS
-- ============================================================================
-- WARNING: This script will permanently delete ALL businesses and users
-- and all related data (appointments, customers, services, workers, etc.)
-- 
-- This is a destructive operation and cannot be undone!
-- ============================================================================

-- First, let's see what we're about to delete (optional - for verification)
-- Uncomment the following lines to see counts before deletion:

-- SELECT 'businesses' as table_name, COUNT(*) as count FROM businesses
-- UNION ALL
-- SELECT 'users', COUNT(*) FROM users
-- UNION ALL
-- SELECT 'appointments', COUNT(*) FROM appointments
-- UNION ALL
-- SELECT 'customers', COUNT(*) FROM customers
-- UNION ALL
-- SELECT 'services', COUNT(*) FROM services
-- UNION ALL
-- SELECT 'workers', COUNT(*) FROM workers
-- UNION ALL
-- SELECT 'settings', COUNT(*) FROM settings
-- UNION ALL
-- SELECT 'templates', COUNT(*) FROM templates
-- UNION ALL
-- SELECT 'visits', COUNT(*) FROM visits
-- UNION ALL
-- SELECT 'activity_logs', COUNT(*) FROM activity_logs
-- UNION ALL
-- SELECT 'reminder_queue', COUNT(*) FROM reminder_queue
-- UNION ALL
-- SELECT 'google_calendar_tokens', COUNT(*) FROM google_calendar_tokens
-- UNION ALL
-- SELECT 'google_calendar_sync', COUNT(*) FROM google_calendar_sync
-- UNION ALL
-- SELECT 'appointment_participants', COUNT(*) FROM appointment_participants;

-- ============================================================================
-- DELETE OPERATIONS
-- ============================================================================

-- Disable RLS temporarily to allow deletion (if needed)
-- Note: You may need to run this as a superuser or with service role
SET LOCAL row_security = off;

-- Delete all businesses
-- This will CASCADE delete all related data including:
-- - users (business owners/admins)
-- - services
-- - workers
-- - customers
-- - appointments
-- - settings
-- - templates
-- - visits
-- - activity_logs
-- - reminder_queue
-- - google_calendar_tokens
-- - google_calendar_sync
-- - appointment_participants
-- - worker_services
-- - customer_tags
DELETE FROM businesses;

-- Re-enable RLS
SET LOCAL row_security = on;

-- ============================================================================
-- VERIFICATION (optional - uncomment to verify deletion)
-- ============================================================================

-- Verify that all businesses and users are deleted:
-- SELECT 'businesses' as table_name, COUNT(*) as remaining_count FROM businesses
-- UNION ALL
-- SELECT 'users', COUNT(*) FROM users;

-- Expected result: both should return 0

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Tables that will NOT be deleted (they are not business-specific):
-- - plans (pricing plans)
-- - plan_features (plan feature configurations)
-- - super_admin_users (super admin accounts)
-- - otp_codes (phone verification codes - these are temporary anyway)
--
-- If you also want to delete these, you can run:
-- DELETE FROM otp_codes;
-- DELETE FROM super_admin_users;
-- (Note: plans and plan_features should probably be kept as they are system-wide)
--
-- ============================================================================

