-- ===============================================
-- Fleetify Final Diagnosis - 100% Accurate
-- Based on REAL database schema
-- No configuration needed - Just Run!
-- ===============================================

-- ==========================================
-- 0. CURRENT USER & COMPANY INFO
-- ==========================================
SELECT 
    '👤 User Info' as section,
    auth.uid() as user_id,
    p.company_id,
    c.name as company_name,
    c.business_type,
    c.currency
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.id = auth.uid();

-- ==========================================
-- 1. CHART OF ACCOUNTS SUMMARY
-- ==========================================
SELECT 
    '📚 Chart of Accounts' as section,
    account_type,
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN is_active THEN 1 END) as active_accounts,
    ROUND(SUM(COALESCE(current_balance, 0))::numeric, 2) as total_balance,
    MIN(account_code) as first_code,
    MAX(account_code) as last_code
FROM chart_of_accounts
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
GROUP BY account_type
ORDER BY 
    CASE account_type
        WHEN 'assets' THEN 1
        WHEN 'liabilities' THEN 2
        WHEN 'equity' THEN 3
        WHEN 'revenue' THEN 4
        WHEN 'expenses' THEN 5
        ELSE 6
    END;

-- ==========================================
-- 2. ESSENTIAL ACCOUNTS CHECK
-- ==========================================
SELECT 
    '⭐ Essential Accounts' as section,
    codes.code as code,
    codes.name as account_name,
    CASE 
        WHEN ca.id IS NOT NULL THEN '✓ EXISTS' 
        ELSE '✗ MISSING' 
    END as status,
    ca.account_name as actual_name,
    COALESCE(ca.current_balance, 0) as balance
FROM (VALUES 
    ('1111', 'Cash on Hand - النقدية'),
    ('1121', 'Bank Account - البنك'),
    ('1211', 'Accounts Receivable - الذمم المدينة'),
    ('2111', 'Accounts Payable - الذمم الدائنة'),
    ('4111', 'Rental Revenue - إيرادات التأجير'),
    ('5111', 'Maintenance Expenses - مصاريف الصيانة')
) AS codes(code, name)
LEFT JOIN chart_of_accounts ca 
    ON ca.account_code = codes.code 
    AND ca.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
ORDER BY codes.code;

-- ==========================================
-- 3. ACCOUNT MAPPINGS (from JSONB)
-- ==========================================
SELECT 
    '🔗 Account Mappings' as section,
    c.name as company_name,
    CASE 
        WHEN c.customer_account_settings->>'default_receivables_account_id' IS NOT NULL 
        THEN '✓ Configured'
        ELSE '✗ Missing'
    END as receivables_mapping,
    CASE 
        WHEN c.customer_account_settings->>'default_revenue_account_id' IS NOT NULL 
        THEN '✓ Configured'
        ELSE '✗ Missing'
    END as revenue_mapping,
    CASE 
        WHEN c.customer_account_settings->>'default_cash_account_id' IS NOT NULL 
        THEN '✓ Configured'
        ELSE '✗ Missing'
    END as cash_mapping,
    CASE 
        WHEN c.customer_account_settings->>'auto_create_account' = 'true' 
        THEN '✓ Enabled'
        ELSE '✗ Disabled'
    END as auto_create_accounts,
    CASE 
        WHEN c.customer_account_settings->>'default_receivables_account_id' IS NOT NULL 
             AND c.customer_account_settings->>'default_revenue_account_id' IS NOT NULL 
        THEN '✅ READY'
        ELSE '❌ NEEDS SETUP'
    END as overall_status
FROM companies c
WHERE c.id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 4. MAPPED ACCOUNT DETAILS
-- ==========================================
SELECT 
    '📋 Mapped Accounts Details' as section,
    'Receivables' as mapping_type,
    ca.account_code,
    ca.account_name,
    ca.current_balance
FROM companies c
LEFT JOIN chart_of_accounts ca 
    ON ca.id = (c.customer_account_settings->>'default_receivables_account_id')::uuid
WHERE c.id = (SELECT company_id FROM profiles WHERE id = auth.uid())

UNION ALL

SELECT 
    '📋 Mapped Accounts Details',
    'Revenue',
    ca.account_code,
    ca.account_name,
    ca.current_balance
FROM companies c
LEFT JOIN chart_of_accounts ca 
    ON ca.id = (c.customer_account_settings->>'default_revenue_account_id')::uuid
WHERE c.id = (SELECT company_id FROM profiles WHERE id = auth.uid())

UNION ALL

SELECT 
    '📋 Mapped Accounts Details',
    'Cash',
    ca.account_code,
    ca.account_name,
    ca.current_balance
FROM companies c
LEFT JOIN chart_of_accounts ca 
    ON ca.id = (c.customer_account_settings->>'default_cash_account_id')::uuid
WHERE c.id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 5. JOURNAL ENTRIES SUMMARY
-- ==========================================
SELECT 
    '📝 Journal Entries' as section,
    COALESCE(status, 'NO ENTRIES') as status,
    COUNT(*) as count,
    ROUND(SUM(COALESCE(total_debit, 0))::numeric, 2) as total_debits,
    ROUND(SUM(COALESCE(total_credit, 0))::numeric, 2) as total_credits,
    MIN(entry_date) as earliest_date,
    MAX(entry_date) as latest_date
FROM journal_entries
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
GROUP BY status
ORDER BY status;

-- ==========================================
-- 6. PAYMENTS SUMMARY
-- ==========================================
SELECT 
    '💰 Payments' as section,
    COUNT(*) as total,
    COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN payment_status = 'cancelled' THEN 1 END) as cancelled,
    COUNT(CASE WHEN payment_status = 'bounced' THEN 1 END) as bounced,
    ROUND(SUM(COALESCE(amount, 0))::numeric, 2) as total_amount,
    ROUND(AVG(COALESCE(amount, 0))::numeric, 2) as average_amount
FROM payments
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 7. CONTRACTS & JOURNAL LINKAGE
-- ==========================================
SELECT 
    '📄 Contracts & Linkage' as section,
    COUNT(*) as total_contracts,
    COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END) as with_journal,
    COUNT(CASE WHEN journal_entry_id IS NULL THEN 1 END) as without_journal,
    ROUND(
        (COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::float / 
         NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
    ) as linkage_percentage,
    CASE 
        WHEN COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::float / 
             NULLIF(COUNT(*), 0) >= 0.8 
        THEN '✓ Good Linkage'
        WHEN COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::float / 
             NULLIF(COUNT(*), 0) >= 0.5
        THEN '⚠ Partial Linkage'
        ELSE '✗ Poor Linkage'
    END as linkage_health
FROM contracts
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 8. INVOICES SUMMARY
-- ==========================================
SELECT 
    '🧾 Invoices' as section,
    COUNT(*) as total,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
    COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partial,
    COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid,
    ROUND(SUM(COALESCE(total_amount, 0))::numeric, 2) as total_amount,
    ROUND(SUM(COALESCE(paid_amount, 0))::numeric, 2) as paid_amount,
    ROUND(SUM(COALESCE(balance_due, 0))::numeric, 2) as balance_due
FROM invoices
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- 9. SYSTEM HEALTH SCORE
-- ==========================================
WITH metrics AS (
    SELECT 
        -- Accounts Score (0-25)
        CASE 
            WHEN COUNT(DISTINCT account_type) >= 5 THEN 25
            WHEN COUNT(DISTINCT account_type) >= 3 THEN 15
            WHEN COUNT(DISTINCT account_type) >= 1 THEN 5
            ELSE 0
        END as accounts_score,
        
        -- Mappings Score (0-25)
        (SELECT 
            CASE 
                WHEN customer_account_settings->>'default_receivables_account_id' IS NOT NULL 
                     AND customer_account_settings->>'default_revenue_account_id' IS NOT NULL 
                THEN 25
                WHEN customer_account_settings->>'default_receivables_account_id' IS NOT NULL 
                     OR customer_account_settings->>'default_revenue_account_id' IS NOT NULL
                THEN 15
                ELSE 0
            END
         FROM companies WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        ) as mappings_score,
        
        -- Journal Entries Score (0-25)
        (SELECT 
            CASE 
                WHEN COUNT(*) > 100 THEN 25
                WHEN COUNT(*) > 10 THEN 15
                WHEN COUNT(*) > 0 THEN 5
                ELSE 0
            END
         FROM journal_entries 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        ) as journal_score,
        
        -- Data Score (0-25)
        CASE 
            WHEN SUM(COALESCE(current_balance, 0)) != 0 THEN 25
            WHEN COUNT(*) > 10 THEN 10
            ELSE 0
        END as data_score
        
    FROM chart_of_accounts
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
)
SELECT 
    '🏆 HEALTH SCORE' as section,
    (accounts_score + mappings_score + journal_score + data_score) as total_score,
    accounts_score as chart_score,
    mappings_score as mapping_score,
    journal_score as entries_score,
    data_score as balance_score,
    CASE 
        WHEN (accounts_score + mappings_score + journal_score + data_score) >= 80 
        THEN '✅ EXCELLENT'
        WHEN (accounts_score + mappings_score + journal_score + data_score) >= 60 
        THEN '⚠️ GOOD'
        WHEN (accounts_score + mappings_score + journal_score + data_score) >= 40 
        THEN '⚠️ FAIR'
        ELSE '❌ POOR'
    END as rating,
    CASE 
        WHEN (accounts_score + mappings_score + journal_score + data_score) >= 80 
        THEN 'System configured properly ✓'
        WHEN (accounts_score + mappings_score + journal_score + data_score) >= 60 
        THEN 'Minor improvements needed'
        WHEN (accounts_score + mappings_score + journal_score + data_score) >= 40 
        THEN 'Setup required - Run setup script'
        ELSE 'IMMEDIATE SETUP REQUIRED!'
    END as recommendation
FROM metrics;

-- ==========================================
-- 10. ACTIONABLE NEXT STEPS
-- ==========================================
WITH diagnostics AS (
    SELECT 
        (SELECT COUNT(*) FROM chart_of_accounts 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as accounts,
        (SELECT COUNT(*) FROM chart_of_accounts 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
         AND account_code IN ('1111', '1121', '1211', '4111')) as essential,
        (SELECT customer_account_settings->>'default_receivables_account_id' IS NOT NULL 
               AND customer_account_settings->>'default_revenue_account_id' IS NOT NULL
         FROM companies 
         WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as mapped,
        (SELECT COUNT(*) FROM journal_entries 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as journals,
        (SELECT COALESCE(SUM(current_balance), 0) FROM chart_of_accounts 
         WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as balance
)
SELECT 
    '✅ ACTION ITEMS' as section,
    CASE 
        WHEN accounts < 10 THEN '❌ Step 1: CREATE chart of accounts (run setup script)'
        ELSE '✓ Step 1: Chart of accounts exists' 
    END as step_1_accounts,
    CASE 
        WHEN essential < 4 THEN '❌ Step 2: ADD essential accounts (1111, 1121, 1211, 4111)'
        ELSE '✓ Step 2: Essential accounts exist' 
    END as step_2_essential,
    CASE 
        WHEN NOT mapped THEN '❌ Step 3: LINK default accounts in settings'
        ELSE '✓ Step 3: Accounts mapped' 
    END as step_3_mapping,
    CASE 
        WHEN balance = 0 THEN '❌ Step 4: ENTER opening balances'
        ELSE '✓ Step 4: Balances entered' 
    END as step_4_balances,
    CASE 
        WHEN journals = 0 THEN '⚠️ Step 5: TEST by creating a contract'
        ELSE '✓ Step 5: Journal entries exist' 
    END as step_5_test
FROM diagnostics;

-- ==========================================
-- FINAL SUMMARY
-- ==========================================
SELECT 
    '🎯 SUMMARY' as section,
    (SELECT name FROM companies WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as company,
    (SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as total_accounts,
    (SELECT COUNT(*) FROM journal_entries WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as total_entries,
    (SELECT COUNT(*) FROM payments WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as total_payments,
    NOW() as report_time;

