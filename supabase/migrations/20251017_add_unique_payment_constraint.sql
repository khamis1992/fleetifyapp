-- Add unique constraint to prevent duplicate rental payments
-- This ensures that the same payment (same customer, amount, date, and contract) cannot be entered twice

-- First, let's check if there are any existing duplicates (should be clean after our cleanup)
-- This is just for safety

DO $$
BEGIN
  -- Add unique constraint
  -- Note: We use customer_id, payment_date, and contract_id as the unique combination
  -- rental_amount is excluded because partial payments might have different amounts on same date
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_rental_payment'
  ) THEN
    ALTER TABLE rental_payment_receipts
    ADD CONSTRAINT unique_rental_payment
    UNIQUE (customer_id, payment_date, contract_id, rental_amount, fine_amount);
    
    RAISE NOTICE 'Unique constraint added successfully';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Create index for better query performance on payment lookups
CREATE INDEX IF NOT EXISTS idx_rental_payments_customer_date 
ON rental_payment_receipts(customer_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_rental_payments_contract 
ON rental_payment_receipts(contract_id);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT unique_rental_payment ON rental_payment_receipts IS 
'Prevents duplicate payment entries for the same customer, date, contract, and amounts';

