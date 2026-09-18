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
WHERE payment_status IN ('completed', 'paid', 'approved');;
