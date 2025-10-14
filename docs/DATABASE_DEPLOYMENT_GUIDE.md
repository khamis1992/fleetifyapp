# Database Performance Indexes - Deployment Guide
**Fleetify Fleet Management System**  
**Migration File:** `supabase/migrations/20251014_performance_indexes.sql`  
**Date:** October 14, 2025

---

## 📋 Pre-Deployment Checklist

### 1. Timing & Scheduling ⏰
- [ ] **Schedule during off-peak hours** (recommended: 2-5 AM local time)
- [ ] **Estimated execution time:** 5-10 minutes
- [ ] **Backup window:** Allow 15-20 minutes total including backup
- [ ] **Monitor period:** Plan for 1-hour post-deployment monitoring

### 2. Backup Strategy 💾
```bash
# Create full database backup before migration
supabase db dump -f backup_pre_performance_indexes_$(date +%Y%m%d).sql

# Verify backup file created
ls -lh backup_pre_performance_indexes_*.sql
```

### 3. System Health Check 🏥
```sql
-- Check current database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check for long-running queries
SELECT pid, now() - query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' AND now() - query_start > interval '5 minutes';
```

---

## 🚀 Deployment Steps

### Step 1: Review Migration File
```bash
# View the migration file
cat supabase/migrations/20251014_performance_indexes.sql | head -50

# Count indexes to be created
grep "CREATE INDEX" supabase/migrations/20251014_performance_indexes.sql | wc -l
# Expected output: 40+
```

### Step 2: Test in Development First (RECOMMENDED)
```bash
# Apply to development database
supabase db push --file supabase/migrations/20251014_performance_indexes.sql --db-url postgresql://dev-connection-string

# Verify indexes created
supabase db execute "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';" --db-url postgresql://dev-connection-string
```

### Step 3: Production Deployment
```bash
# Connect to production (verify connection first!)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push --file supabase/migrations/20251014_performance_indexes.sql

# Alternative: Direct execution
psql $DATABASE_URL -f supabase/migrations/20251014_performance_indexes.sql
```

### Step 4: Verify Deployment
```sql
-- Check all new indexes were created
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: 40+ indexes

-- Check materialized view
SELECT * FROM mv_company_financial_stats LIMIT 1;
```

---

## 📊 Post-Deployment Validation

### Immediate Validation (Within 5 minutes)

#### 1. Index Usage Verification
```sql
-- Check if indexes are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 20;
```

#### 2. Query Performance Test
```sql
-- Test customer search (should be fast now)
EXPLAIN ANALYZE
SELECT * FROM customers 
WHERE company_id = 'YOUR_COMPANY_ID' 
AND status = 'active' 
ORDER BY created_at DESC 
LIMIT 100;

-- Look for "Index Scan" in output (good)
-- Avoid "Seq Scan" (bad)

-- Test financial queries
EXPLAIN ANALYZE
SELECT * FROM journal_entries 
WHERE company_id = 'YOUR_COMPANY_ID' 
AND entry_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY entry_date DESC;
```

#### 3. System Performance Check
```sql
-- Check database performance
SELECT 
    datname,
    numbackends as connections,
    xact_commit as commits,
    xact_rollback as rollbacks,
    blks_read as disk_reads,
    blks_hit as cache_hits,
    round(blks_hit::numeric / (blks_hit + blks_read) * 100, 2) as cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();

-- Cache hit ratio should be > 95%
```

### Continuous Monitoring (Next 24 hours)

#### 1. Query Performance Monitoring
```sql
-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Should show significant improvement in mean_time
```

#### 2. Index Health Monitoring
```sql
-- Monitor index usage over time
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Unused indexes (idx_scan = 0) after 24 hours may need review
```

#### 3. Application Performance Monitoring
- Check Web Vitals dashboard for load time improvements
- Monitor API response times in production logs
- Track user-reported performance issues

---

## 📈 Expected Performance Improvements

### Query Performance Benchmarks

| Query Type | Before | After | Target | Status |
|------------|--------|-------|--------|--------|
| Customer Search | 500ms+ | <50ms | 90% faster | ⏳ Monitor |
| Financial Reports | 1000ms+ | <100ms | 90% faster | ⏳ Monitor |
| Contract Filtering | 300ms+ | <40ms | 87% faster | ⏳ Monitor |
| Dashboard Stats | 800ms+ | <80ms | 90% faster | ⏳ Monitor |
| Invoice Queries | 200ms+ | <30ms | 85% faster | ⏳ Monitor |

### Success Criteria
- ✅ All indexes created successfully
- ✅ No errors in application logs
- ✅ Query performance improved by >80%
- ✅ Cache hit ratio >95%
- ✅ No increase in error rates

---

## 🔧 Troubleshooting

### Issue: Index Creation Failed

**Symptoms:**
- Error during migration execution
- Missing indexes in pg_indexes

**Solution:**
```sql
-- Check for existing indexes with same name
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_customers_fulltext_search';

-- Drop conflicting index if exists
DROP INDEX IF EXISTS idx_customers_fulltext_search;

-- Re-run specific index creation
CREATE INDEX idx_customers_fulltext_search 
ON customers USING GIN(to_tsvector('arabic', COALESCE(name, '') || ' ' || COALESCE(commercial_register, '')));
```

### Issue: Slow Query Performance After Migration

**Symptoms:**
- Queries still slow despite indexes
- EXPLAIN shows "Seq Scan" instead of "Index Scan"

**Solution:**
```sql
-- Update table statistics
ANALYZE customers;
ANALYZE contracts;
ANALYZE invoices;
ANALYZE payments;

-- Rebuild indexes if needed
REINDEX TABLE customers;

-- Check if index is being used
SET enable_seqscan = off; -- Force index usage for testing
EXPLAIN ANALYZE SELECT * FROM customers WHERE company_id = 'test';
SET enable_seqscan = on; -- Re-enable seq scans
```

### Issue: High CPU Usage After Deployment

**Symptoms:**
- Database CPU spikes
- Slow query response times
- Connection timeouts

**Solution:**
```sql
-- Check for bloat and vacuum
VACUUM ANALYZE;

-- Check for lock contention
SELECT * FROM pg_locks WHERE granted = false;

-- Monitor active queries
SELECT pid, query, state, wait_event_type, wait_event 
FROM pg_stat_activity 
WHERE state = 'active';

-- If necessary, terminate problematic query
SELECT pg_terminate_backend(pid) WHERE pid = 12345;
```

### Issue: Materialized View Not Refreshing

**Symptoms:**
- mv_company_financial_stats shows old data
- Dashboard stats incorrect

**Solution:**
```sql
-- Manual refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_company_financial_stats;

-- Check last refresh time
SELECT 
    schemaname,
    matviewname,
    ispopulated
FROM pg_matviews
WHERE matviewname = 'mv_company_financial_stats';

-- Set up automatic refresh (optional)
-- Create a cron job or scheduled function to refresh periodically
```

---

## 🔄 Rollback Procedure

### When to Rollback
- Multiple index creation failures
- Significant performance degradation
- Application errors related to queries
- Database stability issues

### Rollback Steps
```sql
-- Drop all indexes created by migration
-- WARNING: This will revert performance improvements

-- Drop specific indexes
DROP INDEX IF EXISTS idx_customers_fulltext_search;
DROP INDEX IF EXISTS idx_customers_company_status_created;
DROP INDEX IF EXISTS idx_journal_entries_company_date_status;
-- ... (list all indexes from migration)

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_company_financial_stats;

-- Restore from backup
psql $DATABASE_URL < backup_pre_performance_indexes_YYYYMMDD.sql
```

### Partial Rollback (Keep Some Indexes)
```sql
-- If only specific indexes are problematic
DROP INDEX IF EXISTS problematic_index_name;

-- Keep others intact
-- Re-run only successful index creations if needed
```

---

## 📝 Post-Deployment Reporting

### Success Report Template
```
Performance Indexes Deployment - Success Report
Date: [YYYY-MM-DD]
Time: [HH:MM]
Duration: [X minutes]

Indexes Created: [40+]
Errors: [0]
Warnings: [0]

Performance Improvements:
- Customer Search: [500ms → 45ms] (91% faster)
- Financial Reports: [1000ms → 95ms] (90.5% faster)
- Dashboard Stats: [800ms → 75ms] (90.6% faster)

System Health:
- Cache Hit Ratio: [96.5%]
- Active Connections: [12]
- Error Rate: [0%]

Status: ✅ SUCCESSFUL
Next Steps: Monitor for 24 hours
```

### Issue Report Template (if problems occur)
```
Performance Indexes Deployment - Issue Report
Date: [YYYY-MM-DD]
Time: [HH:MM]

Issue: [Description]
Impact: [High/Medium/Low]
Affected Components: [List]

Actions Taken:
1. [Action 1]
2. [Action 2]

Resolution: [Pending/Resolved]
Rollback: [Yes/No]

Status: ⚠️ NEEDS ATTENTION
Follow-up: [Next steps]
```

---

## 📚 Additional Resources

### Monitoring Queries
```sql
-- Save these for ongoing monitoring

-- Daily index health check
SELECT 
    t.tablename,
    i.indexname,
    i.idx_scan,
    pg_size_pretty(pg_relation_size(i.indexrelid)) as size
FROM pg_stat_user_indexes i
JOIN pg_stat_user_tables t ON i.relid = t.relid
WHERE t.schemaname = 'public'
ORDER BY i.idx_scan DESC;

-- Weekly performance report
SELECT 
    query,
    calls,
    total_time::numeric / 1000 as total_time_seconds,
    (total_time / calls)::numeric as avg_time_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY total_time DESC
LIMIT 20;
```

### Useful Commands
```bash
# Check database size
du -sh /var/lib/postgresql/data

# Monitor live query activity
watch -n 2 'psql -c "SELECT count(*) as queries, state FROM pg_stat_activity GROUP BY state"'

# Export index usage report
psql -c "COPY (SELECT * FROM pg_stat_user_indexes WHERE schemaname='public') TO STDOUT CSV HEADER" > index_usage_report.csv
```

---

## ✅ Final Checklist

Before marking deployment complete:

- [ ] All 40+ indexes created successfully
- [ ] Materialized view created and populated
- [ ] No errors in database logs
- [ ] Query performance improved significantly
- [ ] Application functioning normally
- [ ] No increase in error rates
- [ ] Web Vitals showing improvements
- [ ] Backup verified and stored safely
- [ ] Monitoring dashboard updated
- [ ] Team notified of successful deployment
- [ ] Documentation updated with actual performance metrics
- [ ] 24-hour monitoring scheduled

---

**Deployment Guide Version:** 1.0  
**Last Updated:** October 14, 2025  
**Status:** Ready for Production Deployment  
**Estimated Risk:** LOW (Non-breaking changes)

---

*For questions or issues during deployment, refer to the troubleshooting section or contact the database team.*
