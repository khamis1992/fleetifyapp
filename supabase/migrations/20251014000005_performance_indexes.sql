-- Performance Optimization: Critical Missing Indexes
-- Migration created: 2025-10-14
-- Purpose: Fix slow queries identified in performance audit

-- 1. Rental payment receipts indexes (new table, no indexes)
CREATE INDEX IF NOT EXISTS idx_rental_receipts_customer_date 
ON rental_payment_receipts(customer_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_rental_receipts_contract 
ON rental_payment_receipts(contract_id) 
WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rental_receipts_vehicle 
ON rental_payment_receipts(vehicle_id) 
WHERE vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rental_receipts_company_date 
ON rental_payment_receipts(company_id, payment_date DESC);

-- 2. Payment contract linking (for N+1 query fix)
CREATE INDEX IF NOT EXISTS idx_payments_contract_status 
ON payments(contract_id, payment_status) 
WHERE contract_id IS NOT NULL AND payment_status = 'completed';

-- 3. Optimize bulk contract payment queries
CREATE INDEX IF NOT EXISTS idx_payments_contract_array 
ON payments(contract_id, amount) 
WHERE contract_id IS NOT NULL AND payment_status = 'completed';

-- 4. Customer accounts relationship
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer 
ON customer_accounts(customer_id, is_active) 
WHERE is_active = true;

-- 5. Journal entry lines by account (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') THEN
        CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account 
        ON journal_entry_lines(account_id, journal_entry_id);
    END IF;
END $$;

-- 6. Contract expiration for dashboard queries
CREATE INDEX IF NOT EXISTS idx_contracts_expiration 
ON contracts(end_date, status, company_id) 
WHERE status = 'active' AND end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_customer_status 
ON contracts(customer_id, status, company_id) 
WHERE status IN ('active', 'pending');

-- 7. Full-text search optimization for Arabic queries
CREATE INDEX IF NOT EXISTS idx_customers_fulltext_search 
ON customers USING gin(
  to_tsvector('arabic', 
    COALESCE(first_name_ar, '') || ' ' || 
    COALESCE(last_name_ar, '') || ' ' || 
    COALESCE(company_name_ar, '') || ' ' ||
    COALESCE(phone, '') || ' ' ||
    COALESCE(national_id, '')
  )
);

-- 8. Vehicles by status for availability queries
CREATE INDEX IF NOT EXISTS idx_vehicles_status_company 
ON vehicles(status, company_id) 
WHERE status IN ('available', 'rented', 'maintenance');

-- 9. Invoices by contract and status
CREATE INDEX IF NOT EXISTS idx_invoices_contract_status 
ON invoices(contract_id, status, company_id) 
WHERE contract_id IS NOT NULL;

-- 10. Performance monitoring: Add statistics
ANALYZE rental_payment_receipts;
ANALYZE payments;
ANALYZE contracts;
ANALYZE customers;
ANALYZE vehicles;
ANALYZE invoices;

-- Add comment for documentation
COMMENT ON INDEX idx_rental_receipts_customer_date IS 
'Performance index for customer payment history queries';

COMMENT ON INDEX idx_payments_contract_status IS 
'Critical index for optimized payment aggregation (fixes N+1 query)';

COMMENT ON INDEX idx_customers_fulltext_search IS 
'Full-text search index for Arabic customer names and IDs';
