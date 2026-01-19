-- ================================================================
-- PERFORMANCE INDEX ANALYSIS - BEFORE & AFTER
-- ================================================================
-- Purpose: Measure query performance improvement from new indexes
-- Usage: Run BEFORE applying migration, then AFTER applying migration
-- Output: Compare execution times to verify improvement
-- ================================================================

-- ================================================================
-- TEST QUERIES WITH EXPLAIN ANALYZE
-- ================================================================

-- --------------------------------------------------------
-- TEST 1: Payment Idempotency Key Lookup
-- --------------------------------------------------------
-- Location: src/hooks/business/usePaymentOperations.ts:82-87
-- Expected: <5ms after index (was 20-50ms)

-- BEFORE INDEX: Expected Seq Scan
-- AFTER INDEX: Expected Index Scan using idx_payments_idempotency

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM payments
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND idempotency_key = 'test-idempotency-key-123'
LIMIT 1;

-- --------------------------------------------------------
-- TEST 2: Chart of Accounts Code Lookup
-- --------------------------------------------------------
-- Location: src/hooks/business/usePaymentOperations.ts:793-808
-- Expected: <2ms after index (was 10-20ms)

-- BEFORE INDEX: Expected Seq Scan or Filter
-- AFTER INDEX: Expected Index Scan using idx_chart_of_accounts_company_code

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, account_code, account_name, account_level, is_header
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code = '11151'
  AND is_header = false;

-- --------------------------------------------------------
-- TEST 3: Invoice Date Range Query
-- --------------------------------------------------------
-- Location: src/hooks/finance/useInvoices.ts:283-290
-- Expected: <10ms after index (was 50-100ms)

-- BEFORE INDEX: Expected Seq Scan with Filter
-- AFTER INDEX: Expected Bitmap Index Scan or BRIN Index Scan

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, invoice_number, contract_id, due_date, total_amount, status
FROM invoices
WHERE contract_id = '5508c0a9-5b8e-4e2d-9842-31719a3669f4'
  AND due_date >= '2025-01-01'
  AND due_date <= '2025-01-31'
  AND status != 'cancelled'
ORDER BY due_date DESC;

-- ================================================================
-- CURRENT INDEX STATUS
-- ================================================================

-- Check if the new indexes exist
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
)
ORDER BY indexname;

-- ================================================================
-- INDEX USAGE STATISTICS
-- ================================================================

-- Monitor index usage (run after some traffic)
SELECT
    i.schemaname,
    i.tablename,
    i.indexname,
    i.idx_scan as index_scans,
    i.idx_tup_read as tuples_read,
    i.idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(i.indexrelid::regclass)) as index_size
FROM pg_stat_user_indexes i
WHERE i.indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
)
ORDER BY i.idx_scan DESC;

-- ================================================================
-- TABLE SIZES AND ROW COUNTS
-- ================================================================

-- Check table sizes to understand index overhead
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE tablename IN ('payments', 'chart_of_accounts', 'invoices')
ORDER BY tablename;

-- ================================================================
-- PLANNING TIME COMPARISON
-- ================================================================

-- Check query planning time for indexed queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    total_plan_time,
    mean_plan_time
FROM pg_stat_statements
WHERE query LIKE '%payments%' OR query LIKE '%chart_of_accounts%' OR query LIKE '%invoices%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- ================================================================
-- INDEX EFFECTIVENESS METRICS
-- ================================================================

-- Calculate index hit ratio
WITH index_stats AS (
    SELECT
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        CASE
            WHEN idx_scan > 0 THEN idx_tup_fetch::float / idx_scan
            ELSE 0
        END as tuples_per_scan
    FROM pg_stat_user_indexes
    WHERE indexname IN (
        'idx_payments_idempotency',
        'idx_chart_of_accounts_company_code',
        'idx_invoices_contract_date_brin'
    )
)
SELECT
    indexname,
    idx_scan as usage_count,
    tuples_per_scan as avg_tuples_returned,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 10 THEN 'LOW USAGE'
        WHEN idx_scan < 100 THEN 'MODERATE USAGE'
        ELSE 'HIGH USAGE'
    END as usage_level
FROM index_stats
ORDER BY idx_scan DESC;

-- ================================================================
-- MISSING INDEX DETECTION
-- ================================================================

-- Find columns that might benefit from additional indexes
SELECT
    schemaname,
    tablename,
    attname as column_name,
    n_distinct as distinct_values,
    null_frac as null_fraction
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename IN ('payments', 'chart_of_accounts', 'invoices')
  AND (n_distinct > 100 OR n_distinct < 0) -- -1 means unique
ORDER BY tablename, n_distinct DESC;

-- ================================================================
-- PERFORMANCE SUMMARY REPORT
-- ================================================================

-- Generate a summary report
SELECT
    'Performance Index Analysis' as report_type,
    NOW() as generated_at,

    -- Payment stats
    (SELECT row_count FROM pg_stat_user_tables WHERE tablename = 'payments') as payments_rows,
    (SELECT pg_size_pretty(pg_total_relation_size('public.payments'))) as payments_size,
    (SELECT idx_scan FROM pg_stat_user_indexes WHERE indexname = 'idx_payments_idempotency') as payment_index_scans,

    -- Chart of accounts stats
    (SELECT row_count FROM pg_stat_user_tables WHERE tablename = 'chart_of_accounts') as coa_rows,
    (SELECT pg_size_pretty(pg_total_relation_size('public.chart_of_accounts'))) as coa_size,
    (SELECT idx_scan FROM pg_stat_user_indexes WHERE indexname = 'idx_chart_of_accounts_company_code') as coa_index_scans,

    -- Invoice stats
    (SELECT row_count FROM pg_stat_user_tables WHERE tablename = 'invoices') as invoices_rows,
    (SELECT pg_size_pretty(pg_total_relation_size('public.invoices'))) as invoices_size,
    (SELECT idx_scan FROM pg_stat_user_indexes WHERE indexname = 'idx_invoices_contract_date_brin') as invoice_index_scans;

-- ================================================================
-- RECOMMENDATIONS
-- ================================================================

-- Check if indexes are being used effectively
SELECT
    'Index Usage Recommendations' as section,
    indexname,
    idx_scan as scans,
    CASE
        WHEN idx_scan = 0 THEN 'WARNING: Index not being used. Consider dropping.'
        WHEN idx_scan < 10 THEN 'LOW: Index rarely used. Monitor usage.'
        WHEN idx_scan < 100 THEN 'OK: Index moderately used.'
        ELSE 'GOOD: Index heavily used.'
    END as recommendation
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
);

-- ================================================================
-- REAL-WORLD QUERY SIMULATION
-- ================================================================

-- Simulate actual application queries

-- Query 1: Payment creation - idempotency check
EXPLAIN (ANALYZE)
SELECT id, payment_number, amount, payment_status
FROM payments
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND idempotency_key = 'payment-' || extract(epoch from now())::text
LIMIT 1;

-- Query 2: Payment posting - account lookup
EXPLAIN (ANALYZE)
SELECT id, account_code, account_name, is_active
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code IN ('11151', '12101')
  AND is_header = false;

-- Query 3: Invoice creation - duplicate check
EXPLAIN (ANALYZE)
SELECT id, invoice_number, due_date, total_amount
FROM invoices
WHERE contract_id = (
    SELECT id FROM contracts
    WHERE contract_number = 'CTR-2025-0001'
    LIMIT 1
)
  AND due_date >= '2025-01-01'
  AND due_date <= '2025-01-31'
  AND status != 'cancelled'
LIMIT 1;

-- ================================================================
-- END OF ANALYSIS SCRIPT
-- ================================================================
-- Save this output to compare before/after migration
-- Look for:
-- 1. Execution time reduction (EXPLAIN ANALYZE "Execution Time")
-- 2. Buffer reduction (fewer shared buffer hits)
-- 3. Plan changes (Seq Scan → Index Scan)
-- 4. Cost reduction (planner cost estimate)
-- ================================================================
