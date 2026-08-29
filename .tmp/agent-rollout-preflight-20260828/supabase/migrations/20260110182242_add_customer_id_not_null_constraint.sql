-- Add NOT NULL constraint on customer_id
ALTER TABLE payments 
ADD CONSTRAINT payments_customer_id_not_null 
CHECK (customer_id IS NOT NULL);

-- Add comment explaining constraint
COMMENT ON CONSTRAINT payments_customer_id_not_null ON payments IS 
'All payments must be associated with a customer. This constraint was added in migration 20260110002001 to prevent future orphaned payments.';

-- Show count of orphaned payments still remaining (should be 0)
SELECT 
    'Orphaned payments remaining (should be 0 after backfill)' as status,
    COUNT(*) as count
FROM payments
WHERE customer_id IS NULL;;
