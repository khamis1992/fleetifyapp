@echo off
REM ================================================================
REM Performance Index Testing Script (Windows)
REM ================================================================
REM Purpose: Automate before/after performance testing
REM Usage: test_performance_indexes.bat [before|after]
REM ================================================================

setlocal enabledelayedexpansion

REM Configuration
set PROJECT_DIR=C:\Users\khamis\Desktop\fleetifyapp-main\fleetifyapp-main
set MIGRATION_FILE=%PROJECT_DIR%\supabase\migrations\20250119000001_add_performance_indexes.sql
set ANALYSIS_SQL=%PROJECT_DIR%\docs\performance_index_analysis.sql
set RESULTS_DIR=%PROJECT_DIR%\docs\performance_results
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

REM Company ID for testing
set COMPANY_ID=24bc0b21-4e2d-4413-9842-31719a3669f4

echo ==================================================
echo   Performance Index Testing Script
echo ==================================================
echo.

REM Check mode
set MODE=%1
if "%MODE%"=="" set MODE=before
echo Mode: %MODE%
echo.

REM Create results directory
if not exist "%RESULTS_DIR%" mkdir "%RESULTS_DIR%"

REM ================================================================
REM STEP 1: Verify Migration File Exists
REM ================================================================
echo STEP 1: Verifying migration file...
if not exist "%MIGRATION_FILE%" (
    echo [ERROR] Migration file not found: %MIGRATION_FILE%
    exit /b 1
)
echo [OK] Migration file found
echo.

REM ================================================================
REM STEP 2: Display Instructions
REM ================================================================
echo STEP 2: Testing Instructions
echo.
echo This script will help you test the performance indexes.
echo.
echo Please connect to your Supabase database and run:
echo.
echo   psql -h HOST -U USER -d DATABASE
echo.
echo Then run the analysis SQL file:
echo.
echo   %ANALYSIS_SQL%
echo.
echo Results will be saved to: %RESULTS_DIR%
echo.
echo ================================================================
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

REM ================================================================
REM STEP 3: Create Test SQL File
REM ================================================================
echo.
echo STEP 3: Creating test SQL file...

set TEST_SQL=%RESULTS_DIR%\%MODE%_test_queries_%TIMESTAMP%.sql

(
    echo -- Performance Index Test Queries - %MODE% migration
    echo -- Generated: %date% %time%
    echo.
    echo \echo '================================================'
    echo \echo '  Performance Index Testing - %MODE%'
    echo \echo '================================================'
    echo.
    echo \echo '=== Test 1: Payment Idempotency Lookup ==='
    echo EXPLAIN (ANALYZE, BUFFERS, VERBOSE^)
    echo SELECT *
    echo FROM payments
    echo WHERE company_id = '%COMPANY_ID%'
    echo   AND idempotency_key = 'test-idempotency-key-123'
    echo LIMIT 1;
    echo.
    echo \echo '=== Test 2: Chart of Accounts Code Lookup ==='
    echo EXPLAIN (ANALYZE, BUFFERS, VERBOSE^)
    echo SELECT id, account_code, account_name, account_level, is_header
    echo FROM chart_of_accounts
    echo WHERE company_id = '%COMPANY_ID%'
    echo   AND account_code = '11151'
    echo   AND is_header = false;
    echo.
    echo \echo '=== Test 3: Invoice Date Range Query ==='
    echo EXPLAIN (ANALYZE, BUFFERS, VERBOSE^)
    echo SELECT id, invoice_number, contract_id, due_date, total_amount, status
    echo FROM invoices
    echo WHERE contract_id IN (SELECT id FROM contracts LIMIT 1^)
    echo   AND due_date ^= '2025-01-01'
    echo   AND due_date <= '2025-01-31'
    echo   AND status != 'cancelled'
    echo ORDER BY due_date DESC
    echo LIMIT 10;
    echo.
    echo \echo '=== Current Indexes ==='
    echo SELECT
    echo     schemaname,
    echo     tablename,
    echo     indexname,
    echo     indexdef
    echo FROM pg_indexes
    echo WHERE indexname IN (
    echo     'idx_payments_idempotency',
    echo     'idx_chart_of_accounts_company_code',
    echo     'idx_invoices_contract_date_brin'
    echo ^)
    echo ORDER BY indexname;
    echo.
    echo \echo '=== Index Usage Statistics ==='
    echo SELECT
    echo     i.schemaname,
    echo     i.tablename,
    echo     i.indexname,
    echo     i.idx_scan as index_scans,
    echo     i.idx_tup_read as tuples_read,
    echo     i.idx_tup_fetch as tuples_fetched,
    echo     pg_size_pretty(pg_relation_size(i.indexrelid::regclass^)^) as index_size
    echo FROM pg_stat_user_indexes i
    echo WHERE i.indexname IN (
    echo     'idx_payments_idempotency',
    echo     'idx_chart_of_accounts_company_code',
    echo     'idx_invoices_contract_date_brin'
    echo ^)
    echo ORDER BY i.idx_scan DESC;
    echo.
    echo \echo '=== Table Statistics ==='
    echo SELECT
    echo     schemaname,
    echo     tablename,
    echo     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename^)^) as total_size,
    echo     pg_size_pretty(pg_relation_size(schemaname||'.'||tablename^)^) as table_size,
    echo     n_live_tup as row_count
    echo FROM pg_stat_user_tables
    echo WHERE tablename IN ('payments', 'chart_of_accounts', 'invoices'^)
    echo ORDER BY tablename;
) > "%TEST_SQL%"

echo [OK] Test SQL file created: %TEST_SQL%
echo.

REM ================================================================
REM STEP 4: Next Steps
REM ================================================================
echo ================================================================
echo   Testing Complete!
echo ================================================================
echo.
echo Test SQL file created: %TEST_SQL%
echo.
echo Next steps:
echo.
if "%MODE%"=="before" (
    echo   1. Connect to your database:
    echo      psql -h HOST -U USER -d DATABASE
    echo.
    echo   2. Run the test queries:
    echo      \i %TEST_SQL%
    echo.
    echo   3. Save the output to: %RESULTS_DIR%\before_results_%TIMESTAMP%.txt
    echo.
    echo   4. Apply the migration:
    echo      supabase db push
    echo.
    echo   5. Run this script again with 'after' mode:
    echo      test_performance_indexes.bat after
    echo.
    echo   6. Compare the before/after results
) else (
    echo   1. Connect to your database:
    echo      psql -h HOST -U USER -d DATABASE
    echo.
    echo   2. Run the test queries:
    echo      \i %TEST_SQL%
    echo.
    echo   3. Save the output to: %RESULTS_DIR%\after_results_%TIMESTAMP%.txt
    echo.
    echo   4. Compare with before results
    echo.
    echo   5. Verify query execution time improved
    echo.
    echo   6. Check that indexes are being used (Index Scan in EXPLAIN^)
    echo.
    echo   7. Monitor index usage for 7 days
)
echo.
echo Key metrics to compare:
echo   - Execution Time (lower is better^)
echo   - Planning Time (lower is better^)
echo   - Buffer usage (fewer hits is better^)
echo   - Scan type (Index Scan vs Seq Scan^)
echo.
echo ================================================================
echo.

endlocal
