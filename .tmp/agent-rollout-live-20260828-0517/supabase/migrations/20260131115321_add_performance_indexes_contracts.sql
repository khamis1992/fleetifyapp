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
WHERE status IN ('active', 'cancelled', 'closed', 'under_legal_procedure');;
