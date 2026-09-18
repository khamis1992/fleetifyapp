-- Migration: Recalculate all existing rental payment receipts based on current contract monthly_amount
-- This ensures all historical receipts reflect the current monthly rent

-- Step 1: Update all rental_payment_receipts to match current contract monthly_amount
UPDATE rental_payment_receipts rpr
SET 
  rent_amount = c.monthly_amount,
  amount_due = c.monthly_amount + rpr.fine,
  pending_balance = GREATEST(0, (c.monthly_amount + rpr.fine) - rpr.total_paid),
  payment_status = CASE
    WHEN GREATEST(0, (c.monthly_amount + rpr.fine) - rpr.total_paid) = 0 THEN 'paid'
    WHEN rpr.total_paid > 0 THEN 'partial'
    ELSE 'pending'
  END,
  updated_at = NOW()
FROM contracts c
WHERE rpr.customer_id = c.customer_id
  AND c.status = 'active'
  AND c.monthly_amount IS NOT NULL;;
