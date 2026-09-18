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
WHERE status = 'pending';;
