-- Performance Indexes for FleetifyApp
-- Created: December 18, 2024
-- Purpose: Improve query performance for common operations

-- ================================================================
-- CONTRACTS TABLE INDEXES
-- ================================================================

-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_contracts_company_id
ON contracts(company_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_contracts_status
ON contracts(status) WHERE company_id IS NOT NULL;

-- Composite index for company + status filtering
CREATE INDEX IF NOT EXISTS idx_contracts_company_status
ON contracts(company_id, status);

-- Index for contract number lookups
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number
ON contracts(contract_number);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_contracts_start_date
ON contracts(start_date) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_end_date
ON contracts(end_date) WHERE company_id IS NOT NULL;

-- Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id
ON contracts(customer_id) WHERE company_id IS NOT NULL;

-- Index for vehicle lookups
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id
ON contracts(vehicle_id) WHERE company_id IS NOT NULL;

-- ================================================================
-- CUSTOMERS TABLE INDEXES
-- ================================================================

-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_customers_company_id
ON customers(company_id);

-- Index for active status filtering
CREATE INDEX IF NOT EXISTS idx_customers_active
ON customers(is_active) WHERE company_id IS NOT NULL;

-- Composite index for company + active status
CREATE INDEX IF NOT EXISTS idx_customers_company_active
ON customers(company_id, is_active);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone
ON customers(phone) WHERE company_id IS NOT NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_customers_email
ON customers(email) WHERE company_id IS NOT NULL;

-- Index for name search (will support ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_customers_name_ar
ON customers(first_name_ar, last_name_ar) WHERE company_id IS NOT NULL;

-- Full-text search index for Arabic names
CREATE INDEX IF NOT EXISTS idx_customers_name_ar_fts
ON customers USING gin(to_tsvector('arabic', first_name_ar || ' ' || last_name_ar))
WHERE company_id IS NOT NULL;

-- ================================================================
-- VEHICLES TABLE INDEXES
-- ================================================================

-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id
ON vehicles(company_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_status
ON vehicles(status) WHERE company_id IS NOT NULL;

-- Composite index for company + status
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status
ON vehicles(company_id, status);

-- Index for plate number lookups (very common)
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number
ON vehicles(plate_number) WHERE company_id IS NOT NULL;

-- Index for make/model filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model
ON vehicles(make, model) WHERE company_id IS NOT NULL;

-- ================================================================
-- INVOICES TABLE INDEXES
-- ================================================================

-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_invoices_company_id
ON invoices(company_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_invoices_status
ON invoices(status) WHERE company_id IS NOT NULL;

-- Composite index for company + status
CREATE INDEX IF NOT EXISTS idx_invoices_company_status
ON invoices(company_id, status);

-- Index for due date (important for overdue queries)
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
ON invoices(due_date) WHERE company_id IS NOT NULL AND status IN ('pending', 'partially_paid');

-- Index for contract relationship
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id
ON invoices(contract_id) WHERE company_id IS NOT NULL;

-- Index for customer relationship
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
ON invoices(customer_id) WHERE company_id IS NOT NULL;

-- ================================================================
-- PAYMENTS TABLE INDEXES
-- ================================================================

-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_payments_company_id
ON payments(company_id);

-- Index for payment date
CREATE INDEX IF NOT EXISTS idx_payments_payment_date
ON payments(payment_date) WHERE company_id IS NOT NULL;

-- Index for payment method
CREATE INDEX IF NOT EXISTS idx_payments_method
ON payments(payment_method) WHERE company_id IS NOT NULL;

-- Index for invoice relationship
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
ON payments(invoice_id) WHERE company_id IS NOT NULL;

-- ================================================================
-- JOURNAL_ENTRIES TABLE INDEXES
-- ================================================================

-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id
ON journal_entries(company_id);

-- Index for date filtering
CREATE INDEX IF NOT EXISTS idx_journal_entries_date
ON journal_entries(date) WHERE company_id IS NOT NULL;

-- Index for account filtering
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_id
ON journal_entries(account_id) WHERE company_id IS NOT NULL;

-- Composite index for date + account
CREATE INDEX IF NOT EXISTS idx_journal_entries_date_account
ON journal_entries(date, account_id) WHERE company_id IS NOT NULL;

-- ================================================================
-- AUDIT_LOGS TABLE INDEXES
-- ================================================================

-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id
ON audit_logs(company_id);

-- Index for timestamp (for recent activity)
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
ON audit_logs(timestamp) WHERE company_id IS NOT NULL;

-- Index for resource lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
ON audit_logs(resource_type, resource_id) WHERE company_id IS NOT NULL;

-- Index for action filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action) WHERE company_id IS NOT NULL;

-- Composite index for recent activity by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp
ON audit_logs(user_id, timestamp DESC) WHERE company_id IS NOT NULL;

-- ================================================================
-- TRAFFIC_VIOLATIONS TABLE INDEXES
-- ================================================================

-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_traffic_violations_company_id
ON traffic_violations(company_id);

-- Index for vehicle relationship
CREATE INDEX IF NOT EXISTS idx_traffic_violations_vehicle_id
ON traffic_violations(vehicle_id) WHERE company_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_traffic_violations_status
ON traffic_violations(status) WHERE company_id IS NOT NULL;

-- Index for violation date
CREATE INDEX IF NOT EXISTS idx_traffic_violations_date
ON traffic_violations(violation_date) WHERE company_id IS NOT NULL;

-- ================================================================
-- NOTIFICATIONS FOR ANALYTICS AND MONITORING
-- ================================================================

-- Create a function to analyze index usage (run periodically)
CREATE OR REPLACE FUNCTION analyze_table_indexes(table_name text)
RETURNS TABLE(
    index_name text,
    index_type text,
    columns text[],
    usage_count bigint,
    last_used timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.schemaname || '.' || i.tablename || '.' || i.indexname as index_name,
        CASE
            WHEN i.indisunique THEN 'UNIQUE'
            WHEN i.indisprimary THEN 'PRIMARY KEY'
            ELSE 'NON-UNIQUE'
        END as index_type,
        array_agg(a.attname ORDER BY c.ordinality) as columns,
        idx_scan as usage_count,
        idx_tup_read as last_read -- Approximation
    FROM pg_stat_user_indexes idx
    JOIN pg_index i ON i.indexrelid = idx.indexrelid
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN unnest(i.indkey) WITH ORDINALITY c(attnum, ordinality) ON true
    WHERE i.relname = table_name
    GROUP BY i.schemaname, i.tablename, i.indexname,
             i.indisunique, i.indisprimary,
             idx.idx_scan, idx.idx_tup_read;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION analyze_table_indexes(text) TO authenticated, service_role;

-- ================================================================
-- CLEANUP: MONITOR UNUSED INDEXES
-- ================================================================

-- Query to find potentially unused indexes (run after some usage data)
/*
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as usage_count,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan < 100
  AND schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid::regclass) DESC;
*/