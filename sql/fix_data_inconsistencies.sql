-- ================================================================
-- Fix Data Inconsistencies
-- Created: 2026-01-15
-- Description: SQL to fix discovered data issues
-- ================================================================

-- ============================================================
-- FIX 1: Recalculate Contract Payment Totals
-- Update total_paid and balance_due based on actual payments
-- ============================================================
UPDATE contracts c
SET
    total_paid = COALESCE(p.actual_paid, 0),
    balance_due = CASE 
        WHEN c.contract_amount > 0 THEN GREATEST(0, c.contract_amount - COALESCE(p.actual_paid, 0))
        ELSE 0
    END,
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT 
        contract_id,
        SUM(amount) as actual_paid
    FROM payments
    WHERE payment_status = 'completed'
    AND contract_id IS NOT NULL
    GROUP BY contract_id
) p
WHERE c.id = p.contract_id
AND (
    ABS(COALESCE(c.total_paid, 0) - COALESCE(p.actual_paid, 0)) > 0.01
    OR c.balance_due < 0
);

-- Also update contracts with no payments
UPDATE contracts
SET
    total_paid = 0,
    balance_due = CASE 
        WHEN contract_amount > 0 THEN contract_amount
        ELSE 0
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE id NOT IN (
    SELECT DISTINCT contract_id 
    FROM payments 
    WHERE contract_id IS NOT NULL 
    AND payment_status = 'completed'
)
AND (total_paid > 0 OR balance_due < 0);


-- ============================================================
-- FIX 2: Fix Overpaid Invoices with zero total_amount
-- Set balance_due to 0 and mark as paid
-- ============================================================
UPDATE invoices
SET
    balance_due = 0,
    payment_status = 'paid',
    updated_at = CURRENT_TIMESTAMP
WHERE total_amount = 0 
AND paid_amount > 0;


-- ============================================================
-- FIX 3: Recalculate All Invoice Amounts from Payments
-- This ensures paid_amount matches actual payments
-- ============================================================
UPDATE invoices i
SET
    paid_amount = COALESCE(p.total_paid, 0),
    balance_due = GREATEST(0, i.total_amount - COALESCE(p.total_paid, 0)),
    payment_status = CASE
        WHEN COALESCE(p.total_paid, 0) <= 0 THEN 'unpaid'
        WHEN COALESCE(p.total_paid, 0) >= i.total_amount THEN 'paid'
        ELSE 'partial'
    END,
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT 
        invoice_id,
        SUM(amount) as total_paid
    FROM payments
    WHERE payment_status = 'completed'
    AND invoice_id IS NOT NULL
    GROUP BY invoice_id
) p
WHERE i.id = p.invoice_id;


-- ============================================================
-- VERIFICATION: Re-run health check after fixes
-- ============================================================
-- Run database_health_check.sql to verify fixes worked
