-- ===============================================
-- Fleetify Diagnosis - Simple Table Format
-- For use in Supabase SQL Editor or any SQL client
-- ===============================================

-- ⚠️ STEP 1: Find your Company ID first
-- Run this to get your company ID:
SELECT id, name, created_at 
FROM companies 
ORDER BY created_at DESC 
LIMIT 10;

-- ⚠️ STEP 2: Replace 'YOUR_COMPANY_ID' below with the actual UUID from Step 1

-- ==========================================
-- 1. CHART OF ACCOUNTS SUMMARY
-- ==========================================
SELECT 
    '1. Chart of Accounts' as check_name,
    account_type,
    COUNT(*) as total,
    COUNT(CASE WHEN is_active THEN 1 END) as active,
    ROUND(SUM(COALESCE(current_balance, 0))::numeric, 2) as balance
FROM chart_of_accounts
WHERE company_id = 'YOUR_COMPANY_ID'::uuid
GROUP BY account_type
ORDER BY account_type;

-- ==========================================
-- 2. ESSENTIAL ACCOUNTS CHECK
-- ==========================================
SELECT 
    '2. Essential Accounts' as check_name,
    codes.code as required_code,
    codes.name as description,
    CASE WHEN ca.id IS NOT NULL THEN '✓' ELSE '✗' END as exists,
    ca.account_name,
    COALESCE(ca.current_balance, 0) as balance
FROM (VALUES 
    ('1111', 'Cash on Hand'),
    ('1121', 'Bank Account'),
    ('1211', 'Accounts Receivable'),
    ('2111', 'Accounts Payable'),
    ('4111', 'Rental Revenue'),
    ('5111', 'Maintenance Expenses')
) AS codes(code, name)
LEFT JOIN chart_of_accounts ca 
    ON ca.account_code = codes.code 
    AND ca.company_id = 'YOUR_COMPANY_ID'::uuid
ORDER BY codes.code;

-- ==========================================
-- 3. COMPANY ACCOUNT MAPPINGS
-- ==========================================
SELECT 
    '3. Account Mappings' as check_name,
    CASE WHEN default_receivables_account_id IS NOT NULL THEN '✓' ELSE '✗' END as receivables,
    CASE WHEN default_revenue_account_id IS NOT NULL THEN '✓' ELSE '✗' END as revenue,
    CASE WHEN default_cash_account_id IS NOT NULL THEN '✓' ELSE '✗' END as cash,
    CASE WHEN default_bank_account_id IS NOT NULL THEN '✓' ELSE '✗' END as bank,
    CASE 
        WHEN default_receivables_account_id IS NOT NULL 
             AND default_revenue_account_id IS NOT NULL 
        THEN '✓ Configured'
        ELSE '✗ NOT CONFIGURED'
    END as overall_status
FROM companies
WHERE id = 'YOUR_COMPANY_ID'::uuid;

-- ==========================================
-- 4. JOURNAL ENTRIES SUMMARY
-- ==========================================
SELECT 
    '4. Journal Entries' as check_name,
    status,
    COUNT(*) as count,
    ROUND(SUM(COALESCE(total_debit, 0))::numeric, 2) as total_debits,
    ROUND(SUM(COALESCE(total_credit, 0))::numeric, 2) as total_credits,
    MIN(entry_date) as earliest,
    MAX(entry_date) as latest
FROM journal_entries
WHERE company_id = 'YOUR_COMPANY_ID'::uuid
GROUP BY status
ORDER BY status;

-- ==========================================
-- 5. PAYMENTS SUMMARY
-- ==========================================
SELECT 
    '5. Payments' as check_name,
    COUNT(*) as total_payments,
    COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
    ROUND(SUM(COALESCE(amount, 0))::numeric, 2) as total_amount
FROM payments
WHERE company_id = 'YOUR_COMPANY_ID'::uuid;

-- ==========================================
-- 6. CONTRACTS WITH JOURNAL ENTRIES
-- ==========================================
SELECT 
    '6. Contracts' as check_name,
    COUNT(*) as total,
    COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END) as with_entry,
    COUNT(CASE WHEN journal_entry_id IS NULL THEN 1 END) as without_entry,
    ROUND(
        (COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::float / 
         NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
    ) as percentage_with_entry
FROM contracts
WHERE company_id = 'YOUR_COMPANY_ID'::uuid;

-- ==========================================
-- 7. SYSTEM HEALTH SCORE
-- ==========================================
WITH health_metrics AS (
    SELECT 
        COUNT(DISTINCT account_type) as account_types,
        COUNT(*) as total_accounts,
        SUM(COALESCE(current_balance, 0)) as total_balance,
        (SELECT COUNT(*) FROM journal_entries WHERE company_id = 'YOUR_COMPANY_ID'::uuid) as journal_count,
        (SELECT 
            CASE 
                WHEN default_receivables_account_id IS NOT NULL 
                     AND default_revenue_account_id IS NOT NULL 
                THEN 1 ELSE 0 
            END 
         FROM companies WHERE id = 'YOUR_COMPANY_ID'::uuid
        ) as mappings_configured
    FROM chart_of_accounts
    WHERE company_id = 'YOUR_COMPANY_ID'::uuid
)
SELECT 
    '7. Health Score' as check_name,
    CASE 
        WHEN account_types >= 5 THEN 25
        WHEN account_types >= 3 THEN 15
        ELSE 5
    END + 
    CASE WHEN mappings_configured = 1 THEN 25 ELSE 0 END +
    CASE 
        WHEN journal_count > 100 THEN 25
        WHEN journal_count > 10 THEN 15
        WHEN journal_count > 0 THEN 5
        ELSE 0
    END +
    CASE WHEN total_balance != 0 THEN 25 ELSE 0 END as total_score,
    CASE 
        WHEN account_types >= 5 THEN 25
        WHEN account_types >= 3 THEN 15
        ELSE 5
    END as coa_score,
    CASE WHEN mappings_configured = 1 THEN 25 ELSE 0 END as mapping_score,
    CASE 
        WHEN journal_count > 100 THEN 25
        WHEN journal_count > 10 THEN 15
        WHEN journal_count > 0 THEN 5
        ELSE 0
    END as journal_score,
    CASE WHEN total_balance != 0 THEN 25 ELSE 0 END as data_score
FROM health_metrics;

-- ==========================================
-- INTERPRETATION GUIDE
-- ==========================================
/*
HEALTH SCORE INTERPRETATION:
- 80-100: ✓ Excellent - System fully configured
- 60-79:  ⚠ Good - Minor issues
- 40-59:  ⚠ Fair - Needs attention
- 0-39:   ✗ Poor - Setup required

WHAT TO DO BASED ON RESULTS:
1. If Essential Accounts show ✗: Run setup_accounting.sql
2. If Account Mappings = ✗: Configure in company settings
3. If Total Balance = 0: Need opening balances
4. If Journal Entries = 0: System not initialized
*/

