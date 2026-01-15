-- ================================================================
-- Database Health Check & Data Consistency Tests
-- Created: 2026-01-15
-- Description: Comprehensive tests to verify data integrity
-- ================================================================

-- ============================================================
-- TEST 1: Invoice Payment Consistency
-- Verify paid_amount matches sum of completed payments
-- ============================================================
SELECT 
    '❌ INVOICE_PAYMENT_MISMATCH' as test_type,
    i.invoice_number,
    i.total_amount,
    i.paid_amount as recorded_paid,
    COALESCE(p.actual_paid, 0) as actual_paid,
    i.balance_due as recorded_balance,
    (i.total_amount - COALESCE(p.actual_paid, 0)) as actual_balance,
    i.payment_status,
    CASE 
        WHEN COALESCE(p.actual_paid, 0) <= 0 THEN 'unpaid'
        WHEN COALESCE(p.actual_paid, 0) >= i.total_amount THEN 'paid'
        ELSE 'partial'
    END as expected_status
FROM invoices i
LEFT JOIN (
    SELECT invoice_id, SUM(amount) as actual_paid
    FROM payments
    WHERE payment_status = 'completed'
    GROUP BY invoice_id
) p ON i.id = p.invoice_id
WHERE 
    ABS(COALESCE(i.paid_amount, 0) - COALESCE(p.actual_paid, 0)) > 0.01
    OR ABS(COALESCE(i.balance_due, i.total_amount) - (i.total_amount - COALESCE(p.actual_paid, 0))) > 0.01
ORDER BY i.invoice_number;

-- ============================================================
-- TEST 2: Contract Payment Consistency
-- Verify total_paid matches sum of completed payments
-- ============================================================
SELECT 
    '❌ CONTRACT_PAYMENT_MISMATCH' as test_type,
    c.contract_number,
    c.contract_amount,
    c.total_paid as recorded_paid,
    COALESCE(p.actual_paid, 0) as actual_paid,
    c.balance_due as recorded_balance,
    (c.contract_amount - COALESCE(p.actual_paid, 0)) as actual_balance,
    c.status
FROM contracts c
LEFT JOIN (
    SELECT contract_id, SUM(amount) as actual_paid
    FROM payments
    WHERE payment_status = 'completed'
    GROUP BY contract_id
) p ON c.id = p.contract_id
WHERE 
    ABS(COALESCE(c.total_paid, 0) - COALESCE(p.actual_paid, 0)) > 0.01
ORDER BY c.contract_number;

-- ============================================================
-- TEST 3: Orphaned Payments (no invoice or contract)
-- ============================================================
SELECT 
    '⚠️ ORPHANED_PAYMENT' as test_type,
    payment_number,
    amount,
    payment_date,
    payment_status,
    invoice_id,
    contract_id
FROM payments
WHERE 
    invoice_id IS NULL 
    AND contract_id IS NULL
    AND payment_status = 'completed'
ORDER BY payment_date DESC
LIMIT 50;

-- ============================================================
-- TEST 4: Negative Balances
-- ============================================================
SELECT 
    '❌ NEGATIVE_BALANCE' as test_type,
    'invoice' as entity_type,
    invoice_number as entity_number,
    balance_due as balance
FROM invoices
WHERE balance_due < 0

UNION ALL

SELECT 
    '❌ NEGATIVE_BALANCE' as test_type,
    'contract' as entity_type,
    contract_number as entity_number,
    balance_due as balance
FROM contracts
WHERE balance_due < 0;

-- ============================================================
-- TEST 5: Overpaid Invoices (paid > total)
-- ============================================================
SELECT 
    '⚠️ OVERPAID_INVOICE' as test_type,
    invoice_number,
    total_amount,
    paid_amount,
    (paid_amount - total_amount) as overpayment
FROM invoices
WHERE paid_amount > total_amount + 0.01
ORDER BY (paid_amount - total_amount) DESC;

-- ============================================================
-- TEST 6: Trigger Functions Using Wrong Column Names
-- Check if any functions reference 'status' instead of 'payment_status'
-- ============================================================
SELECT 
    '❌ WRONG_COLUMN_IN_FUNCTION' as test_type,
    p.proname as function_name,
    'Uses status instead of payment_status' as issue
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%payments%'
AND pg_get_functiondef(p.oid) LIKE '%status%=%''completed''%'
AND pg_get_functiondef(p.oid) NOT LIKE '%payment_status%=%''completed''%';

-- ============================================================
-- TEST 7: Duplicate Payments (same invoice, date, amount)
-- ============================================================
SELECT 
    '⚠️ POTENTIAL_DUPLICATE_PAYMENT' as test_type,
    i.invoice_number,
    p.payment_date,
    p.amount,
    COUNT(*) as duplicate_count
FROM payments p
JOIN invoices i ON p.invoice_id = i.id
WHERE p.payment_status = 'completed'
GROUP BY i.invoice_number, p.payment_date, p.amount
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================================
-- TEST 8: Invoice Status Mismatch
-- ============================================================
SELECT 
    '❌ INVOICE_STATUS_MISMATCH' as test_type,
    invoice_number,
    total_amount,
    paid_amount,
    balance_due,
    payment_status as current_status,
    CASE 
        WHEN paid_amount IS NULL OR paid_amount <= 0 THEN 'unpaid'
        WHEN paid_amount >= total_amount THEN 'paid'
        ELSE 'partial'
    END as expected_status
FROM invoices
WHERE payment_status != 
    CASE 
        WHEN paid_amount IS NULL OR paid_amount <= 0 THEN 'unpaid'
        WHEN paid_amount >= total_amount THEN 'paid'
        ELSE 'partial'
    END
AND payment_status NOT IN ('cancelled', 'voided', 'draft')
ORDER BY invoice_number;

-- ============================================================
-- TEST 9: Late Fees Without Invoice
-- ============================================================
SELECT 
    '⚠️ LATE_FEE_NO_INVOICE' as test_type,
    lf.id as late_fee_id,
    lf.amount,
    lf.status,
    lf.invoice_id
FROM late_fees lf
LEFT JOIN invoices i ON lf.invoice_id = i.id
WHERE i.id IS NULL
AND lf.invoice_id IS NOT NULL;

-- ============================================================
-- TEST 10: Contracts with Invalid Dates
-- ============================================================
SELECT 
    '❌ INVALID_CONTRACT_DATES' as test_type,
    contract_number,
    start_date,
    end_date,
    CASE 
        WHEN end_date < start_date THEN 'End before Start'
        WHEN start_date IS NULL THEN 'Missing Start Date'
        WHEN end_date IS NULL THEN 'Missing End Date'
    END as issue
FROM contracts
WHERE 
    end_date < start_date
    OR start_date IS NULL
    OR end_date IS NULL;

-- ============================================================
-- TEST 11: Foreign Key Integrity - Payments
-- ============================================================
SELECT 
    '❌ FK_INTEGRITY_PAYMENT_INVOICE' as test_type,
    p.payment_number,
    p.invoice_id,
    'Invoice not found' as issue
FROM payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
WHERE p.invoice_id IS NOT NULL AND i.id IS NULL;

SELECT 
    '❌ FK_INTEGRITY_PAYMENT_CONTRACT' as test_type,
    p.payment_number,
    p.contract_id,
    'Contract not found' as issue
FROM payments p
LEFT JOIN contracts c ON p.contract_id = c.id
WHERE p.contract_id IS NOT NULL AND c.id IS NULL;

-- ============================================================
-- TEST 12: Zero Amount Completed Payments
-- ============================================================
SELECT 
    '⚠️ ZERO_AMOUNT_PAYMENT' as test_type,
    payment_number,
    amount,
    payment_status,
    created_at
FROM payments
WHERE amount <= 0 AND payment_status = 'completed'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- SUMMARY: Count Issues by Type
-- ============================================================
WITH all_issues AS (
    -- Invoice Payment Mismatch
    SELECT 'INVOICE_PAYMENT_MISMATCH' as issue_type, COUNT(*) as count
    FROM invoices i
    LEFT JOIN (
        SELECT invoice_id, SUM(amount) as actual_paid
        FROM payments WHERE payment_status = 'completed' GROUP BY invoice_id
    ) p ON i.id = p.invoice_id
    WHERE ABS(COALESCE(i.paid_amount, 0) - COALESCE(p.actual_paid, 0)) > 0.01
    
    UNION ALL
    
    -- Contract Payment Mismatch
    SELECT 'CONTRACT_PAYMENT_MISMATCH', COUNT(*)
    FROM contracts c
    LEFT JOIN (
        SELECT contract_id, SUM(amount) as actual_paid
        FROM payments WHERE payment_status = 'completed' GROUP BY contract_id
    ) p ON c.id = p.contract_id
    WHERE ABS(COALESCE(c.total_paid, 0) - COALESCE(p.actual_paid, 0)) > 0.01
    
    UNION ALL
    
    -- Negative Balances
    SELECT 'NEGATIVE_BALANCE_INVOICE', COUNT(*) FROM invoices WHERE balance_due < 0
    
    UNION ALL
    
    SELECT 'NEGATIVE_BALANCE_CONTRACT', COUNT(*) FROM contracts WHERE balance_due < 0
    
    UNION ALL
    
    -- Overpaid Invoices
    SELECT 'OVERPAID_INVOICE', COUNT(*) FROM invoices WHERE paid_amount > total_amount + 0.01
    
    UNION ALL
    
    -- Invoice Status Mismatch
    SELECT 'INVOICE_STATUS_MISMATCH', COUNT(*)
    FROM invoices
    WHERE payment_status != CASE 
        WHEN paid_amount IS NULL OR paid_amount <= 0 THEN 'unpaid'
        WHEN paid_amount >= total_amount THEN 'paid'
        ELSE 'partial'
    END
    AND payment_status NOT IN ('cancelled', 'voided', 'draft')
)
SELECT 
    '📊 SUMMARY' as report,
    issue_type,
    count,
    CASE 
        WHEN count = 0 THEN '✅ PASS'
        WHEN count < 5 THEN '⚠️ WARNING'
        ELSE '❌ FAIL'
    END as status
FROM all_issues
ORDER BY count DESC;
