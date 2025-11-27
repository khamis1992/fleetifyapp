-- ===============================================
-- Fleetify System Diagnosis Script (Universal Version)
-- Purpose: Comprehensive diagnostic check
-- Works in: Supabase Dashboard, pgAdmin, DBeaver, psql
-- Date: 2025-11-05
-- ===============================================

-- ⚠️ IMPORTANT: Replace 'YOUR_COMPANY_ID' below with your actual company UUID
-- Example: '123e4567-e89b-12d3-a456-426614174000'

DO $$
DECLARE
    v_company_id uuid := 'YOUR_COMPANY_ID'::uuid; -- ⚠️ CHANGE THIS!
    v_output text := '';
BEGIN
    -- Header
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Fleetify System Diagnosis Report';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '';
    
    -- 1. Chart of Accounts Analysis
    RAISE NOTICE '1. Chart of Accounts Status:';
    RAISE NOTICE '------------------------------';
    
    FOR v_output IN
        SELECT 
            format('%-20s | Total: %s | Active: %s | Balance: %s',
                account_type,
                COUNT(*)::text,
                COUNT(CASE WHEN is_active = true THEN 1 END)::text,
                ROUND(SUM(COALESCE(current_balance, 0))::numeric, 2)::text
            )
        FROM chart_of_accounts
        WHERE company_id = v_company_id
        GROUP BY account_type
        ORDER BY account_type
    LOOP
        RAISE NOTICE '%', v_output;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '2. Account Balance Summary:';
    RAISE NOTICE '------------------------------';
    
    FOR v_output IN
        SELECT 
            format('%-20s: %s',
                account_type,
                ROUND(SUM(COALESCE(current_balance, 0))::numeric, 2)::text
            )
        FROM chart_of_accounts
        WHERE company_id = v_company_id AND is_active = true
        GROUP BY account_type
        ORDER BY account_type
    LOOP
        RAISE NOTICE '%', v_output;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '3. Journal Entries Status:';
    RAISE NOTICE '------------------------------';
    
    FOR v_output IN
        SELECT 
            format('Status: %-10s | Count: %s | Debits: %s | Credits: %s',
                status,
                COUNT(*)::text,
                ROUND(SUM(COALESCE(total_debit, 0))::numeric, 2)::text,
                ROUND(SUM(COALESCE(total_credit, 0))::numeric, 2)::text
            )
        FROM journal_entries
        WHERE company_id = v_company_id
        GROUP BY status
        ORDER BY status
    LOOP
        RAISE NOTICE '%', v_output;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '4. Company Account Mappings:';
    RAISE NOTICE '------------------------------';
    
    FOR v_output IN
        SELECT 
            format('Receivables: %s | Revenue: %s | Cash: %s | Bank: %s | Status: %s',
                COALESCE(default_receivables_account_id::text, 'NULL'),
                COALESCE(default_revenue_account_id::text, 'NULL'),
                COALESCE(default_cash_account_id::text, 'NULL'),
                COALESCE(default_bank_account_id::text, 'NULL'),
                CASE 
                    WHEN default_receivables_account_id IS NOT NULL 
                         AND default_revenue_account_id IS NOT NULL 
                         AND default_cash_account_id IS NOT NULL 
                    THEN '✓ Configured'
                    ELSE '✗ Not Configured'
                END
            )
        FROM companies
        WHERE id = v_company_id
    LOOP
        RAISE NOTICE '%', v_output;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '5. Essential Accounts Check:';
    RAISE NOTICE '------------------------------';
    
    FOR v_output IN
        WITH essential_codes AS (
            SELECT unnest(ARRAY['1111', '1121', '1211', '2111', '4111', '5111']) as code
        )
        SELECT 
            format('Code: %s | Status: %s | Name: %s | Balance: %s',
                ec.code,
                CASE WHEN ca.id IS NOT NULL THEN '✓ Found' ELSE '✗ Missing' END,
                COALESCE(ca.account_name, 'N/A'),
                COALESCE(ca.current_balance::text, '0')
            )
        FROM essential_codes ec
        LEFT JOIN chart_of_accounts ca 
            ON ca.account_code = ec.code AND ca.company_id = v_company_id
        ORDER BY ec.code
    LOOP
        RAISE NOTICE '%', v_output;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '6. Recent Payments Summary:';
    RAISE NOTICE '------------------------------';
    
    FOR v_output IN
        SELECT 
            format('Total: %s | Completed: %s | Pending: %s | Amount: %s',
                COUNT(*)::text,
                COUNT(CASE WHEN payment_status = 'completed' THEN 1 END)::text,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END)::text,
                ROUND(SUM(COALESCE(amount, 0))::numeric, 2)::text
            )
        FROM payments
        WHERE company_id = v_company_id
    LOOP
        RAISE NOTICE '%', v_output;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '7. Contracts with Journal Entries:';
    RAISE NOTICE '------------------------------';
    
    FOR v_output IN
        SELECT 
            format('Total: %s | With Entry: %s | Without Entry: %s | Percentage: %s%%',
                COUNT(*)::text,
                COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::text,
                COUNT(CASE WHEN journal_entry_id IS NULL THEN 1 END)::text,
                ROUND(
                    (COUNT(CASE WHEN journal_entry_id IS NOT NULL THEN 1 END)::float / 
                     NULLIF(COUNT(*), 0) * 100)::numeric, 
                    2
                )::text
            )
        FROM contracts
        WHERE company_id = v_company_id
    LOOP
        RAISE NOTICE '%', v_output;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '8. System Health Score:';
    RAISE NOTICE '------------------------------';
    
    FOR v_output IN
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
                        WHERE id = v_company_id 
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
            WHERE ca.company_id = v_company_id
        )
        SELECT 
            format('Total Score: %s/100 | COA: %s | Mappings: %s | Journals: %s | Data: %s | Status: %s',
                (coa_score + mapping_score + journal_score + data_score)::text,
                coa_score::text,
                mapping_score::text,
                journal_score::text,
                data_score::text,
                CASE 
                    WHEN coa_score + mapping_score + journal_score + data_score >= 80 THEN '✓ Excellent'
                    WHEN coa_score + mapping_score + journal_score + data_score >= 60 THEN '⚠ Good'
                    WHEN coa_score + mapping_score + journal_score + data_score >= 40 THEN '⚠ Fair'
                    ELSE '✗ Poor - Needs Setup'
                END
            )
        FROM health_metrics
    LOOP
        RAISE NOTICE '%', v_output;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Diagnosis Complete!';
    RAISE NOTICE '=========================================';
    
END $$;

-- Alternative: Run queries separately and view results in table format
-- Uncomment the sections below if you want table results instead of RAISE NOTICE

/*
-- 1. Chart of Accounts Summary
SELECT 
    account_type,
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_accounts,
    ROUND(SUM(COALESCE(current_balance, 0))::numeric, 2) as total_balance
FROM chart_of_accounts
WHERE company_id = 'YOUR_COMPANY_ID'::uuid
GROUP BY account_type
ORDER BY account_type;

-- 2. Essential Accounts Check
WITH essential_codes AS (
    SELECT unnest(ARRAY['1111', '1121', '1211', '2111', '4111', '5111']) as code
)
SELECT 
    ec.code as required_code,
    CASE WHEN ca.id IS NOT NULL THEN '✓ Found' ELSE '✗ Missing' END as status,
    ca.account_name,
    ca.current_balance
FROM essential_codes ec
LEFT JOIN chart_of_accounts ca 
    ON ca.account_code = ec.code AND ca.company_id = 'YOUR_COMPANY_ID'::uuid
ORDER BY ec.code;

-- 3. Company Mappings
SELECT 
    default_receivables_account_id,
    default_revenue_account_id,
    default_cash_account_id,
    default_bank_account_id,
    CASE 
        WHEN default_receivables_account_id IS NOT NULL 
             AND default_revenue_account_id IS NOT NULL 
        THEN '✓ Configured'
        ELSE '✗ Not Configured'
    END as status
FROM companies
WHERE id = 'YOUR_COMPANY_ID'::uuid;
*/

