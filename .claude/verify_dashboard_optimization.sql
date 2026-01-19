-- ============================================================================
-- VERIFICATION SCRIPT: Dashboard Query Optimization (Wave 2.1)
-- ============================================================================
-- Purpose: Verify that dashboard_summary view returns correct data
-- Expected: Single query returns all dashboard metrics
-- ============================================================================

-- Test 1: Verify dashboard_summary view exists and is accessible
SELECT
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public'
    AND viewname = 'dashboard_summary';

-- Test 2: Check indexes on dashboard_summary
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'dashboard_summary';

-- Test 3: Sample query to verify view returns correct structure
SELECT * FROM dashboard_summary
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
LIMIT 1;

-- Test 4: Compare query performance
-- Old approach (3 queries):
EXPLAIN ANALYZE
SELECT COUNT(*) FROM vehicles WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND is_active = true;

EXPLAIN ANALYZE
SELECT COUNT(*) FROM contracts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND status = 'active';

EXPLAIN ANALYZE
SELECT COUNT(*) FROM customers WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND is_active = true;

-- New approach (1 query):
EXPLAIN ANALYZE
SELECT * FROM dashboard_summary
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Test 5: Verify data accuracy
-- Compare counts from individual queries vs view
WITH vehicle_count AS (
    SELECT COUNT(*) as count FROM vehicles
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND is_active = true
),
contract_count AS (
    SELECT COUNT(*) as count FROM contracts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND status = 'active'
),
customer_count AS (
    SELECT COUNT(*) as count FROM customers
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND is_active = true
),
view_data AS (
    SELECT
        vehicle_metrics->>'active_vehicles' as vehicles,
        contract_metrics->>'active_contracts' as contracts,
        customer_metrics->>'total_customers' as customers
    FROM dashboard_summary
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
)
SELECT
    vehicle_count.count as actual_vehicles,
    view_data.vehicles as view_vehicles,
    contract_count.count as actual_contracts,
    view_data.contracts as view_contracts,
    customer_count.count as actual_customers,
    view_data.customers as view_customers,
    CASE
        WHEN vehicle_count.count::text = view_data.vehicles
            AND contract_count.count::text = view_data.contracts
            AND customer_count.count::text = view_data.customers
        THEN 'PASS: Data matches'
        ELSE 'FAIL: Data mismatch'
    END as verification_result
FROM vehicle_count, contract_count, customer_count, view_data;
