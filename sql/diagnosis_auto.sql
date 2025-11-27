-- ===============================================
-- Fleetify Auto Diagnosis - No Manual Input Required!
-- Automatically uses the current user's company_id
-- Just copy and paste - it will work immediately!
-- ===============================================

-- ==========================================
-- STEP 0: Show Current User Info
-- ==========================================
SELECT 
    '0. Current User Info' as check_name,
    auth.uid() as user_id,
    p.company_id,
    c.name as company_name
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.id = auth.uid();

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
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
GROUP BY account_type
ORDER BY account_type;

-- ==========================================
-- 2. ESSENTIAL ACCOUNTS CHECK
-- ==========================================
SELECT 
    '2. Essential Accounts' as check_name,
    codes.code as required_code,
    codes.name as description,
    CASE WHEN ca.id IS NOT NULL THEN '✓ Found' ELSE '✗ Missing' END as status,
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
    AND ca.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
ORDER BY codes.code;

-- ==========================================
-- 3. COMPANY ACCOUNT MAPPINGS
-- ==========================================
SELECT 
    '3. Account Mappings' as check_name,
    CASE WHEN default_receivables_account_id IS NOT NULL THEN '✓ Configured' ELSE '✗ Missing' END as receivables,
    CASE WHEN default_revenue_account_id IS NOT NULL THEN '✓ Configured' ELSE '✗ Missing' END as revenue,
    CASE WHEN default_cash_account_id IS NOT NULL THEN '✓ Configured' ELSE '✗ Missing' END as cash,
    CASE WHEN default_bank_account_id IS NOT NULL THEN '✓ Configured' ELSE '✗ Missing' END as bank,
    CASE 
        WHEN default_receivables_account_id IS NOT NULL 
             AND default_revenue_account_id IS NOT NULL 
        THEN '✓ READY TO USE'
        ELSE '✗ NEEDS SETUP'
    END as overall_status
FROM companies
WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 4. JOURNAL ENTRIES SUMMARY
-- ==========================================
SELECT 
    '4. Journal Entries' as check_name,
    COALESCE(status, 'No Entries') as status,
    COUNT(*) as count,
    ROUND(SUM(COALESCE(total_debit, 0))::numeric, 2) as total_debits,
    ROUND(SUM(COALESCE(total_credit, 0))::numeric, 2) as total_credits
FROM journal_entries
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
GROUP BY status
UNION ALL
SELECT 
    '4. Journal Entries',
    'TOTAL',
    COUNT(*),
    ROUND(SUM(COALESCE(total_debit, 0))::numeric, 2),
    ROUND(SUM(COALESCE(total_credit, 0))::numeric, 2)
FROM journal_entries
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
ORDER BY status;

-- ==========================================
-- 5. PAYMENTS SUMMARY
-- ==========================================
SELECT 
    '5. Payments' as check_name,
    COUNT(*) as total_payments,
    COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN payment_status = 'cancelled' THEN 1 END) as cancelled,
    ROUND(SUM(COALESCE(amount, 0))::numeric, 2) as total_amount
FROM payments
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 6. CONTRACTS WITH JOURNAL ENTRIES
-- ==========================================
SELECT 
    '6. Contracts & Journal Entries' as check_name,
    COUNT(*) as total_contracts,
    COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END) as with_journal_entry,
    COUNT(CASE WHEN journal_entry_id IS NULL THEN 1 END) as without_journal_entry,
    ROUND(
        (COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::float / 
         NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
    ) as percentage_linked
FROM contracts
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 7. INVOICES SUMMARY
-- ==========================================
SELECT 
    '7. Invoices' as check_name,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
    COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partial,
    COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid,
    ROUND(SUM(COALESCE(total_amount, 0))::numeric, 2) as total_amount,
    ROUND(SUM(COALESCE(paid_amount, 0))::numeric, 2) as paid_amount,
    ROUND(SUM(COALESCE(balance_due, 0))::numeric, 2) as balance_due
FROM invoices
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 8. SYSTEM HEALTH SCORE (DETAILED)
-- ==========================================
WITH health_metrics AS (
    SELECT 
        -- Count account types (max 25 points)
        COUNT(DISTINCT account_type) as account_types,
        COUNT(*) as total_accounts,
        SUM(COALESCE(current_balance, 0)) as total_balance,
        
        -- Count journal entries
        (SELECT COUNT(*) 
         FROM journal_entries 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        ) as journal_count,
        
        -- Check mappings
        (SELECT 
            CASE 
                WHEN default_receivables_account_id IS NOT NULL 
                     AND default_revenue_account_id IS NOT NULL 
                THEN 1 ELSE 0 
            END 
         FROM companies 
         WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        ) as mappings_configured,
        
        -- Count payments
        (SELECT COUNT(*) 
         FROM payments 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        ) as payment_count,
        
        -- Count contracts with journal entries
        (SELECT 
            COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::float / 
            NULLIF(COUNT(*), 0) * 100
         FROM contracts 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        ) as contract_linkage_pct
        
    FROM chart_of_accounts
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
),
scores AS (
    SELECT 
        CASE 
            WHEN account_types >= 5 THEN 25
            WHEN account_types >= 3 THEN 15
            WHEN account_types >= 1 THEN 5
            ELSE 0
        END as coa_score,
        
        CASE WHEN mappings_configured = 1 THEN 25 ELSE 0 END as mapping_score,
        
        CASE 
            WHEN journal_count > 100 THEN 25
            WHEN journal_count > 10 THEN 15
            WHEN journal_count > 0 THEN 5
            ELSE 0
        END as journal_score,
        
        CASE 
            WHEN total_balance != 0 THEN 25
            ELSE 0
        END as data_score
    FROM health_metrics
)
SELECT 
    '8. HEALTH SCORE' as check_name,
    (coa_score + mapping_score + journal_score + data_score) as total_score,
    coa_score as chart_of_accounts,
    mapping_score as account_mappings,
    journal_score as journal_entries,
    data_score as data_integrity,
    CASE 
        WHEN (coa_score + mapping_score + journal_score + data_score) >= 80 THEN '✓ EXCELLENT'
        WHEN (coa_score + mapping_score + journal_score + data_score) >= 60 THEN '⚠ GOOD'
        WHEN (coa_score + mapping_score + journal_score + data_score) >= 40 THEN '⚠ FAIR'
        ELSE '✗ POOR - NEEDS SETUP'
    END as health_status,
    CASE 
        WHEN (coa_score + mapping_score + journal_score + data_score) >= 80 
        THEN 'System is fully configured and ready to use!'
        WHEN (coa_score + mapping_score + journal_score + data_score) >= 60 
        THEN 'System is mostly configured. Minor improvements needed.'
        WHEN (coa_score + mapping_score + journal_score + data_score) >= 40 
        THEN 'System needs attention. Run setup_accounting.sql'
        ELSE 'System is NOT configured. Immediate setup required!'
    END as recommendation
FROM scores;

-- ==========================================
-- 9. DETAILED RECOMMENDATIONS
-- ==========================================
WITH diagnostics AS (
    SELECT 
        (SELECT COUNT(*) FROM chart_of_accounts 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as account_count,
        (SELECT COUNT(*) FROM chart_of_accounts 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
         AND account_code IN ('1111', '1121', '1211', '4111')) as essential_count,
        (SELECT default_receivables_account_id IS NOT NULL 
               AND default_revenue_account_id IS NOT NULL
         FROM companies 
         WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as mappings_ok,
        (SELECT COUNT(*) FROM journal_entries 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as journal_count,
        (SELECT SUM(current_balance) FROM chart_of_accounts 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as total_balance
)
SELECT 
    '9. Action Items' as check_name,
    CASE WHEN account_count < 10 THEN '✗ CREATE chart of accounts' ELSE '✓ Chart of accounts exists' END as step_1,
    CASE WHEN essential_count < 4 THEN '✗ ADD essential accounts' ELSE '✓ Essential accounts exist' END as step_2,
    CASE WHEN NOT mappings_ok THEN '✗ LINK default accounts' ELSE '✓ Accounts linked' END as step_3,
    CASE WHEN total_balance = 0 THEN '✗ ENTER opening balances' ELSE '✓ Opening balances entered' END as step_4,
    CASE WHEN journal_count = 0 THEN '⚠ Test by creating a contract' ELSE '✓ Journal entries exist' END as step_5
FROM diagnostics;

-- ==========================================
-- FINAL SUMMARY
-- ==========================================
SELECT 
    '✅ DIAGNOSIS COMPLETE!' as message,
    (SELECT name FROM companies WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as company_name,
    (SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as total_accounts,
    CURRENT_TIMESTAMP as report_generated_at;

