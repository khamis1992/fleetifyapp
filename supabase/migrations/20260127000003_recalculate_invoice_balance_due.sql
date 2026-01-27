-- ================================================================
-- Migration: Recalculate Invoice Balance Due
-- Created: 2026-01-27
-- Description: Recalculate balance_due for all invoices based on paid_amount
-- ================================================================

-- Recalculate balance_due for all invoices
UPDATE invoices
SET
    balance_due = GREATEST(0, total_amount - COALESCE(paid_amount, 0)),
    updated_at = CURRENT_TIMESTAMP
WHERE balance_due != GREATEST(0, total_amount - COALESCE(paid_amount, 0))
   OR balance_due IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Recalculated balance_due for all invoices';
END $$;
