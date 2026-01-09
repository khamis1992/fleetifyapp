-- ============================================================================
-- Migration: Prevent Duplicate Payments in Main Payments Table
-- Date: 2025-01-09
-- Author: System Security Fix
-- Description: Adds comprehensive duplicate prevention to the payments table
-- ============================================================================

-- Step 1: Add idempotency_key column to prevent duplicate requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments'
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.payments
    ADD COLUMN idempotency_key TEXT UNIQUE;

    COMMENT ON COLUMN public.payments.idempotency_key IS
    'Unique key to prevent duplicate payment requests from retries/double-submissions';
  END IF;
END $$;

-- Step 2: Add index for duplicate detection performance
CREATE INDEX IF NOT EXISTS idx_payments_duplicate_check
ON public.payments (company_id, customer_id, payment_date::date, amount)
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_contract_duplicate_check
ON public.payments (company_id, customer_id, contract_id, payment_date::date, amount)
WHERE customer_id IS NOT NULL AND contract_id IS NOT NULL;

-- Step 3: Add partial unique constraints for contract-based payments
-- This prevents exact duplicates (same company, customer, contract, date, amount)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prevent_duplicate_contract_payments'
  ) THEN
    ALTER TABLE public.payments
    ADD CONSTRAINT prevent_duplicate_contract_payments
    UNIQUE (company_id, customer_id, contract_id, payment_date, amount)
    USING INDEX idx_payments_contract_duplicate_check
    WHERE contract_id IS NOT NULL;

    COMMENT ON CONSTRAINT prevent_duplicate_contract_payments ON public.payments IS
    'Prevents duplicate payments for the same contract, date, and amount';
  END IF;
END $$;

-- Step 4: Add partial unique constraint for non-contract payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prevent_duplicate_general_payments'
  ) THEN
    ALTER TABLE public.payments
    ADD CONSTRAINT prevent_duplicate_general_payments
    EXCLUDE USING gist (
      company_id WITH =,
      customer_id WITH =,
      payment_date::date WITH =,
      amount WITH =
    )
    WHERE (contract_id IS NULL);

    COMMENT ON CONSTRAINT prevent_duplicate_general_payments ON public.payments IS
    'Prevents duplicate general payments (without contract) for same customer, date, and amount';
  END IF;
END $$;

-- Step 5: Create a function to check for potential duplicates before insert
CREATE OR REPLACE FUNCTION check_for_duplicate_payment()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INTEGER;
  duplicate_info TEXT;
BEGIN
  -- Skip if idempotency key is set (this is a retry)
  IF NEW.idempotency_key IS NOT NULL THEN
    -- Check if this idempotency key was already used
    SELECT COUNT(*) INTO duplicate_count
    FROM public.payments
    WHERE idempotency_key = NEW.idempotency_key
    AND id != COALESCE(NEW.id, gen_random_uuid()::TEXT);

    IF duplicate_count > 0 THEN
      RAISE EXCEPTION 'Duplicate request detected: idempotency key % already used', NEW.idempotency_key;
    END IF;

    RETURN NEW;
  END IF;

  -- For contract payments: check for potential duplicates (within 1 hour)
  IF NEW.contract_id IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT COUNT(*), string_agg(payment_number || ' (' || created_at::TEXT || ')', ', ')
    INTO duplicate_count, duplicate_info
    FROM public.payments
    WHERE company_id = NEW.company_id
    AND customer_id = NEW.customer_id
    AND contract_id = NEW.contract_id
    AND payment_date = NEW.payment_date
    AND amount = NEW.amount
    AND created_at > NOW() - INTERVAL '1 hour'
    AND id != COALESCE(NEW.id, gen_random_uuid()::TEXT);

    IF duplicate_count > 0 THEN
      RAISE EXCEPTION 'Potential duplicate payment detected. Existing payment(s) with same details found in last hour: %', duplicate_info;
    END IF;
  END IF;

  -- For non-contract payments: check for potential duplicates (within 1 hour)
  IF NEW.contract_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT COUNT(*), string_agg(payment_number || ' (' || created_at::TEXT || ')', ', ')
    INTO duplicate_count, duplicate_info
    FROM public.payments
    WHERE company_id = NEW.company_id
    AND customer_id = NEW.customer_id
    AND contract_id IS NULL
    AND payment_date::date = NEW.payment_date::date
    AND amount = NEW.amount
    AND created_at > NOW() - INTERVAL '1 hour'
    AND id != COALESCE(NEW.id, gen_random_uuid()::TEXT);

    IF duplicate_count > 0 THEN
      RAISE EXCEPTION 'Potential duplicate payment detected. Existing payment(s) with same details found in last hour: %', duplicate_info;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to enforce duplicate check
DROP TRIGGER IF EXISTS validate_payment_duplicate_before_insert ON public.payments;
CREATE TRIGGER validate_payment_duplicate_before_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION check_for_duplicate_payment();

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check existing duplicates (run this manually to see if any exist):
/*
SELECT
  company_id,
  customer_id,
  contract_id,
  payment_date::date as payment_day,
  amount,
  COUNT(*) as duplicate_count,
  STRING_AGG(payment_number, ', ') as payment_numbers,
  STRING_AGG(id, ', ') as payment_ids
FROM public.payments
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY company_id, customer_id, contract_id, payment_date::date, amount
HAVING COUNT(*) > 1;
*/

-- Verify indexes created:
/*
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'payments'
AND indexname LIKE '%duplicate%';
*/

-- Verify constraints created:
/*
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.payments'::regclass
AND conname LIKE '%duplicate%';
*/
