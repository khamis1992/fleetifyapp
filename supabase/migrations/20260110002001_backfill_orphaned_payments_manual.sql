-- ===========================================
-- Backfill Orphaned Payments (Manual Script)
-- ===========================================
-- This SQL script can be used to manually backfill orphaned payments.
-- It should be run before applying the NOT NULL constraint on customer_id.
--
-- IMPORTANT: Run this script manually or in small batches to avoid
-- triggering the unique constraint on contracts.
--
-- ===========================================

-- Step 1: Show statistics
SELECT 
    'Orphaned payments count' as metric,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM payments
WHERE customer_id IS NULL;

-- Step 2: Strategy 1 - Match via contract (for payments with contracts)
-- This is the safest approach as it maintains data integrity
-- ===========================================

-- View to see which orphaned payments have contracts
SELECT 
    p.id as payment_id,
    p.payment_number,
    p.payment_date,
    p.amount as payment_amount,
    p.contract_id,
    c.customer_id as contract_customer_id,
    CASE 
        WHEN c.customer_id IS NOT NULL THEN 'Can match via contract'
        ELSE 'Ready to backfill'
    END as status
FROM payments p
LEFT JOIN contracts c ON p.contract_id = c.id
WHERE p.customer_id IS NULL
  AND p.contract_id IS NOT NULL
ORDER BY p.payment_date DESC
LIMIT 100;

-- Update statement for Strategy 1 (run this in batches of 100 at a time):
-- ===========================================
-- UPDATE payments p
-- SET customer_id = c.customer_id
-- FROM payments p
-- JOIN contracts c ON p.contract_id = c.id
-- WHERE p.customer_id IS NULL
--   AND p.contract_id IS NOT NULL
-- LIMIT 100;
-- ===========================================

-- Step 3: Strategy 2 - For payments without contracts
-- Use first available customer or create "Unknown Customer"
-- ===========================================

-- View to see orphaned payments without contracts
SELECT 
    p.id as payment_id,
    p.payment_number,
    p.payment_date,
    p.amount as payment_amount,
    company_name_ar as default_customer_name
FROM payments p
CROSS JOIN (
    -- Get first customer for each company
    SELECT 
        company_id,
        MIN(id) as first_customer_id,
        company_name_ar
    FROM customers
    GROUP BY company_id, company_name_ar
    LIMIT 1
) first_customer ON p.company_id = first_customer.company_id
WHERE p.customer_id IS NULL
  AND p.contract_id IS NULL
ORDER BY p.payment_date DESC
LIMIT 100;

-- Update statement for Strategy 2 (run this in batches):
-- ===========================================
-- UPDATE payments p
-- SET customer_id = fc.first_customer_id
-- FROM payments p
-- JOIN (
--     SELECT 
--         company_id,
--         MIN(id) as first_customer_id
--     FROM customers
--     GROUP BY company_id
-- ) fc ON p.company_id = fc.company_id
-- WHERE p.customer_id IS NULL
--   AND p.contract_id IS NULL
-- LIMIT 100;
-- ===========================================

-- Step 4: Verification
-- After running the update statements above, verify results:
-- ===========================================

SELECT 
    'Orphaned payments remaining after backfill' as metric,
    COUNT(*) as count
FROM payments
WHERE customer_id IS NULL;

-- Step 5: Check for "Unknown Customers" created
-- ===========================================

SELECT 
    'Unknown Customers created' as metric,
    COUNT(*) as count
FROM customers
WHERE company_name_ar LIKE 'غير معروف%';

-- ===========================================
-- INSTRUCTIONS:
-- 1. Run Step 1 to see which payments can be matched via contracts
-- 2. Run the UPDATE statement for Strategy 1 (in batches of 100)
-- 3. Verify Step 4 to see remaining orphaned payments
-- 4. Run Step 2 to see payments without contracts
-- 5. Run the UPDATE statement for Strategy 2 (in batches of 100)
-- 6. Run Step 4 again to verify all orphaned payments are backfilled
-- 7. Apply the NOT NULL constraint using the other migration file
-- ===========================================
