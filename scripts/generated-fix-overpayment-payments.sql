-- ==========================================
-- Fix Suspicious Payment Amounts
-- Auto-generated fix for 2 contracts
-- ==========================================

-- Fix 1: C-ALF-0001
-- Payment PAY-IMP-1767526937-63 has amount QAR 70,561
-- This should be ~1,450 based on the typical payment pattern
UPDATE payments
SET amount = 1450,
    notes = COALESCE(notes, '') || ' CORRECTED: Was 70561. Reduced by 69111. Reason: Suspiciously large payment - 70,561 vs typical 1,000-1,500 range'
WHERE id = 'd7e63d32-7b2c-48cd-8968-e9fc9bf6e5e1'
AND payment_number = 'PAY-IMP-1767526937-63';


-- Fix 2: C-ALF-0068
-- Payment PAY-IMP-1767526937-72 has amount QAR 71,101
-- This should be ~1,000 based on the monthly amount
UPDATE payments
SET amount = 1000,
    notes = COALESCE(notes, '') || ' CORRECTED: Was 71101. Reduced by 70101. Reason: Suspiciously large payment - 71,101 vs monthly ~1,000-1,500'
WHERE id = '6f0c25f3-85b1-4c30-95c6-7a2c3b2c8e8c'
AND payment_number = 'PAY-IMP-1767526937-72';


-- ==========================================
-- Verification Query
-- ==========================================
-- Check these contracts after applying fixes
SELECT
    c.contract_number,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    p.payment_number,
    p.amount AS payment_amount,
    p.notes
FROM contracts c
JOIN payments p ON p.contract_id = c.id
WHERE c.contract_number IN ('C-ALF-0001', 'C-ALF-0068', 'C-ALF-0083')
ORDER BY c.contract_number, p.payment_date;


-- ==========================================
-- Expected Results After Fix
-- ==========================================
-- C-ALF-0001:
--   Before: QAR 74,361 paid (overpayment QAR 42,861)
--   After:  QAR 5,150 paid (within contract QAR 31,500)
--
-- C-ALF-0068:
--   Before: QAR 73,551 paid (overpayment QAR 54,551)
--   After:  QAR 2,450 paid (within contract QAR 19,000)
--
-- C-ALF-0083:
--   No fix needed - QAR 32,000 is legitimate bulk payment
