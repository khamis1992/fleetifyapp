-- Count total payments
SELECT COUNT(*) as total_payments FROM payments;

-- Count payments by company
SELECT
    company_id,
    c.name as company_name,
    COUNT(*) as payment_count
FROM payments p
JOIN companies c ON p.company_id = c.id
GROUP BY company_id, c.name
ORDER BY payment_count DESC;

-- Count payments by status for Al-Araf company
SELECT
    payment_status,
    COUNT(*) as count
FROM payments
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY payment_status
ORDER BY count DESC;

-- Show some sample payments from backup file
SELECT
    payment_number,
    payment_date,
    amount,
    payment_status,
    notes
FROM payments
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
ORDER BY payment_date DESC
LIMIT 10;