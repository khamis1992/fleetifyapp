-- N+1 QUERY OPTIMIZATION MIGRATION (Fixed date calculations)
-- Create optimized views and functions to eliminate N+1 query problems

-- Complete contracts view with all related data
CREATE OR REPLACE VIEW contracts_complete AS
SELECT
    c.*,

    -- Customer information (joined once)
    cu.first_name as customer_first_name,
    cu.last_name as customer_last_name,
    cu.first_name_ar as customer_first_name_ar,
    cu.last_name_ar as customer_last_name_ar,
    cu.phone as customer_phone,
    cu.email as customer_email,
    cu.address as customer_address,

    -- Vehicle information (joined once)
    v.plate_number as vehicle_plate_number,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.year as vehicle_year,
    v.color as vehicle_color,
    v.vin as vehicle_vin,

    -- Creator information
    creator.first_name as created_by_first_name,
    creator.last_name as created_by_last_name,

    -- Invoice statistics (aggregated)
    invoice_stats.total_invoices,
    invoice_stats.total_amount,
    invoice_stats.paid_amount,
    invoice_stats.unpaid_amount,
    invoice_stats.overdue_amount,

    -- Contract status indicators
    CASE
        WHEN c.end_date < CURRENT_DATE THEN 'expired'
        WHEN c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        WHEN c.status = 'active' THEN 'active'
        ELSE c.status
    END as computed_status,

    -- Days until expiration
    (c.end_date - CURRENT_DATE) as days_until_expiration,

    -- Contract duration in months
    DATE_PART('month', AGE(c.end_date, c.start_date)) as duration_months

FROM contracts c
LEFT JOIN customers cu ON c.customer_id = cu.id
LEFT JOIN vehicles v ON c.vehicle_id = v.id
LEFT JOIN profiles creator ON c.created_by = creator.user_id
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN paid_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0) as unpaid_amount,
        COALESCE(SUM(CASE WHEN payment_status != 'paid' AND due_date < CURRENT_DATE THEN total_amount ELSE 0 END), 0) as overdue_amount
    FROM invoices
    WHERE contract_id = c.id
) invoice_stats ON true;;
