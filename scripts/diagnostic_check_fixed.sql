-- ===============================================
-- Diagnostic Check for Agreement Processing (FIXED)
-- ===============================================

-- 1. Check all companies
SELECT
    id,
    name,
    name_ar,
    created_at
FROM companies
ORDER BY created_at;

-- 2. Check company named العراف specifically
SELECT
    id,
    name,
    name_ar,
    'This is the target company' as note
FROM companies
WHERE name_ar = 'العراف' OR name = 'العراف' OR name LIKE '%العراف%'
LIMIT 1;

-- 3. Check total contracts count by company
SELECT
    c.name_ar as company_name,
    COUNT(*) as total_contracts,
    SUM(CASE WHEN contracts.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
    SUM(CASE WHEN contracts.status = 'active' THEN 1 ELSE 0 END) as active_count
FROM contracts
JOIN companies c ON contracts.company_id = c.id
GROUP BY c.name_ar
ORDER BY c.name_ar;

-- 4. Check sample vehicle numbers in العراف company
SELECT
    vehicle_number,
    make,
    model,
    company_id
FROM vehicles
WHERE company_id = (SELECT id FROM companies WHERE name_ar = 'العراف' OR name = 'العراف' LIMIT 1)
ORDER BY vehicle_number
LIMIT 20;

-- 5. Check if Excel vehicle numbers exist in database
-- Sample check for first few vehicles from Excel: 2766, 2767, etc.
SELECT
    v.vehicle_number,
    v.make,
    v.model,
    c.name_ar as company_name,
    'Found in database' as status
FROM vehicles v
JOIN companies c ON v.company_id = c.id
WHERE v.vehicle_number IN ('2766', '2767', '2768', '2769', '2770', '3085', '3086', '3087', '3088')
ORDER BY v.vehicle_number;

-- 6. Check cancelled contracts for العراف company
SELECT
    c.contract_number,
    c.status,
    v.vehicle_number,
    cust.first_name as customer_name,
    c.monthly_amount,
    c.start_date,
    c.end_date,
    comp.name_ar as company_name
FROM contracts c
LEFT JOIN vehicles v ON c.vehicle_id = v.id
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN companies comp ON c.company_id = comp.id
WHERE c.company_id = (SELECT id FROM companies WHERE name_ar = 'العراف' OR name = 'العراف' LIMIT 1)
AND c.status = 'cancelled'
ORDER BY v.vehicle_number
LIMIT 20;

-- 7. Count total vehicles and contracts for العراف
SELECT
    'Total Vehicles' as metric,
    COUNT(*) as count
FROM vehicles
WHERE company_id = (SELECT id FROM companies WHERE name_ar = 'العراف' OR name = 'العراف' LIMIT 1)
UNION ALL
SELECT
    'Total Contracts' as metric,
    COUNT(*) as count
FROM contracts
WHERE company_id = (SELECT id FROM companies WHERE name_ar = 'العراف' OR name = 'العراف' LIMIT 1)
UNION ALL
SELECT
    'Cancelled Contracts' as metric,
    COUNT(*) as count
FROM contracts
WHERE company_id = (SELECT id FROM companies WHERE name_ar = 'العراف' OR name = 'العراف' LIMIT 1)
AND status = 'cancelled';
