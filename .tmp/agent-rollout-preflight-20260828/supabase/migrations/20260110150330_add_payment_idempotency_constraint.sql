-- ================================================================
-- Migration: Add Idempotency Key Unique Constraint
-- Created: 2026-01-10
-- Description: Add unique constraint on idempotency_key to prevent duplicate payments
-- Impact: CRITICAL - Prevents duplicate payments
-- ================================================================

-- ============================================================================
-- Step 1: Add idempotency_key column if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'payments'
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE payments ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

-- ============================================================================
-- Step 2: Create unique index on idempotency_key
-- ============================================================================

-- Drop existing index if any
DROP INDEX IF EXISTS payments_idempotency_key_idx;

-- Create unique index (allows multiple NULLs, unique for non-NULL values)
-- Uses partial index for better performance
CREATE UNIQUE INDEX payments_idempotency_key_idx
ON payments (company_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- Step 3: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN payments.idempotency_key IS
'Unique key to prevent duplicate payments on retry. Generated client-side and included in payment creation. Format: "payment_{timestamp}_{random}"';

COMMENT ON INDEX payments_idempotency_key_idx IS
'Prevents duplicate payments with same idempotency key within same company. NULL values allowed for payments without idempotency key (legacy data).';

-- ============================================================================
-- Step 5: Create helper function for idempotency check
-- ============================================================================

CREATE OR REPLACE FUNCTION check_payment_idempotency(
  p_company_id UUID,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  payment_id UUID,
  payment_number VARCHAR,
  payment_amount NUMERIC,
  payment_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_idempotency_key IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.payment_number,
    p.amount,
    p.payment_date
  FROM payments p
  WHERE p.company_id = p_company_id
    AND p.idempotency_key = p_idempotency_key
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION check_payment_idempotency IS
'Helper function to check if a payment with given idempotency key already exists. Returns existing payment details or empty set.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION check_payment_idempotency TO authenticated;;
