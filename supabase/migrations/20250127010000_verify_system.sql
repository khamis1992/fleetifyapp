-- ================================================================
-- SYSTEM VERIFICATION AND TESTING SCRIPT
-- ================================================================
-- Purpose: Verify that all cron jobs and functions are working correctly
-- Date: 2025-01-27
-- ================================================================

-- ================================================================
-- STEP 1: Verify pg_cron Extension is Enabled
-- ================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        RAISE NOTICE '✅ pg_cron extension is enabled';
    ELSE
        RAISE NOTICE '❌ pg_cron extension is NOT enabled';
        RAISE NOTICE '   Run: CREATE EXTENSION pg_cron;';
    END IF;
END $$;

-- ================================================================
-- STEP 2: Verify Required Tables Exist
-- ================================================================

DO $$
DECLARE
    v_tables TEXT[] := ARRAY['late_fees', 'late_fee_rules', 'late_fee_history', 'invoices', 'contracts', 'reminder_schedules'];
    v_table TEXT;
    v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = v_table
        ) THEN
            v_missing := array_append(v_missing, v_table);
        END IF;
    END LOOP;
    
    IF array_length(v_missing, 1) IS NULL THEN
        RAISE NOTICE '✅ All required tables exist';
    ELSE
        RAISE NOTICE '❌ Missing tables: %', array_to_string(v_missing, ', ');
    END IF;
END $$;

-- ================================================================
-- STEP 3: Verify Required Functions Exist
-- ================================================================

DO $$
DECLARE
    v_functions TEXT[] := ARRAY[
        'run_monthly_invoice_generation',
        'check_payment_reminders',
        'process_overdue_invoices',
        'calculate_late_fee',
        'generate_invoice_for_contract_month',
        'generate_monthly_invoices_for_date'
    ];
    v_function TEXT;
    v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH v_function IN ARRAY v_functions
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = v_function
        ) THEN
            v_missing := array_append(v_missing, v_function);
        END IF;
    END LOOP;
    
    IF array_length(v_missing, 1) IS NULL THEN
        RAISE NOTICE '✅ All required functions exist';
    ELSE
        RAISE NOTICE '❌ Missing functions: %', array_to_string(v_missing, ', ');
    END IF;
END $$;

-- ================================================================
-- STEP 4: Verify Cron Jobs are Scheduled
-- ================================================================

DO $$
DECLARE
    v_jobs TEXT[] := ARRAY[
        'monthly-invoice-generation',
        'check-payment-reminders',
        'process-overdue-invoices'
    ];
    v_job TEXT;
    v_count INTEGER;
    v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH v_job IN ARRAY v_jobs
    LOOP
        SELECT COUNT(*) INTO v_count
        FROM cron.job
        WHERE jobname = v_job;
        
        IF v_count = 0 THEN
            v_missing := array_append(v_missing, v_job);
        END IF;
    END LOOP;
    
    IF array_length(v_missing, 1) IS NULL THEN
        RAISE NOTICE '✅ All cron jobs are scheduled';
    ELSE
        RAISE NOTICE '❌ Missing cron jobs: %', array_to_string(v_missing, ', ');
        RAISE NOTICE '   Run the migration file: 20250127000000_setup_automatic_cron_jobs.sql';
    END IF;
END $$;

-- ================================================================
-- STEP 5: Display All Scheduled Cron Jobs
-- ================================================================

SELECT 
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname IN ('monthly-invoice-generation', 'check-payment-reminders', 'process-overdue-invoices')
ORDER BY jobname;

-- ================================================================
-- STEP 6: Test Functions (Dry Run)
-- ================================================================
-- These tests will not modify data, just verify functions work

-- Test 1: Check if calculate_late_fee function works (with NULL invoice)
DO $$
DECLARE
    v_result NUMERIC;
BEGIN
    BEGIN
        -- This should return 0 for non-existent invoice
        SELECT calculate_late_fee('00000000-0000-0000-0000-000000000000'::UUID, 10) INTO v_result;
        IF v_result = 0 THEN
            RAISE NOTICE '✅ calculate_late_fee() function works correctly';
        ELSE
            RAISE NOTICE '⚠️ calculate_late_fee() returned unexpected value: %', v_result;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ calculate_late_fee() function error: %', SQLERRM;
    END;
END $$;

-- Test 2: Check if process_overdue_invoices function can be called
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    BEGIN
        -- This should return 0 rows if no overdue invoices
        SELECT COUNT(*) INTO v_count FROM process_overdue_invoices();
        RAISE NOTICE '✅ process_overdue_invoices() function works correctly';
        RAISE NOTICE '   Found % overdue invoices to process', v_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ process_overdue_invoices() function error: %', SQLERRM;
    END;
END $$;

-- Test 3: Check if check_payment_reminders function can be called
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    BEGIN
        -- This should return 0 rows if no reminders scheduled
        SELECT COUNT(*) INTO v_count FROM check_payment_reminders();
        RAISE NOTICE '✅ check_payment_reminders() function works correctly';
        RAISE NOTICE '   Found % reminders to process', v_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ check_payment_reminders() function error: %', SQLERRM;
    END;
END $$;

-- ================================================================
-- STEP 7: Check Recent Cron Job Execution History
-- ================================================================

SELECT 
    j.jobname,
    jd.start_time,
    jd.end_time,
    jd.status,
    jd.return_message,
    EXTRACT(EPOCH FROM (jd.end_time - jd.start_time)) as duration_seconds
FROM cron.job_run_details jd
JOIN cron.job j ON jd.jobid = j.jobid
WHERE j.jobname IN ('monthly-invoice-generation', 'check-payment-reminders', 'process-overdue-invoices')
ORDER BY jd.start_time DESC
LIMIT 10;

-- ================================================================
-- STEP 8: Summary Report
-- ================================================================

DO $$
DECLARE
    v_ext_count INTEGER;
    v_table_count INTEGER;
    v_function_count INTEGER;
    v_cron_count INTEGER;
BEGIN
    -- Count extensions
    SELECT COUNT(*) INTO v_ext_count
    FROM pg_extension WHERE extname = 'pg_cron';
    
    -- Count required tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('late_fees', 'late_fee_rules', 'late_fee_history', 'invoices', 'contracts', 'reminder_schedules');
    
    -- Count required functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('run_monthly_invoice_generation', 'check_payment_reminders', 'process_overdue_invoices', 'calculate_late_fee');
    
    -- Count cron jobs
    SELECT COUNT(*) INTO v_cron_count
    FROM cron.job
    WHERE jobname IN ('monthly-invoice-generation', 'check-payment-reminders', 'process-overdue-invoices');
    
    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '📊 SYSTEM VERIFICATION SUMMARY';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Extensions:    % / 1  (pg_cron)', v_ext_count;
    RAISE NOTICE 'Tables:        % / 6  (required)', v_table_count;
    RAISE NOTICE 'Functions:     % / 4  (required)', v_function_count;
    RAISE NOTICE 'Cron Jobs:     % / 3  (required)', v_cron_count;
    RAISE NOTICE '';
    
    IF v_ext_count = 1 AND v_table_count = 6 AND v_function_count = 4 AND v_cron_count = 3 THEN
        RAISE NOTICE '✅ SYSTEM STATUS: FULLY OPERATIONAL';
    ELSIF v_cron_count < 3 THEN
        RAISE NOTICE '⚠️ SYSTEM STATUS: PARTIALLY CONFIGURED';
        RAISE NOTICE '   Run migration: 20250127000000_setup_automatic_cron_jobs.sql';
    ELSE
        RAISE NOTICE '⚠️ SYSTEM STATUS: NEEDS ATTENTION';
        RAISE NOTICE '   Check errors above for details';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';
END $$;

