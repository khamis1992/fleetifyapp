-- RLS Policy Optimization
-- Phase 1: Performance Optimization
-- Created: 2025-10-12

-- =============================================
-- RLS POLICY OPTIMIZATION GUIDE
-- =============================================

-- This file documents RLS policy optimization recommendations
-- These optimizations should be applied carefully and tested in staging first

-- =============================================
-- GENERAL PRINCIPLES
-- =============================================

-- 1. Use indexed columns in RLS policies
-- 2. Avoid complex subqueries in policies
-- 3. Cache company_id lookups where possible
-- 4. Use SECURITY DEFINER functions for complex checks
-- 5. Minimize policy complexity

-- =============================================
-- CUSTOMERS TABLE OPTIMIZATION
-- =============================================

-- Current policy pattern (example):
-- CREATE POLICY "Users can view own company customers"
-- ON customers FOR SELECT
-- USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- Optimized approach: Use indexed columns directly
-- The company_id index we created will help with this

-- Note: Actual RLS policies should remain as-is for security
-- Performance is achieved through proper indexing (already done)

-- =============================================
-- CONTRACTS TABLE OPTIMIZATION
-- =============================================

-- Ensure RLS policies use indexed columns
-- Index on company_id is already created in performance_indexes.sql

-- =============================================
-- PAYMENTS TABLE OPTIMIZATION  
-- =============================================

-- RLS policies should leverage the indexes created
-- Composite index on (company_id, payment_date) will help

-- =============================================
-- OPTIMIZATION RECOMMENDATIONS
-- =============================================

-- 1. Keep existing RLS policies - they are security-critical
-- 2. Performance gains come from indexes (already applied)
-- 3. For super-heavy queries, consider:
--    a) Materialized views (refresh periodically)
--    b) Cached computed columns
--    c) Database functions with SECURITY DEFINER

-- =============================================
-- EXAMPLE: MATERIALIZED VIEW FOR REPORTING
-- =============================================

-- Create materialized view for heavy aggregations
-- Refresh periodically rather than computing on every query

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_summary AS
SELECT 
    c.id as customer_id,
    c.company_id,
    c.customer_code,
    c.customer_type,
    COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as display_name,
    COUNT(DISTINCT co.id) as total_contracts,
    COUNT(DISTINCT co.id) FILTER (WHERE co.status = 'active') as active_contracts,
    COALESCE(SUM(p.amount), 0) as total_revenue,
    MAX(co.created_at) as last_contract_date
FROM customers c
LEFT JOIN contracts co ON co.customer_id = c.id
LEFT JOIN payments p ON p.customer_id = c.id
GROUP BY c.id, c.company_id, c.customer_code, c.customer_type, c.company_name, c.first_name, c.last_name;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_customer_summary_company 
ON mv_customer_summary(company_id);

-- Refresh function (call this periodically, e.g., every hour)
CREATE OR REPLACE FUNCTION refresh_customer_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_summary;
END;
$$;

-- =============================================
-- EXAMPLE: CACHED COMPANY ACCESS FUNCTION
-- =============================================

-- Function to get user's company_id (with caching potential)
CREATE OR REPLACE FUNCTION get_user_company_id(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id
    FROM profiles
    WHERE user_id = user_uuid;
    
    RETURN v_company_id;
END;
$$;

-- =============================================
-- RLS POLICY BEST PRACTICES
-- =============================================

-- ✅ DO: Use indexed columns
-- CREATE POLICY "policy_name" ON table_name
-- USING (company_id = get_user_company_id(auth.uid()));

-- ✅ DO: Keep policies simple
-- Complex logic should be in SECURITY DEFINER functions

-- ❌ DON'T: Use complex subqueries in policies
-- Avoid: (SELECT ... FROM ... WHERE ... AND ...)

-- ❌ DON'T: Join multiple tables in RLS policy
-- Use functions instead for complex checks

-- =============================================
-- MONITORING RLS PERFORMANCE
-- =============================================

-- Check slow queries that might be affected by RLS
-- Run this to identify problematic queries:

/*
SELECT 
    calls,
    total_time,
    mean_time,
    query
FROM pg_stat_statements
WHERE query LIKE '%customers%'
   OR query LIKE '%contracts%'
   OR query LIKE '%payments%'
ORDER BY mean_time DESC
LIMIT 20;
*/

-- =============================================
-- REFRESH SCHEDULE RECOMMENDATION
-- =============================================

-- For materialized views, set up periodic refresh:
-- Option 1: Use pg_cron extension
-- SELECT cron.schedule('refresh-customer-summary', '0 * * * *', 'SELECT refresh_customer_summary()');

-- Option 2: Application-level refresh (recommended)
-- Call refresh_customer_summary() from application every hour

-- =============================================
-- NOTES
-- =============================================

-- 1. RLS policies are critical for security - don't modify without careful review
-- 2. Performance improvements come primarily from proper indexing (already done)
-- 3. For very heavy queries, use materialized views or application-level caching
-- 4. Monitor query performance regularly using pg_stat_statements
-- 5. Test all changes in staging environment first

-- =============================================
-- VERIFICATION
-- =============================================

-- After applying, verify materialized view works:
-- SELECT COUNT(*) FROM mv_customer_summary;

-- Check refresh function:
-- SELECT refresh_customer_summary();

-- Monitor impact:
-- Compare query times before/after using EXPLAIN ANALYZE
