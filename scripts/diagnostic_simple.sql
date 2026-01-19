-- ===============================================
-- SIMPLE DIAGNOSTIC CHECK
-- ===============================================

-- 1. Find العراف company ID
SELECT
    id,
    name,
    name_ar
FROM companies
WHERE name_ar LIKE '%العراف%' OR name LIKE '%العراف%';

-- 2. Count contracts by status for العراف
SELECT
    status,
    COUNT(*) as count
FROM contracts
WHERE company_id IN (SELECT id FROM companies WHERE name_ar LIKE '%العراف%')
GROUP BY status
ORDER BY status;

-- 3. Check if Excel vehicle plate numbers exist (using plate_number column)
SELECT
    plate_number,
    make,
    model,
    'Found in database' as status
FROM vehicles
WHERE plate_number IN ('2766', '2767', '2768', '2769', '2770', '3085', '3086')
AND company_id IN (SELECT id FROM companies WHERE name_ar LIKE '%العراف%')
ORDER BY plate_number;

-- 4. Show sample cancelled contracts with plate numbers
SELECT
    c.contract_number,
    v.plate_number,
    cust.first_name as customer_name,
    c.status,
    c.monthly_amount
FROM contracts c
LEFT JOIN vehicles v ON c.vehicle_id = v.id
LEFT JOIN customers cust ON c.customer_id = cust.id
WHERE c.company_id IN (SELECT id FROM companies WHERE name_ar LIKE '%العراف%')
AND c.status = 'cancelled'
ORDER BY v.plate_number
LIMIT 20;
