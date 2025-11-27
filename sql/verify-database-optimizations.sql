-- ================================================================
-- DATABASE OPTIMIZATION VERIFICATION SCRIPT
-- ================================================================
-- Purpose: Verify all performance optimizations are working correctly
-- Created: 2025-10-16
-- Run this script to verify database performance improvements
-- ================================================================

-- ================================================================
-- PART 1: VERIFY MIGRATIONS APPLIED
-- ================================================================

\echo '================================'
\echo 'PART 1: MIGRATION VERIFICATION'
\echo '================================'
\echo ''

-- Check if performance indexes migration exists
SELECT
  'Performance Indexes Migration' as migration_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'idx_payments_contract_status'
    ) THEN '✅ APPLIED'
    ELSE '❌ MISSING'
  END as status;

-- Check if dashboard RPC function exists
SELECT
  'Dashboard Stats RPC Function' as function_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'get_dashboard_stats'
      AND n.nspname = 'public'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

\echo ''

-- ================================================================
-- PART 2: VERIFY CRITICAL INDEXES EXIST
-- ================================================================

\echo '================================'
\echo 'PART 2: INDEX VERIFICATION'
\echo '================================'
\echo ''

-- List all performance-related indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
  idx_scan as times_used,
  CASE
    WHEN idx_scan = 0 THEN '⚠️  NEVER USED'
    WHEN idx_scan < 10 THEN '⚠️  RARELY USED'
    WHEN idx_scan < 100 THEN '✅ OCCASIONALLY USED'
    ELSE '✅ FREQUENTLY USED'
  END as usage_status
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
  AND indexname IN (
    'idx_rental_receipts_customer_date',
    'idx_payments_contract_status',
    'idx_payments_contract_array',
    'idx_customer_accounts_customer',
    'idx_journal_entry_lines_account',
    'idx_contracts_expiration',
    'idx_customers_fulltext_search',
    'idx_vehicles_status_company',
    'idx_invoices_contract_status',
    'idx_contracts_customer_status',
    'idx_payments_contract_completed',
    'idx_audit_logs_user_action'
  )
ORDER BY tablename, indexname;

\echo ''

-- Summary of index usage
SELECT
  COUNT(*) as total_performance_indexes,
  COUNT(*) FILTER (WHERE idx_scan > 0) as used_indexes,
  COUNT(*) FILTER (WHERE idx_scan = 0) as unused_indexes,
  ROUND(AVG(idx_scan), 2) as avg_scans_per_index
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
  AND indexname LIKE '%contract%' OR indexname LIKE '%payment%' OR indexname LIKE '%customer%';

\echo ''

-- ================================================================
-- PART 3: VERIFY RPC FUNCTION WORKS
-- ================================================================

\echo '================================'
\echo 'PART 3: RPC FUNCTION TEST'
\echo '================================'
\echo ''

-- Test dashboard stats RPC function with timing
\timing on

EXPLAIN ANALYZE
SELECT get_dashboard_stats(
  (SELECT id FROM companies LIMIT 1)
);

\timing off

\echo ''
\echo 'Expected time: < 200ms for RPC function'
\echo ''

-- ================================================================
-- PART 4: QUERY PERFORMANCE BENCHMARKS
-- ================================================================

\echo '================================'
\echo 'PART 4: PERFORMANCE BENCHMARKS'
\echo '================================'
\echo ''

-- Benchmark 1: Contract payment aggregation (N+1 fix)
\echo 'Benchmark 1: Contract Payment Aggregation'
\echo 'Testing optimized bulk query vs old N+1 pattern'
\echo ''

\timing on

-- Optimized query (should use idx_payments_contract_status)
EXPLAIN ANALYZE
SELECT
  c.id,
  c.contract_number,
  COALESCE(SUM(p.amount), 0) as total_paid
FROM contracts c
LEFT JOIN payments p ON p.contract_id = c.id
  AND p.payment_status = 'completed'
WHERE c.company_id = (SELECT id FROM companies LIMIT 1)
  AND c.status = 'active'
GROUP BY c.id, c.contract_number
LIMIT 100;

\timing off

\echo ''
\echo 'Expected: < 100ms for 100 contracts (was 5000ms before optimization)'
\echo ''

-- Benchmark 2: Customer search with Arabic text
\echo 'Benchmark 2: Arabic Full-Text Search'
\echo ''

\timing on

EXPLAIN ANALYZE
SELECT
  id,
  first_name_ar,
  last_name_ar,
  phone
FROM customers
WHERE to_tsvector('arabic',
  COALESCE(first_name_ar, '') || ' ' ||
  COALESCE(last_name_ar, '') || ' ' ||
  COALESCE(phone, '')
) @@ plainto_tsquery('arabic', 'محمد')
LIMIT 20;

\timing off

\echo ''
\echo 'Expected: < 50ms (was 300ms+ before optimization)'
\echo ''

-- Benchmark 3: Contract expiration queries
\echo 'Benchmark 3: Contract Expiration Query'
\echo ''

\timing on

EXPLAIN ANALYZE
SELECT
  id,
  contract_number,
  end_date,
  status
FROM contracts
WHERE company_id = (SELECT id FROM companies LIMIT 1)
  AND status = 'active'
  AND end_date IS NOT NULL
  AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY end_date ASC;

\timing off

\echo ''
\echo 'Expected: < 20ms (should use idx_contracts_expiration)'
\echo ''

-- ================================================================
-- PART 5: INDEX USAGE ANALYSIS
-- ================================================================

\echo '================================'
\echo 'PART 5: INDEX USAGE ANALYSIS'
\echo '================================'
\echo ''

-- Show which indexes are being used by queries
SELECT
  schemaname || '.' || tablename as table,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  CASE
    WHEN idx_scan = 0 THEN '❌ NEVER USED - Consider dropping'
    WHEN idx_scan < 100 THEN '⚠️  LOW USAGE'
    ELSE '✅ ACTIVELY USED'
  END as recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC, tablename;

\echo ''

-- ================================================================
-- PART 6: TABLE STATISTICS
-- ================================================================

\echo '================================'
\echo 'PART 6: TABLE STATISTICS'
\echo '================================'
\echo ''

-- Show table sizes and row counts
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
  n_live_tup as estimated_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE tablename IN (
  'customers', 'contracts', 'payments', 'vehicles',
  'invoices', 'rental_payment_receipts', 'customer_accounts'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''

-- ================================================================
-- PART 7: SLOW QUERY DETECTION
-- ================================================================

\echo '================================'
\echo 'PART 7: SLOW QUERY DETECTION'
\echo '================================'
\echo ''

-- Note: This requires pg_stat_statements extension
-- Check if extension exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    ) THEN 'pg_stat_statements is enabled ✅'
    ELSE 'pg_stat_statements NOT available - cannot show slow queries ⚠️'
  END as extension_status;

-- If extension exists, show slow queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RAISE NOTICE 'Showing top 10 slowest queries:';
  END IF;
END $$;

-- Show top slow queries (if extension available)
SELECT
  query,
  calls,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
  ROUND(total_exec_time::numeric, 2) as total_time_ms,
  ROUND((100 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) as pct_total_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_catalog%'
ORDER BY mean_exec_time DESC
LIMIT 10;

\echo ''

-- ================================================================
-- PART 8: RECOMMENDATIONS
-- ================================================================

\echo '================================'
\echo 'PART 8: OPTIMIZATION RECOMMENDATIONS'
\echo '================================'
\echo ''

-- Check for missing indexes on foreign keys
SELECT
  'Missing index on ' || table_name || '.' || column_name as issue,
  'Consider creating index for better JOIN performance' as recommendation
FROM (
  SELECT
    tc.table_name,
    kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = tc.table_name
      AND indexdef LIKE '%' || kcu.column_name || '%'
    )
) missing_fk_indexes
LIMIT 10;

\echo ''

-- Check for tables that need VACUUM
SELECT
  schemaname || '.' || tablename as table_name,
  n_dead_tup as dead_tuples,
  n_live_tup as live_tuples,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_pct,
  CASE
    WHEN n_dead_tup > 1000 AND n_dead_tup > n_live_tup * 0.2
    THEN '⚠️  VACUUM RECOMMENDED'
    ELSE '✅ OK'
  END as status
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 10;

\echo ''

-- ================================================================
-- PART 9: PERFORMANCE SUMMARY
-- ================================================================

\echo '================================'
\echo 'PART 9: PERFORMANCE SUMMARY'
\echo '================================'
\echo ''

SELECT
  'Database Performance Health Check' as report_title,
  NOW() as generated_at;

\echo ''
\echo 'VERIFICATION COMPLETE!'
\echo ''
\echo 'Expected Results Summary:'
\echo '- ✅ All performance indexes should exist'
\echo '- ✅ Dashboard RPC function should execute < 200ms'
\echo '- ✅ Contract queries should complete < 100ms'
\echo '- ✅ Customer search should complete < 50ms'
\echo '- ✅ Indexes should show active usage (idx_scan > 0)'
\echo ''
\echo 'If any benchmarks fail, review the specific section above.'
\echo '================================'
