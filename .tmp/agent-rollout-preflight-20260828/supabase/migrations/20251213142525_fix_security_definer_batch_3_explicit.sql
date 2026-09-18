-- Batch 3: Fix 7 more SECURITY DEFINER views with explicit security_invoker = true

-- 1. ab_test_comparison
DROP VIEW IF EXISTS public.ab_test_comparison CASCADE;
CREATE VIEW public.ab_test_comparison
WITH (security_invoker = true) AS
SELECT stage,
    channel,
    variant,
    count(*) AS template_count,
    sum(sent_count) AS total_sent,
    avg(
        CASE
            WHEN (sent_count > 0) THEN (((opened_count)::numeric / (sent_count)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END) AS avg_open_rate,
    avg(
        CASE
            WHEN (sent_count > 0) THEN (((clicked_count)::numeric / (sent_count)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END) AS avg_click_rate,
    avg(
        CASE
            WHEN (sent_count > 0) THEN (((response_count)::numeric / (sent_count)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END) AS avg_response_rate,
    avg(conversion_rate) AS avg_conversion_rate
   FROM reminder_templates rt
  WHERE ((status = 'active'::text) AND (variant IS NOT NULL))
  GROUP BY stage, channel, variant
  ORDER BY stage, channel, variant;

-- 2. customer_payment_score_summary
DROP VIEW IF EXISTS public.customer_payment_score_summary CASCADE;
CREATE VIEW public.customer_payment_score_summary
WITH (security_invoker = true) AS
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

-- 3. inventory_pending_replenishments
DROP VIEW IF EXISTS public.inventory_pending_replenishments CASCADE;
CREATE VIEW public.inventory_pending_replenishments
WITH (security_invoker = true) AS
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
            WHEN ((rr.urgency_level)::text = 'CRITICAL'::text) THEN 1
            WHEN ((rr.urgency_level)::text = 'HIGH'::text) THEN 2
            WHEN ((rr.urgency_level)::text = 'NORMAL'::text) THEN 3
            ELSE 4
        END AS priority_rank
   FROM (((inventory_replenishment_requests rr
     JOIN inventory_items i ON ((rr.item_id = i.id)))
     JOIN inventory_warehouses w ON ((rr.warehouse_id = w.id)))
     LEFT JOIN inventory_categories c ON ((i.category_id = c.id)))
  WHERE ((rr.status)::text = 'PENDING'::text)
  ORDER BY
        CASE
            WHEN ((rr.urgency_level)::text = 'CRITICAL'::text) THEN 1
            WHEN ((rr.urgency_level)::text = 'HIGH'::text) THEN 2
            WHEN ((rr.urgency_level)::text = 'NORMAL'::text) THEN 3
            ELSE 4
        END, rr.created_at DESC;

-- 4. inventory_purchase_order_summary
DROP VIEW IF EXISTS public.inventory_purchase_order_summary CASCADE;
CREATE VIEW public.inventory_purchase_order_summary
WITH (security_invoker = true) AS
SELECT company_id,
    status,
    count(*) AS order_count,
    sum(total_amount) AS total_value,
    avg(total_amount) AS average_order_value,
    date_trunc('month'::text, order_date) AS order_month
   FROM inventory_purchase_orders po
  GROUP BY company_id, status, (date_trunc('month'::text, order_date))
  ORDER BY (date_trunc('month'::text, order_date)) DESC, status;

-- 5. inventory_valuation
DROP VIEW IF EXISTS public.inventory_valuation CASCADE;
CREATE VIEW public.inventory_valuation
WITH (security_invoker = true) AS
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
    (sl.quantity_on_hand * i.cost_price) AS total_cost_value,
    (sl.quantity_on_hand * i.unit_price) AS total_selling_value
   FROM ((inventory_items i
     JOIN inventory_stock_levels sl ON ((i.id = sl.item_id)))
     JOIN inventory_warehouses w ON ((sl.warehouse_id = w.id)))
  WHERE ((i.is_active = true) AND (w.is_active = true));

-- 6. payment_method_statistics
DROP VIEW IF EXISTS public.payment_method_statistics CASCADE;
CREATE VIEW public.payment_method_statistics
WITH (security_invoker = true) AS
SELECT company_id,
    payment_method,
    count(id) AS total_transactions,
    COALESCE(sum(amount), (0)::numeric) AS total_amount
   FROM payments
  GROUP BY company_id, payment_method;

-- 7. v_recent_failures
DROP VIEW IF EXISTS public.v_recent_failures CASCADE;
CREATE VIEW public.v_recent_failures
WITH (security_invoker = true) AS
SELECT id,
    run_id,
    pr_number,
    stage,
    actor,
    details,
    violations,
    created_at
   FROM cto_agent_audit
  WHERE (status = 'fail'::text)
  ORDER BY created_at DESC
 LIMIT 50;;
