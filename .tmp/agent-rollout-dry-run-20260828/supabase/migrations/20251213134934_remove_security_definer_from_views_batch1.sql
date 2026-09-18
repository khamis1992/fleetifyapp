-- Remove SECURITY DEFINER from views to enforce proper RLS
-- This makes views respect the querying user's permissions instead of creator's

-- 1. bank_reconciliation_summary
CREATE OR REPLACE VIEW public.bank_reconciliation_summary AS
SELECT company_id,
    count(id) AS total_payments,
    COALESCE(sum(amount), 0::numeric) AS total_amount
FROM payments
GROUP BY company_id;

-- 2. v_deploy_readiness
CREATE OR REPLACE VIEW public.v_deploy_readiness AS
SELECT run_id,
    environment,
    gate_status,
    (lint_passed AND typecheck_passed AND tests_passed AND coverage_passed AND security_passed AND build_passed) AS all_checks_passed,
    coverage_percent,
    bundle_size_kb,
    triggered_by,
    created_at
FROM cto_deploy_gates
ORDER BY created_at DESC
LIMIT 20;

-- 3. vendor_purchase_performance
CREATE OR REPLACE VIEW public.vendor_purchase_performance AS
SELECT v.id AS vendor_id,
    v.company_id,
    v.vendor_name,
    v.vendor_name_ar,
    v.vendor_code,
    v.contact_person,
    v.email,
    v.phone,
    count(DISTINCT po.id) AS total_orders,
    sum(po.total_amount) AS total_purchase_value,
    avg(po.total_amount) AS avg_order_value,
    count(DISTINCT CASE WHEN po.status = 'received' THEN po.id ELSE NULL END) AS completed_orders,
    count(DISTINCT CASE WHEN po.status = 'cancelled' THEN po.id ELSE NULL END) AS cancelled_orders,
    count(DISTINCT CASE WHEN po.delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL 
        AND po.delivery_date <= po.expected_delivery_date THEN po.id ELSE NULL END) AS on_time_deliveries,
    count(DISTINCT CASE WHEN po.delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL 
        THEN po.id ELSE NULL END) AS total_deliveries,
    CASE WHEN count(DISTINCT CASE WHEN po.delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL 
        THEN po.id ELSE NULL END) > 0 
        THEN round((count(DISTINCT CASE WHEN po.delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL 
            AND po.delivery_date <= po.expected_delivery_date THEN po.id ELSE NULL END)::numeric / 
            count(DISTINCT CASE WHEN po.delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL 
            THEN po.id ELSE NULL END)::numeric * 100), 2)
        ELSE 0
    END AS on_time_delivery_rate,
    round(avg(CASE WHEN po.delivery_date IS NOT NULL AND po.order_date IS NOT NULL 
        THEN EXTRACT(day FROM (po.delivery_date::timestamp - po.order_date::timestamp))
        ELSE NULL END), 1) AS avg_delivery_days,
    min(po.order_date) AS first_order_date,
    max(po.order_date) AS last_order_date,
    CASE WHEN max(po.order_date) > (now() - interval '6 months') THEN true ELSE false END AS is_active_vendor
FROM vendors v
LEFT JOIN purchase_orders po ON v.id = po.vendor_id
WHERE v.is_active = true
GROUP BY v.id, v.company_id, v.vendor_name, v.vendor_name_ar, v.vendor_code, v.contact_person, v.email, v.phone
ORDER BY sum(po.total_amount) DESC NULLS LAST;

-- 4. inventory_movement_summary
CREATE OR REPLACE VIEW public.inventory_movement_summary AS
SELECT i.id AS item_id,
    i.company_id,
    i.item_name,
    i.item_name_ar,
    i.item_code,
    im.warehouse_id,
    w.warehouse_name,
    im.movement_type,
    count(*) AS movement_count,
    sum(im.quantity) AS total_quantity,
    sum(abs(im.quantity)) AS total_absolute_quantity,
    min(im.movement_date) AS first_movement_date,
    max(im.movement_date) AS last_movement_date,
    sum(CASE
        WHEN im.movement_type IN ('PURCHASE', 'RETURN') THEN abs(im.quantity) * i.cost_price
        WHEN im.movement_type = 'SALE' THEN abs(im.quantity) * i.unit_price
        ELSE 0
    END) AS estimated_value
FROM inventory_items i
JOIN inventory_movements im ON i.id = im.item_id
LEFT JOIN inventory_warehouses w ON im.warehouse_id = w.id
WHERE i.is_active = true
GROUP BY i.id, i.company_id, i.item_name, i.item_name_ar, i.item_code, im.warehouse_id, w.warehouse_name, im.movement_type
ORDER BY max(im.movement_date) DESC;

-- 5. inventory_aging_analysis
CREATE OR REPLACE VIEW public.inventory_aging_analysis AS
SELECT i.id AS item_id,
    i.company_id,
    i.item_name,
    i.item_code,
    i.sku,
    c.category_name,
    w.id AS warehouse_id,
    w.warehouse_name,
    sl.quantity_on_hand,
    sl.quantity_available,
    sl.last_movement_at,
    CASE
        WHEN sl.last_movement_at IS NULL THEN 999
        ELSE EXTRACT(day FROM (now() - sl.last_movement_at))
    END AS days_since_last_movement,
    CASE
        WHEN sl.last_movement_at IS NULL THEN 'لا توجد حركة'
        WHEN EXTRACT(day FROM (now() - sl.last_movement_at)) > 180 THEN 'راكد جداً (>180 يوم)'
        WHEN EXTRACT(day FROM (now() - sl.last_movement_at)) > 90 THEN 'راكد (>90 يوم)'
        WHEN EXTRACT(day FROM (now() - sl.last_movement_at)) > 30 THEN 'بطيء الحركة (>30 يوم)'
        ELSE 'نشط (<30 يوم)'
    END AS aging_category,
    sl.quantity_on_hand * i.cost_price AS tied_up_value
FROM inventory_items i
JOIN inventory_stock_levels sl ON i.id = sl.item_id
JOIN inventory_warehouses w ON sl.warehouse_id = w.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
WHERE i.is_active = true AND i.is_tracked = true AND sl.quantity_on_hand > 0
ORDER BY 
    CASE
        WHEN sl.last_movement_at IS NULL THEN 999
        ELSE EXTRACT(day FROM (now() - sl.last_movement_at))
    END DESC,
    sl.quantity_on_hand * i.cost_price DESC;;
