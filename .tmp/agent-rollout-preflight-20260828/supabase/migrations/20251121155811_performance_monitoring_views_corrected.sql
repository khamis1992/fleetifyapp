-- Performance monitoring views for database optimization (corrected)
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan > 0
ORDER BY idx_scan DESC;

CREATE OR REPLACE VIEW table_size_stats AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

CREATE OR REPLACE VIEW index_maintenance_recommendations AS
SELECT
    'Unused indexes' as recommendation_type,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    'Consider dropping this index if not needed' as action,
    idx_scan as usage_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'

UNION ALL

SELECT
    'Heavily used indexes' as recommendation_type,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    'Monitor for performance' as action,
    idx_scan as usage_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan > 10000
ORDER BY recommendation_type, usage_count DESC;;
