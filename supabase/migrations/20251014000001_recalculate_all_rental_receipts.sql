-- Migration: Recalculate all existing rental payment receipts based on current contract monthly_amount
-- This ensures all historical receipts reflect the current monthly rent
-- Created: 2025-10-14

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
  AND c.monthly_amount IS NOT NULL;

-- Step 2: Log the number of receipts updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Recalculated % rental payment receipts based on current contract monthly amounts', updated_count;
END $$;

-- Step 3: Create an audit log entry (if audit table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log'
  ) THEN
    INSERT INTO audit_log (
      table_name,
      action,
      description,
      created_at
    ) VALUES (
      'rental_payment_receipts',
      'bulk_recalculate',
      'Recalculated all rental payment receipts to match current contract monthly amounts',
      NOW()
    );
  END IF;
END $$;

-- Step 4: Verify the update by checking for any inconsistencies
-- This query should return 0 rows if all receipts are properly recalculated
DO $$
DECLARE
  inconsistent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO inconsistent_count
  FROM rental_payment_receipts rpr
  JOIN contracts c ON rpr.customer_id = c.customer_id AND c.status = 'active'
  WHERE rpr.rent_amount != c.monthly_amount;
  
  IF inconsistent_count > 0 THEN
    RAISE WARNING 'Found % receipts with inconsistent rent amounts after recalculation', inconsistent_count;
  ELSE
    RAISE NOTICE 'All receipts successfully recalculated - no inconsistencies found';
  END IF;
END $$;

-- Add helpful comment
COMMENT ON TABLE rental_payment_receipts IS 'Rental payment receipts - automatically recalculated when contract monthly_amount changes (as of 2025-10-14)';
