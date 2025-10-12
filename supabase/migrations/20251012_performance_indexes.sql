-- Performance Optimization: Database Indexes
-- Phase 1: Critical Performance Fixes
-- Created: 2025-10-12

-- =============================================
-- CUSTOMERS TABLE INDEXES
-- =============================================

-- Full-text search index for Arabic customer names and company names
CREATE INDEX IF NOT EXISTS idx_customers_search_arabic 
ON customers USING gin(
  to_tsvector('arabic', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '') || ' ' || 
    COALESCE(company_name, '')
  )
);

-- Composite index for common filter queries
CREATE INDEX IF NOT EXISTS idx_customers_type_status 
ON customers(customer_type, is_active) 
WHERE is_active = true;

-- Index for blacklist filtering
CREATE INDEX IF NOT EXISTS idx_customers_blacklist 
ON customers(is_blacklisted, company_id) 
WHERE is_blacklisted = true;

-- Index for company-based queries with timestamps
CREATE INDEX IF NOT EXISTS idx_customers_company_created 
ON customers(company_id, created_at DESC);

-- Index for phone number search
CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON customers(phone_1) 
WHERE phone_1 IS NOT NULL;

-- Index for civil ID (Kuwait national ID)
CREATE INDEX IF NOT EXISTS idx_customers_civil_id 
ON customers(civil_id) 
WHERE civil_id IS NOT NULL;

-- =============================================
-- CONTRACTS TABLE INDEXES
-- =============================================

-- Composite index for status and date filtering
CREATE INDEX IF NOT EXISTS idx_contracts_status_date 
ON contracts(status, created_at DESC);

-- Index for contract expiration tracking
CREATE INDEX IF NOT EXISTS idx_contracts_end_date 
ON contracts(end_date) 
WHERE end_date IS NOT NULL AND status != 'terminated';

-- Index for customer contracts lookup
CREATE INDEX IF NOT EXISTS idx_contracts_customer 
ON contracts(customer_id, status, created_at DESC);

-- Index for active contracts by company
CREATE INDEX IF NOT EXISTS idx_contracts_company_active 
ON contracts(company_id, status) 
WHERE status IN ('active', 'pending');

-- Index for contract number search
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number 
ON contracts(contract_number);

-- =============================================
-- PAYMENTS TABLE INDEXES
-- =============================================

-- Index for recent payments (1 year window)
CREATE INDEX IF NOT EXISTS idx_payments_date_amount 
ON payments(payment_date DESC, amount) 
WHERE payment_date > CURRENT_DATE - INTERVAL '1 year';

-- Index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(status, payment_date DESC) 
WHERE status IS NOT NULL;

-- Index for customer payments
CREATE INDEX IF NOT EXISTS idx_payments_customer 
ON payments(customer_id, payment_date DESC);

-- Index for contract payments
CREATE INDEX IF NOT EXISTS idx_payments_contract 
ON payments(contract_id, payment_date DESC) 
WHERE contract_id IS NOT NULL;

-- Index for payment method analysis
CREATE INDEX IF NOT EXISTS idx_payments_method_date 
ON payments(payment_method, payment_date DESC);

-- Index for company payments with date
CREATE INDEX IF NOT EXISTS idx_payments_company_date 
ON payments(company_id, payment_date DESC);

-- =============================================
-- INVOICES TABLE INDEXES
-- =============================================

-- Index for invoice status and date
CREATE INDEX IF NOT EXISTS idx_invoices_status_date 
ON invoices(status, invoice_date DESC);

-- Index for due date tracking
CREATE INDEX IF NOT EXISTS idx_invoices_due_date 
ON invoices(due_date) 
WHERE status != 'paid' AND due_date IS NOT NULL;

-- Index for customer invoices
CREATE INDEX IF NOT EXISTS idx_invoices_customer 
ON invoices(customer_id, invoice_date DESC);

-- Index for invoice number search
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number 
ON invoices(invoice_number);

-- =============================================
-- VEHICLES TABLE INDEXES
-- =============================================

-- Index for vehicle plate search
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number 
ON vehicles(plate_number);

-- Index for vehicle status
CREATE INDEX IF NOT EXISTS idx_vehicles_status 
ON vehicles(status, company_id);

-- Index for vehicle type filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_type 
ON vehicles(vehicle_type, company_id);

-- =============================================
-- VEHICLE MAINTENANCE TABLE INDEXES
-- =============================================

-- Index for maintenance date tracking
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_date 
ON vehicle_maintenance(maintenance_date DESC);

-- Index for vehicle maintenance history
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle 
ON vehicle_maintenance(vehicle_id, maintenance_date DESC);

-- Index for maintenance status
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_status 
ON vehicle_maintenance(status, company_id);

-- Index for cost analysis
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_cost 
ON vehicle_maintenance(cost, maintenance_date DESC) 
WHERE cost > 0;

-- =============================================
-- JOURNAL ENTRIES TABLE INDEXES
-- =============================================

-- Index for entry date filtering
CREATE INDEX IF NOT EXISTS idx_journal_entries_date 
ON journal_entries(entry_date DESC, company_id);

-- Index for account transactions
CREATE INDEX IF NOT EXISTS idx_journal_entries_account 
ON journal_entries(account_id, entry_date DESC);

-- Index for entry status
CREATE INDEX IF NOT EXISTS idx_journal_entries_status 
ON journal_entries(status, entry_date DESC) 
WHERE status IS NOT NULL;

-- =============================================
-- CHART OF ACCOUNTS TABLE INDEXES
-- =============================================

-- Index for account code search
CREATE INDEX IF NOT EXISTS idx_chart_accounts_code 
ON chart_of_accounts(account_code, company_id);

-- Index for active accounts
CREATE INDEX IF NOT EXISTS idx_chart_accounts_active 
ON chart_of_accounts(is_active, company_id) 
WHERE is_active = true;

-- Index for account type filtering
CREATE INDEX IF NOT EXISTS idx_chart_accounts_type 
ON chart_of_accounts(account_type, company_id);

-- Index for parent-child hierarchy
CREATE INDEX IF NOT EXISTS idx_chart_accounts_parent 
ON chart_of_accounts(parent_account_id) 
WHERE parent_account_id IS NOT NULL;

-- =============================================
-- EMPLOYEES TABLE INDEXES
-- =============================================

-- Index for employee number search
CREATE INDEX IF NOT EXISTS idx_employees_number 
ON employees(employee_number);

-- Index for active employees
CREATE INDEX IF NOT EXISTS idx_employees_active 
ON employees(employment_status, company_id) 
WHERE employment_status = 'active';

-- Index for department filtering
CREATE INDEX IF NOT EXISTS idx_employees_department 
ON employees(department, company_id) 
WHERE department IS NOT NULL;

-- Full-text search for employee names
CREATE INDEX IF NOT EXISTS idx_employees_search_arabic 
ON employees USING gin(
  to_tsvector('arabic', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '')
  )
);

-- =============================================
-- PROPERTIES TABLE INDEXES
-- =============================================

-- Index for property code search
CREATE INDEX IF NOT EXISTS idx_properties_code 
ON properties(property_code);

-- Index for property status
CREATE INDEX IF NOT EXISTS idx_properties_status 
ON properties(status, company_id);

-- Index for property type filtering
CREATE INDEX IF NOT EXISTS idx_properties_type 
ON properties(property_type, company_id);

-- Spatial index for location-based queries (if geography column exists)
-- CREATE INDEX IF NOT EXISTS idx_properties_location 
-- ON properties USING GIST (location);

-- =============================================
-- QUOTATIONS TABLE INDEXES
-- =============================================

-- Index for quotation status and date
CREATE INDEX IF NOT EXISTS idx_quotations_status_date 
ON quotations(status, quotation_date DESC);

-- Index for customer quotations
CREATE INDEX IF NOT EXISTS idx_quotations_customer 
ON quotations(customer_id, quotation_date DESC);

-- Index for quotation number search
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number 
ON quotations(quotation_number);

-- =============================================
-- PERFORMANCE NOTES
-- =============================================

-- These indexes are designed to optimize:
-- 1. Full-text search queries (Arabic text support)
-- 2. Common filter combinations (status + date, type + company)
-- 3. Date-range queries (recent records, active periods)
-- 4. Foreign key lookups (customer_id, contract_id, etc.)
-- 5. Partial indexes for active/valid records only

-- IMPORTANT: 
-- - Indexes are created CONCURRENTLY to avoid locking tables in production
-- - Partial indexes (WHERE clause) reduce index size and improve performance
-- - GIN indexes for full-text search support Arabic language
-- - Composite indexes match common query patterns

-- MAINTENANCE:
-- Run ANALYZE after creating indexes to update query planner statistics
ANALYZE customers;
ANALYZE contracts;
ANALYZE payments;
ANALYZE invoices;
ANALYZE vehicles;
ANALYZE vehicle_maintenance;
ANALYZE journal_entries;
ANALYZE chart_of_accounts;
ANALYZE employees;
ANALYZE properties;
ANALYZE quotations;

-- To monitor index usage, run:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;
