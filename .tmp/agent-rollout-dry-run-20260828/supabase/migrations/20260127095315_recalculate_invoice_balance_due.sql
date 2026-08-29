-- Recalculate balance_due for all invoices
UPDATE invoices
SET
    balance_due = GREATEST(0, total_amount - COALESCE(paid_amount, 0)),
    updated_at = CURRENT_TIMESTAMP
WHERE balance_due != GREATEST(0, total_amount - COALESCE(paid_amount, 0))
   OR balance_due IS NULL;;
