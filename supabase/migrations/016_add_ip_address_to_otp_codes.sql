-- Add IP address column to otp_codes table for rate limiting
ALTER TABLE otp_codes 
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Add index for faster rate limiting queries by IP
CREATE INDEX IF NOT EXISTS idx_otp_codes_ip_created 
ON otp_codes(ip_address, created_at) 
WHERE verified = false;

-- Add comment
COMMENT ON COLUMN otp_codes.ip_address IS 'IP address of the client that requested the OTP, used for rate limiting';

