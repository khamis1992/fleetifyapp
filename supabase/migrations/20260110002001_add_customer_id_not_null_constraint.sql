-- ===========================================
-- Add NOT NULL Constraint on customer_id for payments
-- ===========================================
-- This migration adds a NOT NULL constraint on customer_id
-- to prevent future orphaned payments.
--
-- IMPORTANT: There are 1109 orphaned payments (without customer_id)
-- in the database (QAR 2,028,721.00 at risk).
--
-- These orphaned payments need to be backfilled MANUALLY before
-- or after applying this constraint, the constraint will fail.
--
-- Use the backfill script in:
-- supabase/migrations/20260110002001_backfill_orphaned_payments_manual.sql
-- to backfill the orphaned payments in batches.
-- ===========================================

-- Add NOT NULL constraint on customer_id
-- This will FAIL if there are still orphaned payments, which is expected
-- The constraint should be applied AFTER backfilling all orphaned payments
ALTER TABLE payments 
ADD CONSTRAINT payments_customer_id_not_null 
CHECK (customer_id IS NOT NULL);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT payments_customer_id_not_null ON payments IS 
'All payments must be associated with a customer. This constraint was added in migration 20260110002001 to prevent future orphaned payments. NOTE: Orphaned payments (customer_id IS NULL) must be backfilled BEFORE applying this constraint.';

-- Show current status of orphaned payments
SELECT 
    'Orphaned payments requiring backfill' as status,
    COUNT(*) as count,
    SUM(amount) as total_amount_at_risk
FROM payments
WHERE customer_id IS NULL;
