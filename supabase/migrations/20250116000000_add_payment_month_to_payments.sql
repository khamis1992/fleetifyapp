-- Add payment_month field to payments table
-- This field stores the accounting month for the payment (YYYY-MM format)
-- Separate from payment_date which stores the actual date the payment was made

-- Add the column
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_month VARCHAR(7);

-- Add comment to explain the field
COMMENT ON COLUMN payments.payment_month IS 'Accounting month for the payment in YYYY-MM format. This may differ from payment_date which records the actual date of payment.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_payment_month 
ON payments(payment_month);

-- Create composite index for common queries (company + month)
CREATE INDEX IF NOT EXISTS idx_payments_company_month 
ON payments(company_id, payment_month);

-- Update existing records to set payment_month based on payment_date
-- This is a one-time migration for existing data
UPDATE payments 
SET payment_month = TO_CHAR(payment_date::date, 'YYYY-MM')
WHERE payment_month IS NULL;
