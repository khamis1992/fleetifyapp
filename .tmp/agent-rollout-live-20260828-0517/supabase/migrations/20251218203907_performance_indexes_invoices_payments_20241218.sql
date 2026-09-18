-- ================================================================
-- INVOICES TABLE INDEXES
-- ================================================================
--
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
--
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
ON payments(invoice_id) WHERE company_id IS NOT NULL;;
