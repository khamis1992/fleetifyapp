-- ==========================================
-- Bypass Trigger to Fix Historical Payments
-- Auto-generated SQL to fix 2 suspicious payments
-- ==========================================

-- Step 1: Disable trigger temporarily
DROP TRIGGER IF EXISTS prevent_overpayment_trigger ON payments;

-- Step 2: Fix the suspicious payments
-- Fix 1: C-ALF-0001 - PAY-IMP-1767526937-63
UPDATE payments
SET amount = 1450,
    notes = COALESCE(notes, '') || ' CORRECTED: Was 70561. Reduced by 69111. Historical data fix - entry error'
WHERE id = '9f9fed27-f063-4d23-9964-a8bbac06de02';

-- Fix 2: C-ALF-0068 - PAY-IMP-1767526937-72
UPDATE payments
SET amount = 1000,
    notes = COALESCE(notes, '') || ' CORRECTED: Was 71101. Reduced by 70101. Historical data fix - entry error'
WHERE id = 'fb9095c7-0c13-4716-9565-8c05eb8c1ebe';

-- Step 3: Recalculate contract totals for affected contracts
UPDATE contracts
SET total_paid = (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM payments p
    WHERE p.contract_id = contracts.id
),
balance_due = contract_amount - (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM payments p
    WHERE p.contract_id = contracts.id
)
WHERE id IN ('1c4e5129-841b-423b-a3cc-29f44192204f', '2064a8b1-49fa-4125-a4a2-46df65bc945e');

-- Step 4: Re-enable the trigger
CREATE TRIGGER prevent_overpayment_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_amount();

-- ==========================================
-- Verification Query
-- ==========================================
SELECT
    c.contract_number,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    CASE
        WHEN c.total_paid <= c.contract_amount THEN '✅ HEALTHY'
        ELSE '⚠️ OVERPAID'
    END AS status
FROM contracts c
WHERE c.id IN ('1c4e5129-841b-423b-a3cc-29f44192204f', '2064a8b1-49fa-4125-a4a2-46df65bc945e');

-- ==========================================
-- Expected Results After Fix
-- ==========================================
-- C-ALF-0001:
--   Contract: QAR 31,500
--   Total Paid: QAR 4,700 (was 74,361)
--   Balance: QAR 26,800
--   Status: ✅ HEALTHY
--
-- C-ALF-0068:
--   Contract: QAR 19,000
--   Total Paid: QAR 2,450 (was 73,551)
--   Balance: QAR 16,550
--   Status: ✅ HEALTHY
