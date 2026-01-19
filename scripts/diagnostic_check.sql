-- ===============================================
-- Diagnostic Check for Agreement Processing
-- ===============================================

-- 1. Check all companies
SELECT
    id,
    name_en,
    name_ar,
    created_at
FROM companies
ORDER BY created_at;

-- 2. Check company named العراف
SELECT
    id,
    name_en,
    name_ar,
    'This is the target company' as note
FROM companies
WHERE name_ar = 'العراف' OR name_en LIKE '%العراف%'
LIMIT 1;

-- 3. Check total contracts count
SELECT
    c.name_ar as company_name,
    COUNT(*) as total_contracts,
    SUM(CASE WHEN contracts.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
    SUM(CASE WHEN contracts.status = 'active' THEN 1 ELSE 0 END) as active_count
FROM contracts
JOIN companies c ON contracts.company_id = c.id
GROUP BY c.name_ar
ORDER BY c.name_ar;

-- 4. Check sample vehicle numbers in database
SELECT
    vehicle_number,
    make,
    model,
    company_id
FROM vehicles
WHERE company_id = (SELECT id FROM companies WHERE name_ar = 'العراف' LIMIT 1)
ORDER BY vehicle_number
LIMIT 20;

-- 5. Check if Excel vehicle numbers exist in database
-- Sample check for first few vehicles from Excel
SELECT
    vehicle_number,
    'Found in database' as status
FROM vehicles
WHERE vehicle_number IN ('2766', '2767', '2768', '2769', '2770', '3085', '3086')
ORDER BY vehicle_number;

-- 6. Check cancelled contracts for specific company
SELECT
    c.contract_number,
    c.status,
    v.vehicle_number,
    cust.first_name as customer_name,
    c.monthly_amount,
    c.start_date,
    c.end_date
FROM contracts c
LEFT JOIN vehicles v ON c.vehicle_id = v.id
LEFT JOIN customers cust ON c.customer_id = cust.id
WHERE c.company_id = (SELECT id FROM companies WHERE name_ar = 'العراف' LIMIT 1)
AND c.status = 'cancelled'
ORDER BY v.vehicle_number
LIMIT 20;
