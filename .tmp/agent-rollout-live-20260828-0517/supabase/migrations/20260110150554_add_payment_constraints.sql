-- ================================================================
-- Migration: Payment Validation Constraints
-- Created: 2026-01-10
-- Description: Add CHECK constraints to validate payment data at database level
-- Impact: HIGH - Prevents invalid data from being saved
-- ================================================================

-- ============================================================================
-- Step 1: Payment Amount Constraints
-- ============================================================================

-- Ensure payment amounts are positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_amount_positive'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT payments_amount_positive
    CHECK (amount > 0);
  END IF;
END $$;

-- Ensure payment amounts are reasonable (max 10 million QAR)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_amount_reasonable'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT payments_amount_reasonable
    CHECK (amount <= 10000000);
  END IF;
END $$;

-- ============================================================================
-- Step 2: Payment Date Constraints
-- ============================================================================

-- Payment date should not be too far in the future (more than 2 years)
-- Adjusted from 30 days to 2 years to accommodate pre-scheduled payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_payment_date_not_future'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT payments_payment_date_not_future
    CHECK (payment_date <= CURRENT_DATE + INTERVAL '2 years');
  END IF;
END $$;

-- ============================================================================
-- Step 3: Payment Status Constraints
-- ============================================================================

-- Ensure payment_status is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_payment_status_valid'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT payments_payment_status_valid
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled', 'cleared', 'bounced'));
  END IF;
END $$;

-- ============================================================================
-- Step 4: Payment Method Constraints
-- ============================================================================

-- Ensure payment_method is valid (added 'received' to the list)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_payment_method_valid'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT payments_payment_method_valid
    CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'online_transfer', 'other', 'received'));
  END IF;
END $$;

-- ============================================================================
-- Step 5: Conditional Constraints
-- ============================================================================

-- If payment is by check, check_number must be provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_check_requires_number'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT payments_check_requires_number
    CHECK (
      NOT (payment_method = 'check' AND (check_number IS NULL OR check_number = ''))
    );
  END IF;
END $$;

-- ============================================================================
-- Step 6: Comments for documentation
-- ============================================================================

COMMENT ON CONSTRAINT payments_amount_positive ON payments IS
'Payment amounts must be greater than zero.';

COMMENT ON CONSTRAINT payments_amount_reasonable ON payments IS
'Payment amounts must be reasonable (maximum 10 million QAR). This prevents data entry errors.';

COMMENT ON CONSTRAINT payments_payment_date_not_future ON payments IS
'Payment date should not be more than 2 years in the future. Allows for pre-scheduled payments but prevents far-future dates.';

COMMENT ON CONSTRAINT payments_payment_status_valid ON payments IS
'Payment status must be one of the valid values: pending, completed, failed, cancelled, cleared, bounced.';

COMMENT ON CONSTRAINT payments_payment_method_valid ON payments IS
'Payment method must be one of the supported methods: cash, check, bank_transfer, credit_card, debit_card, online_transfer, other, received.';

COMMENT ON CONSTRAINT payments_check_requires_number ON payments IS
'Check payments must have a check number. This ensures check payments can be properly tracked and reconciled.';;
