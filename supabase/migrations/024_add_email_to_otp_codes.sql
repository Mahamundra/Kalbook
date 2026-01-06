-- Add email and type columns to otp_codes table for email OTP support
ALTER TABLE otp_codes 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('phone', 'email'));

-- Update existing records to have type = 'phone'
UPDATE otp_codes 
SET type = 'phone' 
WHERE type IS NULL AND phone IS NOT NULL;

-- Add constraint: either phone OR email must be provided (not both, not neither)
ALTER TABLE otp_codes
ADD CONSTRAINT otp_codes_phone_or_email_check 
CHECK (
  (phone IS NOT NULL AND email IS NULL AND type = 'phone') OR
  (email IS NOT NULL AND phone IS NULL AND type = 'email')
);

-- Add indexes for email OTP lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email 
ON otp_codes(email) 
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_code 
ON otp_codes(email, code) 
WHERE email IS NOT NULL AND verified = false;

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_created 
ON otp_codes(email, created_at) 
WHERE email IS NOT NULL AND verified = false;

-- Add comments
COMMENT ON COLUMN otp_codes.email IS 'Email address for email-based OTP verification';
COMMENT ON COLUMN otp_codes.type IS 'Type of OTP: phone or email';







