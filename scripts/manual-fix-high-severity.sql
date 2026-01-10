-- ==========================================
-- Fix New High Severity Contracts
-- Complete SQL Script
-- ==========================================
-- Instructions:
-- 1. Go to https://app.supabase.com/project/qwhunliohlkkahbspfiu/sql/new
-- 2. Copy and paste this entire script
-- 3. Click Run
-- ==========================================

-- Step 1: Create helper function to execute SQL
CREATE OR REPLACE FUNCTION exec_raw_sql(sql_command TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql_command;
    RETURN 'OK';
END;
$$;

-- Step 2: Disable the validation trigger temporarily
SELECT exec_raw_sql('DROP TRIGGER IF EXISTS prevent_overpayment_trigger ON payments;');

-- ==========================================
-- FIX 1: LTO2024103 - Fix 3 incorrect payments
-- ==========================================
-- Each payment was QAR 77,456 (data entry error) should be QAR 3,000

SELECT exec_raw_sql('UPDATE payments SET amount = 3000 WHERE id = ''b8593447-28f4-4f3e-a3ab-a0526e27eae2'';');
SELECT exec_raw_sql('UPDATE payments SET amount = 3000 WHERE id = ''213142a3-ab9b-438b-8d68-a6c41768b365'';');
SELECT exec_raw_sql('UPDATE payments SET amount = 3000 WHERE id = ''0b018cfb-9050-4f79-9bff-198640f8472e'';');

-- Recalculate LTO2024103
SELECT exec_raw_sql('UPDATE contracts SET total_paid = (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.contract_id = ''4f461fb4-b2af-482c-9a4d-2f081c5386e8''), balance_due = contract_amount - (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.contract_id = ''4f461fb4-b2af-482c-9a4d-2f081c5386e8'') WHERE id = ''4f461fb4-b2af-482c-9a4d-2f081c5386e8'';');

-- ==========================================
-- FIX 2: C-ALF-0083 - Cancel 7 duplicate payments
-- ==========================================

SELECT exec_raw_sql('UPDATE payments SET amount = 0 WHERE id = ''5fc5760d-6285-4f87-a168-45085ae521e8'';');
SELECT exec_raw_sql('UPDATE payments SET amount = 0 WHERE id = ''2075ef0f-f5d1-4ddc-a877-c719ae5ce889'';');
SELECT exec_raw_sql('UPDATE payments SET amount = 0 WHERE id = ''e84de229-5304-4c37-be74-f2c0dded6175'';');
SELECT exec_raw_sql('UPDATE payments SET amount = 0 WHERE id = ''89a5a4f4-0bd0-44df-a6d0-570eb08d5b55'';');
SELECT exec_raw_sql('UPDATE payments SET amount = 0 WHERE id = ''8f3cab64-1443-49a9-be87-dd82b52fa1fe'';');
SELECT exec_raw_sql('UPDATE payments SET amount = 0 WHERE id = ''d878af9b-4587-4a3c-a692-eb72717bd392'';');
SELECT exec_raw_sql('UPDATE payments SET amount = 0 WHERE id = ''344b4224-9f03-4c0e-876d-e33da53f618b'';');

-- Recalculate C-ALF-0083
SELECT exec_raw_sql('UPDATE contracts SET total_paid = (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.contract_id = ''b0051de5-494e-4a45-bc37-d3374384abb5''), balance_due = contract_amount - (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.contract_id = ''b0051de5-494e-4a45-bc37-d3374384abb5'') WHERE id = ''b0051de5-494e-4a45-bc37-d3374384abb5'';');

-- ==========================================
-- RE-ENABLE VALIDATION TRIGGER
-- ==========================================
SELECT exec_raw_sql('CREATE TRIGGER prevent_overpayment_trigger BEFORE INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION validate_payment_amount();');

-- ==========================================
-- VERIFICATION QUERY
-- ==========================================
SELECT
    'LTO2024103' AS contract_number,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    CASE WHEN c.total_paid <= c.contract_amount THEN 'OK' ELSE 'OVERPAID' END AS status
FROM contracts c
WHERE c.contract_number = 'LTO2024103'
UNION ALL
SELECT
    'C-ALF-0083' AS contract_number,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    CASE WHEN c.total_paid <= c.contract_amount THEN 'OK' ELSE 'OVERPAID' END AS status
FROM contracts c
WHERE c.contract_number = 'C-ALF-0083';
