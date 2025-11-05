-- ===============================================
-- Fleetify System Diagnosis Script
-- Purpose: Comprehensive diagnostic check
-- Date: 2025-11-05
-- ===============================================

-- IMPORTANT: Replace 'YOUR_COMPANY_ID' with actual company ID before running
\set company_id 'YOUR_COMPANY_ID'

\echo '========================================='
\echo 'Fleetify System Diagnosis Report'
\echo '========================================='
\echo ''

-- 1. Chart of Accounts Analysis
\echo '1. Chart of Accounts Status:'
\echo '------------------------------'
SELECT 
    account_type,
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_accounts,
    SUM(COALESCE(current_balance, 0)) as total_balance,
    MIN(account_code) as first_code,
    MAX(account_code) as last_code
FROM chart_of_accounts
WHERE company_id = :'company_id'
GROUP BY account_type
ORDER BY account_type;

\echo ''
\echo '2. Account Balance Summary:'
\echo '------------------------------'
SELECT 
    account_type,
    ROUND(SUM(COALESCE(current_balance, 0))::numeric, 2) as total
FROM chart_of_accounts
WHERE company_id = :'company_id'
  AND is_active = true
GROUP BY account_type
ORDER BY account_type;

\echo ''
\echo '3. Journal Entries Status:'
\echo '------------------------------'
SELECT 
    status,
    COUNT(*) as entry_count,
    ROUND(SUM(COALESCE(total_debit, 0))::numeric, 2) as total_debits,
    ROUND(SUM(COALESCE(total_credit, 0))::numeric, 2) as total_credits,
    MIN(entry_date) as earliest_entry,
    MAX(entry_date) as latest_entry
FROM journal_entries
WHERE company_id = :'company_id'
GROUP BY status
ORDER BY status;

\echo ''
\echo '4. Company Account Mappings:'
\echo '------------------------------'
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.default_receivables_account_id,
    c.default_revenue_account_id,
    c.default_cash_account_id,
    c.default_bank_account_id,
    CASE 
        WHEN c.default_receivables_account_id IS NOT NULL 
             AND c.default_revenue_account_id IS NOT NULL 
             AND c.default_cash_account_id IS NOT NULL 
        THEN 'Configured ✓'
        ELSE 'Not Configured ✗'
    END as mapping_status
FROM companies c
WHERE c.id = :'company_id';

\echo ''
\echo '5. Essential Accounts Check:'
\echo '------------------------------'
WITH essential_codes AS (
    SELECT unnest(ARRAY['1111', '1121', '1211', '2111', '4111', '5111']) as code
)
SELECT 
    ec.code as required_code,
    CASE 
        WHEN ca.id IS NOT NULL THEN '✓ Found'
        ELSE '✗ Missing'
    END as status,
    ca.account_name,
    ca.current_balance
FROM essential_codes ec
LEFT JOIN chart_of_accounts ca 
    ON ca.account_code = ec.code 
    AND ca.company_id = :'company_id'
ORDER BY ec.code;

\echo ''
\echo '6. RLS Policies Status:'
\echo '------------------------------'
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('payments', 'chart_of_accounts', 'journal_entries', 'companies')
ORDER BY tablename, policyname;

\echo ''
\echo '7. Recent Payments:'
\echo '------------------------------'
SELECT 
    COUNT(*) as total_payments,
    COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN payment_status = 'cancelled' THEN 1 END) as cancelled,
    ROUND(SUM(COALESCE(amount, 0))::numeric, 2) as total_amount,
    MIN(payment_date) as earliest,
    MAX(payment_date) as latest
FROM payments
WHERE company_id = :'company_id';

\echo ''
\echo '8. Contracts with Journal Entries:'
\echo '------------------------------'
SELECT 
    COUNT(*) as total_contracts,
    COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END) as with_journal_entry,
    COUNT(CASE WHEN journal_entry_id IS NULL THEN 1 END) as without_journal_entry,
    ROUND(
        (COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::float / 
         NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
    ) as percentage_with_entry
FROM contracts
WHERE company_id = :'company_id';

\echo ''
\echo '9. Database Size Information:'
\echo '------------------------------'
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('chart_of_accounts', 'journal_entries', 'payments', 'contracts', 'invoices')
ORDER BY size_bytes DESC;

\echo ''
\echo '10. System Health Score:'
\echo '------------------------------'
WITH health_metrics AS (
    SELECT 
        -- Chart of Accounts Score (0-25 points)
        CASE 
            WHEN COUNT(DISTINCT account_type) >= 5 THEN 25
            WHEN COUNT(DISTINCT account_type) >= 3 THEN 15
            ELSE 5
        END as coa_score,
        
        -- Account Mappings Score (0-25 points)
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM companies 
                WHERE id = :'company_id' 
                AND default_receivables_account_id IS NOT NULL 
                AND default_revenue_account_id IS NOT NULL
            ) THEN 25
            ELSE 0
        END as mapping_score,
        
        -- Journal Entries Score (0-25 points)
        CASE 
            WHEN COUNT(*) FILTER (WHERE je.id IS NOT NULL) > 100 THEN 25
            WHEN COUNT(*) FILTER (WHERE je.id IS NOT NULL) > 10 THEN 15
            WHEN COUNT(*) FILTER (WHERE je.id IS NOT NULL) > 0 THEN 5
            ELSE 0
        END as journal_score,
        
        -- Data Integrity Score (0-25 points)
        CASE 
            WHEN SUM(COALESCE(ca.current_balance, 0)) != 0 THEN 25
            ELSE 0
        END as data_score
        
    FROM chart_of_accounts ca
    LEFT JOIN journal_entries je ON je.company_id = ca.company_id
    WHERE ca.company_id = :'company_id'
)
SELECT 
    coa_score + mapping_score + journal_score + data_score as total_score,
    coa_score,
    mapping_score,
    journal_score,
    data_score,
    CASE 
        WHEN coa_score + mapping_score + journal_score + data_score >= 80 THEN '✓ Excellent'
        WHEN coa_score + mapping_score + journal_score + data_score >= 60 THEN '⚠ Good'
        WHEN coa_score + mapping_score + journal_score + data_score >= 40 THEN '⚠ Fair'
        ELSE '✗ Poor - Needs Setup'
    END as health_status
FROM health_metrics;

\echo ''
\echo '========================================='
\echo 'Diagnosis Complete!'
\echo '========================================='
\echo ''
\echo 'Next Steps:'
\echo '1. If health score < 60: Run setup_accounting.sql'
\echo '2. If RLS policies missing: Run fix_rls_policies.sql'
\echo '3. If account mappings missing: Configure in Admin Panel'
\echo ''

