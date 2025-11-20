-- Make email optional in users table
-- This allows phone-only authentication without requiring an email

ALTER TABLE users
ALTER COLUMN email DROP NOT NULL;

-- Note: The UNIQUE constraint on (business_id, email) will still work
-- PostgreSQL allows multiple NULL values in a UNIQUE constraint

