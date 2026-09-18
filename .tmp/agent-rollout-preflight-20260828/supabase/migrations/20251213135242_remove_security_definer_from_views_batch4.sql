-- Remove SECURITY DEFINER from more views (batch 4)

-- 15. customer_payment_score_summary
CREATE OR REPLACE VIEW public.customer_payment_score_summary AS
SELECT DISTINCT ON (customer_id) customer_id,
    company_id,
    score,
    category,
    late_payments_deduction,
    broken_promises_deduction,
    disputes_deduction,
    failed_payments_deduction,
    early_payments_bonus,
    other_bonuses,
    calculated_at
FROM customer_payment_scores
ORDER BY customer_id, calculated_at DESC;

-- 16. inventory_valuation
CREATE OR REPLACE VIEW public.inventory_valuation AS
SELECT i.company_id,
    i.id AS item_id,
    i.item_name,
    i.item_code,
    w.id AS warehouse_id,
    w.warehouse_name,
    sl.quantity_on_hand,
    sl.quantity_reserved,
    sl.quantity_available,
    i.cost_price,
    i.unit_price,
    sl.quantity_on_hand * i.cost_price AS total_cost_value,
    sl.quantity_on_hand * i.unit_price AS total_selling_value
FROM inventory_items i
JOIN inventory_stock_levels sl ON i.id = sl.item_id
JOIN inventory_warehouses w ON sl.warehouse_id = w.id
WHERE i.is_active = true AND w.is_active = true;

-- 17. ab_test_comparison
CREATE OR REPLACE VIEW public.ab_test_comparison AS
SELECT stage,
    channel,
    variant,
    count(*) AS template_count,
    sum(sent_count) AS total_sent,
    avg(CASE WHEN sent_count > 0 THEN (opened_count::numeric / sent_count::numeric * 100) ELSE 0 END) AS avg_open_rate,
    avg(CASE WHEN sent_count > 0 THEN (clicked_count::numeric / sent_count::numeric * 100) ELSE 0 END) AS avg_click_rate,
    avg(CASE WHEN sent_count > 0 THEN (response_count::numeric / sent_count::numeric * 100) ELSE 0 END) AS avg_response_rate,
    avg(conversion_rate) AS avg_conversion_rate
FROM reminder_templates rt
WHERE status = 'active' AND variant IS NOT NULL
GROUP BY stage, channel, variant
ORDER BY stage, channel, variant;

-- 18. inventory_pending_replenishments
CREATE OR REPLACE VIEW public.inventory_pending_replenishments AS
SELECT rr.id,
    rr.company_id,
    rr.request_number,
    rr.current_stock,
    rr.requested_quantity,
    rr.urgency_level,
    rr.created_at,
    i.item_name,
    i.item_code,
    i.sku,
    w.warehouse_name,
    c.category_name,
    CASE
        WHEN rr.urgency_level::text = 'CRITICAL' THEN 1
        WHEN rr.urgency_level::text = 'HIGH' THEN 2
        WHEN rr.urgency_level::text = 'NORMAL' THEN 3
        ELSE 4
    END AS priority_rank
FROM inventory_replenishment_requests rr
JOIN inventory_items i ON rr.item_id = i.id
JOIN inventory_warehouses w ON rr.warehouse_id = w.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
WHERE rr.status::text = 'PENDING'
ORDER BY priority_rank, rr.created_at DESC;

-- 19. payment_method_statistics
CREATE OR REPLACE VIEW public.payment_method_statistics AS
SELECT company_id,
    payment_method,
    count(id) AS total_transactions,
    COALESCE(sum(amount), 0) AS total_amount
FROM payments
GROUP BY company_id, payment_method;;
