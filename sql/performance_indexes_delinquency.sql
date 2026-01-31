-- ================================================================
-- PERFORMANCE INDEXES FOR DELINQUENCY PAGE
-- ================================================================
-- Purpose: Add indexes to improve query performance for delinquency calculations
-- Impact: Expected 50% reduction in query time
-- Date: 2026-01-31
-- ================================================================

-- ================================================================
-- 1. CONTRACTS TABLE INDEXES
-- ================================================================

-- Index for filtering active/cancelled contracts by company and status
-- Used in: useDelinquentCustomers - Step 1 (Get all active contracts)
CREATE INDEX IF NOT EXISTS idx_contracts_company_status_balance 
ON contracts(company_id, status, balance_due DESC)
WHERE status IN ('active', 'cancelled', 'closed', 'under_legal_procedure');

-- Index for contract lookup by customer
CREATE INDEX IF NOT EXISTS idx_contracts_customer_company 
ON contracts(customer_id, company_id)
WHERE status IN ('active', 'cancelled', 'closed', 'under_legal_procedure');

-- ================================================================
-- 2. INVOICES TABLE INDEXES
-- ================================================================

-- Index for overdue invoices lookup
-- Used in: useDelinquentCustomers - Get oldest unpaid invoice per contract
CREATE INDEX IF NOT EXISTS idx_invoices_contract_due_status 
ON invoices(company_id, contract_id, due_date, payment_status)
WHERE status != 'cancelled' 
AND payment_status IN ('pending', 'partial', 'partially_paid', 'overdue', 'unpaid');

-- Index for invoice amount calculations
CREATE INDEX IF NOT EXISTS idx_invoices_contract_amounts 
ON invoices(contract_id, total_amount, paid_amount, due_date)
WHERE status != 'cancelled';

-- ================================================================
-- 3. PAYMENTS TABLE INDEXES
-- ================================================================

-- Index for customer payments lookup
-- Used in: useDelinquentCustomers - Get all payments for these contracts
CREATE INDEX IF NOT EXISTS idx_payments_customer_status_date 
ON payments(company_id, customer_id, payment_status, payment_date DESC)
WHERE payment_status IN ('completed', 'paid', 'approved');

-- Index for payment amounts by customer
CREATE INDEX IF NOT EXISTS idx_payments_customer_amount 
ON payments(customer_id, amount, payment_date DESC)
WHERE payment_status IN ('completed', 'paid', 'approved');

-- ================================================================
-- 4. TRAFFIC VIOLATIONS TABLE INDEXES
-- ================================================================

-- Index for unpaid violations by vehicle
-- Used in: useDelinquentCustomers - Get traffic violations for vehicles
CREATE INDEX IF NOT EXISTS idx_violations_vehicle_status 
ON traffic_violations(company_id, vehicle_id, status, fine_amount)
WHERE status != 'paid';

-- ================================================================
-- 5. LEGAL CASES TABLE INDEXES
-- ================================================================

-- Index for legal cases history by customer
-- Used in: useDelinquentCustomers - Get legal cases history
CREATE INDEX IF NOT EXISTS idx_legal_cases_client_company 
ON legal_cases(company_id, client_id, case_status);

-- ================================================================
-- 6. CUSTOMER VERIFICATION TASKS TABLE INDEXES
-- ================================================================

-- Index for pending verification tasks
-- Used in: useDelinquentCustomers - Filter out contracts with pending verification
CREATE INDEX IF NOT EXISTS idx_verification_tasks_contract_status 
ON customer_verification_tasks(company_id, contract_id, status)
WHERE status = 'pending';

-- ================================================================
-- 7. DELINQUENT CUSTOMERS TABLE INDEXES (Cached Table)
-- ================================================================

-- Index for filtering by company and risk score
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_company_risk 
ON delinquent_customers(company_id, risk_score DESC)
WHERE is_active = true;

-- Index for filtering by risk level
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_risk_level 
ON delinquent_customers(company_id, risk_level, days_overdue DESC)
WHERE is_active = true;

-- Index for filtering by overdue period
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_overdue 
ON delinquent_customers(company_id, days_overdue DESC)
WHERE is_active = true;

-- Index for search by customer name/code
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_search 
ON delinquent_customers USING gin(
  to_tsvector('arabic', customer_name || ' ' || COALESCE(customer_code, ''))
)
WHERE is_active = true;

-- ================================================================
-- ANALYZE TABLES
-- ================================================================
-- Update statistics for query planner

ANALYZE contracts;
ANALYZE invoices;
ANALYZE payments;
ANALYZE traffic_violations;
ANALYZE legal_cases;
ANALYZE customer_verification_tasks;
ANALYZE delinquent_customers;

-- ================================================================
-- VERIFY INDEXES
-- ================================================================

-- Check index sizes
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('contracts', 'invoices', 'payments', 'traffic_violations', 'legal_cases', 'customer_verification_tasks', 'delinquent_customers')
  )
ORDER BY pg_relation_size(indexrelid) DESC;

-- ================================================================
-- NOTES
-- ================================================================
-- 1. These indexes are designed to optimize the delinquency page queries
-- 2. They use partial indexes (WHERE clauses) to reduce index size
-- 3. Multi-column indexes follow the selectivity principle (most selective first)
-- 4. GIN index for full-text search on customer names
-- 5. Run ANALYZE after creating indexes to update statistics
-- 6. Monitor index usage with pg_stat_user_indexes
-- 7. Consider VACUUM ANALYZE if tables are large

-- ================================================================
-- MONITORING QUERIES
-- ================================================================

-- Check index usage
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Find unused indexes
-- SELECT 
--   schemaname,
--   tablename,
--   indexname
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND idx_scan = 0
--   AND indexrelname NOT LIKE '%_pkey';
