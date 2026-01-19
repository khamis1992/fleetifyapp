-- ================================================================
-- Performance Optimization: Wave 2.3 - Missing Database Indexes
-- ================================================================
-- Created: January 19, 2025
-- Purpose: Add critical indexes for frequently queried columns
--
-- Performance Audit Findings:
-- 1. Payment idempotency checks slow (20-50ms)
-- 2. Chart of accounts lookups by code slow (10-20ms)
-- 3. Invoice date range queries slow (50-100ms)
--
-- Expected Improvements:
-- - Payment idempotency: <5ms (10x faster)
-- - Account code lookup: <2ms (10x faster)
-- - Invoice date range: <10ms (10x faster)
-- ================================================================

-- ================================================================
-- INDEX 1: PAYMENTS IDEMPOTENCY KEY
-- ================================================================
-- Use Case: Prevent duplicate payments during retry logic
-- Location: src/hooks/business/usePaymentOperations.ts:82-87
-- Current Issue: Sequential scan on idempotency_key lookup
-- Solution: Composite index with partial filter for non-null keys

-- This index supports the duplicate prevention check:
-- SELECT * FROM payments
-- WHERE company_id = '...' AND idempotency_key = '...';

CREATE INDEX IF NOT EXISTS idx_payments_idempotency
ON payments(company_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- ================================================================
-- INDEX 2: CHART OF ACCOUNTS COMPANY + CODE
-- ================================================================
-- Use Case: Frequent account lookups by account_code
-- Location: src/hooks/business/usePaymentOperations.ts:793-808
-- Current Issue: Sequential scan when filtering by code
-- Solution: Composite index with partial filter for leaf accounts

-- This index supports queries like:
-- SELECT * FROM chart_of_accounts
-- WHERE company_id = '...' AND account_code = '11151' AND is_header = false;

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_code
ON chart_of_accounts(company_id, account_code)
WHERE is_header = false;

-- ================================================================
-- INDEX 3: INVOICES CONTRACT + DATE RANGE (BRIN)
-- ================================================================
-- Use Case: Invoice date range queries for duplicate detection
-- Location: src/hooks/finance/useInvoices.ts:283-290
-- Current Issue: Sequential scan on date ranges
-- Solution: BRIN index for efficient date range scanning
-- Note: BRIN is ideal for large tables with correlated date data

-- This index supports queries like:
-- SELECT * FROM invoices
-- WHERE contract_id = '...'
--   AND due_date >= '2025-01-01'
--   AND due_date <= '2025-01-31';

CREATE INDEX IF NOT EXISTS idx_invoices_contract_date_brin
ON invoices USING BRIN(contract_id, due_date)
WHERE due_date IS NOT NULL;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these after migration to verify indexes were created:

-- 1. Check index exists
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE indexname IN (
--     'idx_payments_idempotency',
--     'idx_chart_of_accounts_company_code',
--     'idx_invoices_contract_date_brin'
-- );

-- 2. Check index size
-- SELECT
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size
-- FROM pg_stat_user_indexes
-- WHERE indexname IN (
--     'idx_payments_idempotency',
--     'idx_chart_of_accounts_company_code',
--     'idx_invoices_contract_date_brin'
-- );

-- 3. Analyze query plan improvement
-- EXPLAIN ANALYZE
-- SELECT * FROM payments
-- WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
--   AND idempotency_key = 'test-key-123'
-- LIMIT 1;

-- ================================================================
-- ROLLBACK SCRIPT (if needed)
-- ================================================================
-- DROP INDEX IF EXISTS idx_payments_idempotency;
-- DROP INDEX IF EXISTS idx_chart_of_accounts_company_code;
-- DROP INDEX IF EXISTS idx_invoices_contract_date_brin;

-- ================================================================
-- POST-MIGRATION TASKS
-- ================================================================
-- 1. Run ANALYZE on all three tables to update statistics
-- ANALYZE payments;
-- ANALYZE chart_of_accounts;
-- ANALYZE invoices;

-- 2. Monitor index usage over time
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as usage_count,
--     idx_tup_read as tuples_read,
--     idx_tup_fetched as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE indexname IN (
--     'idx_payments_idempotency',
--     'idx_chart_of_accounts_company_code',
--     'idx_invoices_contract_date_brin'
-- )
-- ORDER BY idx_scan DESC;

-- 3. Check for index bloat (run weekly)
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid::regclass)) as index_size,
--     idx_scan,
--     idx_tup_read,
--     idx_tup_fetched
-- FROM pg_stat_user_indexes
-- WHERE indexname IN (
--     'idx_payments_idempotency',
--     'idx_chart_of_accounts_company_code',
--     'idx_invoices_contract_date_brin'
-- );

-- ================================================================
-- PERFORMANCE MONITORING
-- ================================================================
-- Create function to monitor index effectiveness

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

-- Grant access to monitoring function
GRANT EXECUTE ON FUNCTION check_performance_indexes() TO authenticated, service_role;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
-- Documented performance improvements expected:
-- - Payment idempotency checks: 20-50ms → <5ms
-- - Account code lookups: 10-20ms → <2ms
-- - Invoice date range queries: 50-100ms → <10ms
--
-- Next steps:
-- 1. Apply migration to staging
-- 2. Run EXPLAIN ANALYZE before/after
-- 3. Verify application queries work correctly
-- 4. Monitor index usage for 7 days
-- 5. Apply to production if tests pass
-- ================================================================
