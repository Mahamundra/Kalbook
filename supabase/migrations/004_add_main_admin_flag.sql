-- Add is_main_admin flag to users table
-- This marks the main admin user created during business onboarding
-- Main admin users cannot be deleted

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_main_admin BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN users.is_main_admin IS 'Marks the main admin user created during business onboarding. Cannot be deleted.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_is_main_admin ON users(is_main_admin) WHERE is_main_admin = true;

