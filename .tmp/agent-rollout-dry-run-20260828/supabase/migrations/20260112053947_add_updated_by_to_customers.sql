
-- Add updated_by column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add comment for documentation
COMMENT ON COLUMN customers.updated_by IS 'User ID who last updated this customer record';
;
