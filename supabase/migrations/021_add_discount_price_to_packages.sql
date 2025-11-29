-- Add discount_price column to membership_packages table
ALTER TABLE membership_packages
ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10, 2);

-- Add comment
COMMENT ON COLUMN membership_packages.discount_price IS 'Discounted price for the package (optional)';

