-- Update existing rental payment receipts with partial payment data
-- This populates amount_due, pending_balance, and payment_status for existing records

-- Update all existing records
UPDATE public.rental_payment_receipts
SET 
  amount_due = rent_amount + fine,
  pending_balance = GREATEST(0, (rent_amount + fine) - total_paid),
  payment_status = CASE
    WHEN total_paid >= (rent_amount + fine) THEN 'paid'
    WHEN total_paid > 0 THEN 'partial'
    ELSE 'pending'
  END
WHERE amount_due = 0 OR amount_due IS NULL;

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % existing rental payment receipts with partial payment data', updated_count;
END
$$;;
