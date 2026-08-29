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
WHERE status != 'cancelled';;
