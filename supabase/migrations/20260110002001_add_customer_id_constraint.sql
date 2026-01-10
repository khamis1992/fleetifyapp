-- ===========================================
-- Add NOT NULL constraint on customer_id for payments
-- ===========================================
-- This migration adds a NOT NULL constraint on customer_id
-- to prevent future orphaned payments.
-- 
-- IMPORTANT: Run the backfill script separately before applying this constraint
-- to backfill the 1109 orphaned payments (QAR 2,028,721.00 at risk)
--
-- To backfill orphaned payments, use the following steps:
-- 1. Match via contract: UPDATE payments SET customer_id = c.customer_id 
--    FROM payments p JOIN contracts c ON p.contract_id = c.id 
--    WHERE p.customer_id IS NULL AND p.contract_id IS NOT NULL;
-- 2. For remaining: Use the first customer in the company
--    UPDATE payments SET customer_id = (SELECT MIN(id) FROM customers WHERE company_id = p.company_id)
--    WHERE customer_id IS NULL;
-- ===========================================

-- Add NOT NULL constraint on customer_id
-- This will fail if there are still orphaned payments
ALTER TABLE payments 
ADD CONSTRAINT payments_customer_id_not_null 
CHECK (customer_id IS NOT NULL);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT payments_customer_id_not_null ON payments IS 
'All payments must be associated with a customer. This constraint was added in migration 20260110002001 to prevent future orphaned payments.';

-- Show the count of orphaned payments still remaining (should be 0)
SELECT 
    'Orphaned payments remaining (should be 0 after backfill)' as status,
    COUNT(*) as count
FROM payments
WHERE customer_id IS NULL;
