-- ================================================================
-- QUICK REFERENCE: Performance Indexes Wave 2.3
-- ================================================================
-- This file contains all essential commands for deployment
-- Copy and paste into psql as needed
-- ================================================================

-- ================================================================
-- 1. CHECK CURRENT STATUS (Before Migration)
-- ================================================================

-- Check if indexes exist
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
);

-- Expected: No rows returned (indexes don't exist yet)

-- ================================================================
-- 2. RUN BASELINE PERFORMANCE TESTS (Before Migration)
-- ================================================================

-- Test 1: Payment Idempotency (Expected: ~20-50ms, Seq Scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM payments
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND idempotency_key = 'test-key-123'
LIMIT 1;

-- Test 2: Account Code Lookup (Expected: ~10-20ms, Seq Scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, account_code, account_name
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code = '11151'
  AND is_header = false;

-- Test 3: Invoice Date Range (Expected: ~50-100ms, Seq Scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, invoice_number, due_date, total_amount
FROM invoices
WHERE contract_id = (SELECT id FROM contracts LIMIT 1)
  AND due_date >= '2025-01-01'
  AND due_date <= '2025-01-31'
LIMIT 10;

-- ================================================================
-- 3. APPLY MIGRATION (Create Indexes)
-- ================================================================

-- Index 1: Payment Idempotency
CREATE INDEX IF NOT EXISTS idx_payments_idempotency
ON payments(company_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Index 2: Chart of Accounts Code
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_code
ON chart_of_accounts(company_id, account_code)
WHERE is_header = false;

-- Index 3: Invoice Date Range (BRIN)
CREATE INDEX IF NOT EXISTS idx_invoices_contract_date_brin
ON invoices USING BRIN(contract_id, due_date)
WHERE due_date IS NOT NULL;

-- Update table statistics
ANALYZE payments;
ANALYZE chart_of_accounts;
ANALYZE invoices;

-- ================================================================
-- 4. VERIFY INDEXES CREATED
-- ================================================================

-- Check indexes exist now
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
);

-- Expected: 3 rows returned

-- Check index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
);

-- Expected: Small sizes (<10MB each for typical datasets)

-- ================================================================
-- 5. RUN POST-MIGRATION PERFORMANCE TESTS
-- ================================================================

-- Test 1: Payment Idempotency (Expected: <5ms, Index Scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM payments
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND idempotency_key = 'test-key-123'
LIMIT 1;

-- Expected: "Index Scan using idx_payments_idempotency"
-- Expected: "Execution Time: < 5.000 ms"

-- Test 2: Account Code Lookup (Expected: <2ms, Index Scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, account_code, account_name
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code = '11151'
  AND is_header = false;

-- Expected: "Index Scan using idx_chart_of_accounts_company_code"
-- Expected: "Execution Time: < 2.000 ms"

-- Test 3: Invoice Date Range (Expected: <10ms, Bitmap/BRIN Scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, invoice_number, due_date, total_amount
FROM invoices
WHERE contract_id = (SELECT id FROM contracts LIMIT 1)
  AND due_date >= '2025-01-01'
  AND due_date <= '2025-01-31'
LIMIT 10;

-- Expected: "Bitmap Index Scan" or "BRIN Index Scan"
-- Expected: "Execution Time: < 10.000 ms"

-- ================================================================
-- 6. MONITOR INDEX USAGE (Run Daily for First Week)
-- ================================================================

-- Check how often indexes are used
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as usage_count,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
)
ORDER BY idx_scan DESC;

-- Expected: usage_count should increase daily

-- ================================================================
-- 7. HEALTH CHECK FUNCTION
-- ================================================================

-- Create monitoring function (if not exists)
CREATE OR REPLACE FUNCTION check_performance_indexes()
RETURNS TABLE(
    index_name text,
    table_name text,
    index_size text,
    usage_count bigint,
    tuples_read bigint,
    tuples_fetched bigint,
    last_vacuum timestamp,
    last_autovacuum timestamp,
    last_analyze timestamp,
    last_autoanalyze timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.indexname,
        i.tablename,
        pg_size_pretty(pg_relation_size(i.indexrelid::regclass)) as index_size,
        i.idx_scan as usage_count,
        i.idx_tup_read as tuples_read,
        i.idx_tup_fetched as tuples_fetched,
        v.last_vacuum,
        v.last_autovacuum,
        v.last_analyze,
        v.last_autoanalyze
    FROM pg_stat_user_indexes i
    LEFT JOIN pg_stat_user_tables v ON v.relid = i.relid
    WHERE i.indexname IN (
        'idx_payments_idempotency',
        'idx_chart_of_accounts_company_code',
        'idx_invoices_contract_date_brin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run health check
SELECT * FROM check_performance_indexes();

-- ================================================================
-- 8. ROLLBACK (If Needed)
-- ================================================================

-- Drop all three indexes
DROP INDEX IF EXISTS idx_payments_idempotency;
DROP INDEX IF EXISTS idx_chart_of_accounts_company_code;
DROP INDEX IF EXISTS idx_invoices_contract_date_brin;

-- Verify indexes dropped
SELECT indexname FROM pg_indexes
WHERE indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
);

-- Expected: No rows returned

-- ================================================================
-- 9. TROUBLESHOOTING
-- ================================================================

-- If indexes are not being used, check statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
);

-- If idx_scan = 0, try updating statistics
ANALYZE payments;
ANALYZE chart_of_accounts;
ANALYZE invoices;

-- Check for index bloat
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size,
    idx_scan
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
);

-- If size is large (>100MB), consider reindexing
REINDEX INDEX idx_payments_idempotency;
REINDEX INDEX idx_chart_of_accounts_company_code;
REINDEX INDEX idx_invoices_contract_date_brin;

-- ================================================================
-- 10. PERFORMANCE COMPARISON SUMMARY
-- ================================================================

-- Before Migration (Expected):
-- - Payment idempotency: 20-50ms (Seq Scan)
-- - Account lookup: 10-20ms (Seq Scan)
-- - Invoice date range: 50-100ms (Seq Scan)

-- After Migration (Expected):
-- - Payment idempotency: <5ms (Index Scan) ✓ 10x faster
-- - Account lookup: <2ms (Index Scan) ✓ 10x faster
-- - Invoice date range: <10ms (Bitmap/BRIN Scan) ✓ 10x faster

-- ================================================================
-- END OF QUICK REFERENCE
-- ================================================================
