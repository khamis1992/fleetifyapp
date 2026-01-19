-- ===============================================
-- Fleetify Accounting System Setup Script
-- Purpose: Initialize accounting system for new company
-- Date: 2025-11-05
-- WARNING: Run diagnosis.sql first!
-- ===============================================

-- IMPORTANT: Replace these values before running
\set company_id 'YOUR_COMPANY_ID'
\set user_id 'YOUR_USER_ID'

-- Start transaction
BEGIN;

\echo '========================================='
\echo 'Fleetify Accounting Setup'
\echo '========================================='
\echo ''

-- Step 1: Create Essential Accounts
\echo 'Step 1: Creating Essential Accounts...'
\echo '------------------------------'

INSERT INTO chart_of_accounts (
    company_id,
    account_code,
    account_name,
    account_name_ar,
    account_type,
    account_subtype,
    balance_type,
    account_level,
    parent_account_id,
    is_header,
    is_active,
    is_system,
    current_balance,
    description
) VALUES 
-- Assets (1xxx)
(:'company_id', '1000', 'Assets', 'الأصول', 'assets', 'current_assets', 'debit', 1, NULL, true, true, true, 0, 'All company assets'),
(:'company_id', '1100', 'Current Assets', 'الأصول المتداولة', 'assets', 'current_assets', 'debit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '1000' AND company_id = :'company_id'), true, true, true, 0, 'Assets expected to be converted to cash within one year'),
(:'company_id', '1111', 'Cash on Hand', 'النقدية في الصندوق', 'assets', 'current_assets', 'debit', 3, (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = :'company_id'), false, true, true, 0, 'Physical cash in the company'),
(:'company_id', '1121', 'Bank Account', 'حساب بنكي', 'assets', 'current_assets', 'debit', 3, (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = :'company_id'), false, true, true, 0, 'Bank deposits and checking accounts'),
(:'company_id', '1211', 'Accounts Receivable', 'الذمم المدينة - العملاء', 'assets', 'current_assets', 'debit', 3, (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = :'company_id'), false, true, true, 0, 'Money owed by customers'),

-- Liabilities (2xxx)
(:'company_id', '2000', 'Liabilities', 'الخصوم', 'liabilities', 'current_liabilities', 'credit', 1, NULL, true, true, true, 0, 'All company liabilities'),
(:'company_id', '2100', 'Current Liabilities', 'الخصوم المتداولة', 'liabilities', 'current_liabilities', 'credit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '2000' AND company_id = :'company_id'), true, true, true, 0, 'Debts due within one year'),
(:'company_id', '2111', 'Accounts Payable', 'الذمم الدائنة - الموردين', 'liabilities', 'current_liabilities', 'credit', 3, (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = :'company_id'), false, true, true, 0, 'Money owed to suppliers'),

-- Equity (3xxx)
(:'company_id', '3000', 'Equity', 'حقوق الملكية', 'equity', 'owners_equity', 'credit', 1, NULL, true, true, true, 0, 'Owners equity in the business'),
(:'company_id', '3111', 'Capital', 'رأس المال', 'equity', 'owners_equity', 'credit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '3000' AND company_id = :'company_id'), false, true, true, 0, 'Initial and additional capital contributions'),
(:'company_id', '3211', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', 'retained_earnings', 'credit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '3000' AND company_id = :'company_id'), false, true, true, 0, 'Accumulated profits not distributed'),

-- Revenue (4xxx)
(:'company_id', '4000', 'Revenue', 'الإيرادات', 'revenue', 'operating_revenue', 'credit', 1, NULL, true, true, true, 0, 'All company revenues'),
(:'company_id', '4111', 'Rental Revenue', 'إيرادات التأجير', 'revenue', 'operating_revenue', 'credit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '4000' AND company_id = :'company_id'), false, true, true, 0, 'Revenue from vehicle rentals'),
(:'company_id', '4211', 'Service Revenue', 'إيرادات الخدمات', 'revenue', 'operating_revenue', 'credit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '4000' AND company_id = :'company_id'), false, true, true, 0, 'Revenue from services provided'),

-- Expenses (5xxx)
(:'company_id', '5000', 'Expenses', 'المصروفات', 'expenses', 'operating_expenses', 'debit', 1, NULL, true, true, true, 0, 'All company expenses'),
(:'company_id', '5111', 'Maintenance Expenses', 'مصاريف الصيانة', 'expenses', 'operating_expenses', 'debit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = :'company_id'), false, true, true, 0, 'Vehicle maintenance and repair costs'),
(:'company_id', '5211', 'Administrative Expenses', 'المصاريف الإدارية', 'expenses', 'operating_expenses', 'debit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = :'company_id'), false, true, true, 0, 'General administrative costs'),
(:'company_id', '5311', 'Salaries and Wages', 'الرواتب والأجور', 'expenses', 'operating_expenses', 'debit', 2, (SELECT id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = :'company_id'), false, true, true, 0, 'Employee compensation')

ON CONFLICT (company_id, account_code) DO NOTHING;

\echo '✓ Essential accounts created'
\echo ''

-- Step 2: Link Default Accounts
\echo 'Step 2: Linking Default Accounts...'
\echo '------------------------------'

UPDATE companies
SET 
    default_receivables_account_id = (
        SELECT id FROM chart_of_accounts 
        WHERE account_code = '1211' AND company_id = :'company_id'
    ),
    default_revenue_account_id = (
        SELECT id FROM chart_of_accounts 
        WHERE account_code = '4111' AND company_id = :'company_id'
    ),
    default_cash_account_id = (
        SELECT id FROM chart_of_accounts 
        WHERE account_code = '1111' AND company_id = :'company_id'
    ),
    default_bank_account_id = (
        SELECT id FROM chart_of_accounts 
        WHERE account_code = '1121' AND company_id = :'company_id'
    ),
    default_payables_account_id = (
        SELECT id FROM chart_of_accounts 
        WHERE account_code = '2111' AND company_id = :'company_id'
    )
WHERE id = :'company_id';

\echo '✓ Default accounts linked'
\echo ''

-- Step 3: Create Default Cost Center
\echo 'Step 3: Creating Default Cost Center...'
\echo '------------------------------'

INSERT INTO cost_centers (
    company_id,
    code,
    name,
    name_ar,
    description,
    is_active,
    created_by
) VALUES (
    :'company_id',
    'CC-001',
    'General Operations',
    'العمليات العامة',
    'Default cost center for general operations',
    true,
    :'user_id'
) ON CONFLICT (company_id, code) DO NOTHING;

\echo '✓ Default cost center created'
\echo ''

-- Step 4: Create Opening Entry (Template)
\echo 'Step 4: Creating Opening Entry Template...'
\echo '------------------------------'
\echo 'NOTE: You need to update balances manually in the next step'
\echo ''

DO $$
DECLARE
    v_entry_id uuid;
BEGIN
    -- Insert opening journal entry
    INSERT INTO journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        total_debit,
        total_credit,
        status,
        created_by,
        notes
    ) VALUES (
        :'company_id',
        'JE-OPENING-001',
        CURRENT_DATE,
        'Opening Balances - System Setup',
        0, -- Update these after entering line items
        0,
        'draft', -- Keep as draft until balanced
        :'user_id',
        'This is the opening entry. Update line items with actual opening balances.'
    )
    RETURNING id INTO v_entry_id;
    
    -- Sample line items (UPDATE WITH ACTUAL VALUES)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        line_number,
        line_description,
        debit_amount,
        credit_amount
    ) VALUES
    -- Example: Cash opening balance
    (
        v_entry_id,
        (SELECT id FROM chart_of_accounts WHERE account_code = '1111' AND company_id = :'company_id'),
        1,
        'Opening balance - Cash',
        0, -- UPDATE THIS
        0
    ),
    -- Example: Capital opening balance
    (
        v_entry_id,
        (SELECT id FROM chart_of_accounts WHERE account_code = '3111' AND company_id = :'company_id'),
        2,
        'Opening balance - Capital',
        0,
        0 -- UPDATE THIS
    );
    
    RAISE NOTICE 'Opening entry created with ID: %', v_entry_id;
    RAISE NOTICE 'IMPORTANT: Update line items with actual opening balances!';
END $$;

\echo '✓ Opening entry template created'
\echo ''

-- Step 5: Verify Setup
\echo 'Step 5: Verifying Setup...'
\echo '------------------------------'

SELECT 
    'Accounts Created' as check_item,
    COUNT(*) as count,
    CASE WHEN COUNT(*) >= 17 THEN '✓' ELSE '✗' END as status
FROM chart_of_accounts
WHERE company_id = :'company_id'
UNION ALL
SELECT 
    'Default Mappings',
    CASE 
        WHEN default_receivables_account_id IS NOT NULL 
             AND default_revenue_account_id IS NOT NULL 
        THEN 1 ELSE 0 
    END,
    CASE 
        WHEN default_receivables_account_id IS NOT NULL 
             AND default_revenue_account_id IS NOT NULL 
        THEN '✓' ELSE '✗' 
    END
FROM companies
WHERE id = :'company_id'
UNION ALL
SELECT 
    'Cost Centers',
    COUNT(*),
    CASE WHEN COUNT(*) >= 1 THEN '✓' ELSE '✗' END
FROM cost_centers
WHERE company_id = :'company_id';

\echo ''
\echo '========================================='
\echo 'Setup Complete!'
\echo '========================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Update opening entry with actual balances'
\echo '2. Post the opening entry when balanced'
\echo '3. Test by creating a new contract'
\echo '4. Verify journal entry is created automatically'
\echo ''
\echo 'To update opening balances:'
\echo '  UPDATE chart_of_accounts'
\echo '  SET current_balance = [AMOUNT]'
\echo '  WHERE account_code = [CODE]'
\echo '  AND company_id = :company_id;'
\echo ''

-- Commit if everything looks good
-- ROLLBACK; -- Uncomment to test without committing
COMMIT;

