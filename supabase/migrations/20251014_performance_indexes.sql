-- =====================================================
-- Performance Optimization Indexes Migration
-- Created: 2025-10-14
-- Purpose: Create missing composite indexes for common query patterns
-- =====================================================

-- =====================================================
-- 1. CUSTOMER SEARCH OPTIMIZATION
-- =====================================================

-- Full-text search index for customer names and commercial registers
CREATE INDEX IF NOT EXISTS idx_customers_fulltext_search 
ON customers 
USING GIN(to_tsvector('arabic', 
  COALESCE(name, '') || ' ' || 
  COALESCE(commercial_register, '') || ' ' ||
  COALESCE(email, '')
));

-- Composite index for customer filtering and sorting
CREATE INDEX IF NOT EXISTS idx_customers_company_status_created 
ON customers(company_id, status, created_at DESC) 
WHERE company_id IS NOT NULL;

-- Index for customer type filtering
CREATE INDEX IF NOT EXISTS idx_customers_company_type_active 
ON customers(company_id, customer_type, is_active) 
WHERE company_id IS NOT NULL AND is_active = true;

-- Index for credit limit queries
CREATE INDEX IF NOT EXISTS idx_customers_company_credit 
ON customers(company_id, credit_limit) 
WHERE company_id IS NOT NULL AND credit_limit > 0;

-- =====================================================
-- 2. FINANCIAL QUERIES OPTIMIZATION
-- =====================================================

-- Journal entries by company and date range
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date_status 
ON journal_entries(company_id, entry_date DESC, status) 
WHERE company_id IS NOT NULL;

-- Journal entries by account
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_date 
ON journal_entry_lines(account_id, created_at DESC);

-- Invoice queries optimization
CREATE INDEX IF NOT EXISTS idx_invoices_company_status_date 
ON invoices(company_id, status, invoice_date DESC) 
WHERE company_id IS NOT NULL;

-- Invoice by customer
CREATE INDEX IF NOT EXISTS idx_invoices_customer_company_date 
ON invoices(customer_id, company_id, invoice_date DESC) 
WHERE customer_id IS NOT NULL;

-- Payment tracking
CREATE INDEX IF NOT EXISTS idx_payments_company_date_status 
ON payments(company_id, payment_date DESC, status) 
WHERE company_id IS NOT NULL;

-- Payment by customer
CREATE INDEX IF NOT EXISTS idx_payments_customer_date 
ON payments(customer_id, payment_date DESC) 
WHERE customer_id IS NOT NULL;

-- Chart of accounts hierarchy
CREATE INDEX IF NOT EXISTS idx_chart_accounts_company_parent 
ON chart_of_accounts(company_id, parent_account_id, account_code) 
WHERE company_id IS NOT NULL;

-- Budget tracking
CREATE INDEX IF NOT EXISTS idx_budget_items_company_period 
ON budget_items(company_id, period_start, period_end) 
WHERE company_id IS NOT NULL;

-- =====================================================
-- 3. CONTRACT MANAGEMENT OPTIMIZATION
-- =====================================================

-- Contract filtering by status and dates
CREATE INDEX IF NOT EXISTS idx_contracts_company_status_dates 
ON contracts(company_id, status, start_date DESC, end_date DESC) 
WHERE company_id IS NOT NULL;

-- Contracts by customer
CREATE INDEX IF NOT EXISTS idx_contracts_customer_company_active 
ON contracts(customer_id, company_id, status) 
WHERE customer_id IS NOT NULL;

-- Contract expiry tracking
CREATE INDEX IF NOT EXISTS idx_contracts_company_end_date 
ON contracts(company_id, end_date) 
WHERE company_id IS NOT NULL AND status = 'active';

-- Contract payment schedules
CREATE INDEX IF NOT EXISTS idx_contract_payment_schedules_contract_date 
ON contract_payment_schedules(contract_id, due_date, payment_status);

-- Contract payment schedules by company
CREATE INDEX IF NOT EXISTS idx_contract_payments_company_due 
ON contract_payment_schedules(company_id, due_date, payment_status) 
WHERE company_id IS NOT NULL;

-- =====================================================
-- 4. VEHICLE & FLEET OPTIMIZATION
-- =====================================================

-- Vehicle by company and status
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status_active 
ON vehicles(company_id, status, is_active) 
WHERE company_id IS NOT NULL;

-- Vehicle maintenance tracking
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle_date 
ON vehicle_maintenance(vehicle_id, maintenance_date DESC);

-- Vehicle maintenance by company
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_date 
ON vehicle_maintenance(company_id, maintenance_date DESC) 
WHERE company_id IS NOT NULL;

-- Vehicle dispatch optimization
CREATE INDEX IF NOT EXISTS idx_vehicle_dispatch_company_date 
ON vehicle_dispatch_permits(company_id, dispatch_date DESC) 
WHERE company_id IS NOT NULL;

-- Vehicle by plate number (unique search)
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number 
ON vehicles(plate_number) 
WHERE plate_number IS NOT NULL;

-- =====================================================
-- 5. LEGAL SYSTEM OPTIMIZATION
-- =====================================================

-- Legal cases by company and status
CREATE INDEX IF NOT EXISTS idx_legal_cases_company_status_date 
ON legal_cases(company_id, status, case_date DESC) 
WHERE company_id IS NOT NULL;

-- Legal documents by case
CREATE INDEX IF NOT EXISTS idx_legal_documents_case_type 
ON legal_documents(case_id, document_type, created_at DESC);

-- Court sessions scheduling
CREATE INDEX IF NOT EXISTS idx_court_sessions_case_date 
ON court_sessions(case_id, session_date) 
WHERE session_date >= CURRENT_DATE;

-- Legal fees tracking
CREATE INDEX IF NOT EXISTS idx_legal_fees_case_status 
ON legal_fees(case_id, payment_status, due_date);

-- =====================================================
-- 6. HR & EMPLOYEE OPTIMIZATION
-- =====================================================

-- Employee by company
CREATE INDEX IF NOT EXISTS idx_employees_company_active_dept 
ON employees(company_id, is_active, department) 
WHERE company_id IS NOT NULL;

-- Attendance tracking
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
ON attendance(employee_id, attendance_date DESC);

-- Payroll processing
CREATE INDEX IF NOT EXISTS idx_payroll_company_period 
ON payroll(company_id, payroll_period_start, payroll_period_end) 
WHERE company_id IS NOT NULL;

-- Leave requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status 
ON leave_requests(employee_id, status, start_date DESC);

-- =====================================================
-- 7. QUOTATION & SALES OPTIMIZATION
-- =====================================================

-- Quotations by company and status
CREATE INDEX IF NOT EXISTS idx_quotations_company_status_date 
ON quotations(company_id, status, quotation_date DESC) 
WHERE company_id IS NOT NULL;

-- Quotations by customer
CREATE INDEX IF NOT EXISTS idx_quotations_customer_company 
ON quotations(customer_id, company_id, quotation_date DESC) 
WHERE customer_id IS NOT NULL;

-- Quotation approval workflow
CREATE INDEX IF NOT EXISTS idx_quotation_approvals_quotation_status 
ON quotation_approvals(quotation_id, approval_status, created_at DESC);

-- =====================================================
-- 8. DOCUMENT MANAGEMENT OPTIMIZATION
-- =====================================================

-- Documents by entity
CREATE INDEX IF NOT EXISTS idx_documents_entity_type 
ON documents(entity_type, entity_id, created_at DESC);

-- Documents by company
CREATE INDEX IF NOT EXISTS idx_documents_company_category 
ON documents(company_id, document_category, created_at DESC) 
WHERE company_id IS NOT NULL;

-- =====================================================
-- 9. AUDIT & ACTIVITY LOG OPTIMIZATION
-- =====================================================

-- Activity logs by company and date
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_date 
ON activity_logs(company_id, created_at DESC) 
WHERE company_id IS NOT NULL;

-- Activity logs by user
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date 
ON activity_logs(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Activity logs by entity
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_action 
ON activity_logs(entity_type, entity_id, action, created_at DESC);

-- =====================================================
-- 10. NOTIFICATION & ALERT OPTIMIZATION
-- =====================================================

-- Notifications by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Alerts by company and priority
CREATE INDEX IF NOT EXISTS idx_alerts_company_priority_active 
ON alerts(company_id, priority, is_active) 
WHERE company_id IS NOT NULL AND is_active = true;

-- =====================================================
-- 11. PROPERTY MANAGEMENT OPTIMIZATION (if applicable)
-- =====================================================

-- Properties by company
CREATE INDEX IF NOT EXISTS idx_properties_company_status 
ON properties(company_id, status) 
WHERE company_id IS NOT NULL;

-- Property contracts
CREATE INDEX IF NOT EXISTS idx_property_contracts_property_active 
ON property_contracts(property_id, is_active, start_date DESC);

-- =====================================================
-- 12. PERFORMANCE STATISTICS
-- =====================================================

-- Create a materialized view for dashboard statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_company_financial_stats AS
SELECT 
    company_id,
    COUNT(DISTINCT customer_id) as total_customers,
    COUNT(DISTINCT contract_id) as total_contracts,
    COUNT(DISTINCT invoice_id) as total_invoices,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_contracts,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
    CURRENT_TIMESTAMP as last_updated
FROM (
    SELECT company_id, id as customer_id, NULL::uuid as contract_id, NULL::uuid as invoice_id, NULL as status FROM customers
    UNION ALL
    SELECT company_id, NULL, id, NULL, status FROM contracts
    UNION ALL
    SELECT company_id, NULL, NULL, id, status FROM invoices
) combined
GROUP BY company_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_financial_stats_company 
ON mv_company_financial_stats(company_id);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_company_financial_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_company_financial_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. VACUUM AND ANALYZE
-- =====================================================

-- Analyze tables to update statistics
ANALYZE customers;
ANALYZE contracts;
ANALYZE invoices;
ANALYZE payments;
ANALYZE journal_entries;
ANALYZE journal_entry_lines;
ANALYZE vehicles;
ANALYZE vehicle_maintenance;
ANALYZE employees;
ANALYZE legal_cases;

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- Execution Time: Estimated 5-10 minutes depending on data volume
-- Recommended: Run during off-peak hours
-- Impact: Minimal - all indexes created with IF NOT EXISTS
-- Rollback: Drop individual indexes if needed
-- Monitoring: Check pg_stat_user_indexes for index usage

-- To check index usage after deployment:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

COMMENT ON INDEX idx_customers_fulltext_search IS 'Full-text search optimization for customer names and registers';
COMMENT ON INDEX idx_journal_entries_company_date_status IS 'Financial reporting query optimization';
COMMENT ON INDEX idx_contracts_company_status_dates IS 'Contract filtering and dashboard optimization';
COMMENT ON INDEX idx_vehicle_maintenance_vehicle_date IS 'Vehicle maintenance history queries';
