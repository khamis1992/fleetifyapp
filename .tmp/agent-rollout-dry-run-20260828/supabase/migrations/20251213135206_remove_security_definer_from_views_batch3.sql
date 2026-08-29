-- Remove SECURITY DEFINER from more views (batch 3)

-- 11. reminder_statistics
CREATE OR REPLACE VIEW public.reminder_statistics AS
SELECT reminder_type,
    date(sent_at) AS date,
    count(*) AS total_sent,
    count(*) FILTER (WHERE success = true) AS successful,
    count(*) FILTER (WHERE success = false) AS failed,
    round((100.0 * count(*) FILTER (WHERE success = true)::numeric / NULLIF(count(*), 0)::numeric), 2) AS success_rate
FROM reminder_history
WHERE reminder_type IS NOT NULL
GROUP BY reminder_type, date(sent_at)
ORDER BY date(sent_at) DESC, reminder_type;

-- 12. payroll_financial_analysis
CREATE OR REPLACE VIEW public.payroll_financial_analysis AS
SELECT p.id,
    p.company_id,
    p.payroll_number,
    p.payroll_date,
    p.basic_salary,
    p.allowances,
    p.overtime_amount,
    p.deductions,
    p.tax_amount,
    p.net_amount,
    p.status,
    p.journal_entry_id,
    e.first_name,
    e.last_name,
    e.first_name_ar,
    e.last_name_ar,
    e.employee_number,
    e.department,
    e."position",
    je.entry_number AS journal_entry_number,
    je.status AS journal_entry_status,
    cc.center_name AS cost_center_name,
    cc.center_name_ar AS cost_center_name_ar,
    CASE
        WHEN p.journal_entry_id IS NOT NULL THEN 'integrated'
        WHEN p.status = 'paid' THEN 'error'
        ELSE 'pending'
    END AS integration_status
FROM payroll p
JOIN employees e ON p.employee_id = e.id
LEFT JOIN journal_entries je ON p.journal_entry_id = je.id
LEFT JOIN cost_centers cc ON cc.company_id = p.company_id AND cc.center_code = 'PAYROLL_WAGES';

-- 13. v_report_schedule_status
CREATE OR REPLACE VIEW public.v_report_schedule_status AS
SELECT report_type,
    count(*) FILTER (WHERE status = 'completed' AND created_at > (now() - interval '7 days')) AS successful_last_7_days,
    count(*) FILTER (WHERE status = 'failed' AND created_at > (now() - interval '7 days')) AS failed_last_7_days,
    max(completed_at) FILTER (WHERE status = 'completed') AS last_successful_run,
    max(created_at) FILTER (WHERE status = 'failed') AS last_failed_run
FROM scheduled_report_logs
GROUP BY report_type;

-- 14. inventory_reorder_recommendations
CREATE OR REPLACE VIEW public.inventory_reorder_recommendations AS
SELECT i.id AS item_id,
    i.company_id,
    i.item_name,
    i.item_name_ar,
    i.item_code,
    i.sku,
    i.unit_of_measure,
    i.cost_price,
    i.unit_price,
    i.min_stock_level,
    i.reorder_point,
    i.reorder_quantity,
    COALESCE(sum(sl.quantity_available), 0) AS total_available,
    COALESCE(sum(sl.quantity_reserved), 0) AS total_reserved,
    COALESCE(sum(sl.quantity_on_hand), 0) AS total_on_hand,
    GREATEST(i.reorder_point::numeric - COALESCE(sum(sl.quantity_available), 0), 0) AS shortage,
    GREATEST(COALESCE(i.reorder_quantity, i.min_stock_level, 10)::numeric, i.reorder_point::numeric - COALESCE(sum(sl.quantity_available), 0)) AS suggested_order_quantity,
    COALESCE((
        SELECT sum(poi.quantity - poi.received_quantity)
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE poi.item_code = i.item_code::text 
            AND po.status IN ('draft', 'pending_approval', 'approved', 'sent_to_vendor', 'partially_received')
    ), 0) AS pending_po_quantity,
    (SELECT v.id FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        JOIN vendors v ON po.vendor_id = v.id
        WHERE poi.item_code = i.item_code::text
        ORDER BY po.order_date DESC LIMIT 1
    ) AS last_vendor_id,
    (SELECT v.vendor_name FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        JOIN vendors v ON po.vendor_id = v.id
        WHERE poi.item_code = i.item_code::text
        ORDER BY po.order_date DESC LIMIT 1
    ) AS last_vendor_name
FROM inventory_items i
LEFT JOIN inventory_stock_levels sl ON i.id = sl.item_id
WHERE i.is_active = true 
    AND i.is_tracked = true 
    AND i.reorder_point IS NOT NULL
GROUP BY i.id
HAVING COALESCE(sum(sl.quantity_available), 0) <= i.reorder_point::numeric
ORDER BY GREATEST(i.reorder_point::numeric - COALESCE(sum(sl.quantity_available), 0), 0) DESC, i.item_name;;
