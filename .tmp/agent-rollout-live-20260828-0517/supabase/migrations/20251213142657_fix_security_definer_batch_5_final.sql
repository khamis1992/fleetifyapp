-- Batch 5 (FINAL): Fix last 6 SECURITY DEFINER views with explicit security_invoker = true

-- 1. payment_timeline_invoices
DROP VIEW IF EXISTS public.payment_timeline_invoices CASCADE;
CREATE VIEW public.payment_timeline_invoices
WITH (security_invoker = true) AS
SELECT inv.id AS invoice_id,
    inv.invoice_number,
    inv.company_id,
    inv.invoice_date,
    inv.due_date,
    inv.total_amount,
    inv.payment_status,
    COALESCE(sum(
        CASE
            WHEN (pay.payment_status = 'completed'::text) THEN pay.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS total_paid
   FROM (invoices inv
     LEFT JOIN payments pay ON ((inv.id = pay.invoice_id)))
  GROUP BY inv.id, inv.invoice_number, inv.company_id, inv.invoice_date, inv.due_date, inv.total_amount, inv.payment_status
 LIMIT 1;

-- 2. sales_inventory_availability
DROP VIEW IF EXISTS public.sales_inventory_availability CASCADE;
CREATE VIEW public.sales_inventory_availability
WITH (security_invoker = true) AS
SELECT i.id AS item_id,
    i.company_id,
    i.item_name,
    i.item_name_ar,
    i.item_code,
    i.sku,
    i.barcode,
    i.unit_of_measure,
    i.unit_price,
    i.cost_price,
    i.category_id,
    ic.category_name,
    sl.warehouse_id,
    w.warehouse_name,
    w.warehouse_name_ar,
    sl.quantity_on_hand,
    sl.quantity_reserved,
    sl.quantity_available,
    sl.last_movement_at,
        CASE
            WHEN (sl.quantity_available > (i.min_stock_level)::numeric) THEN 'available'::text
            WHEN (sl.quantity_available > (0)::numeric) THEN 'low_stock'::text
            ELSE 'out_of_stock'::text
        END AS stock_status,
    i.min_stock_level,
    i.reorder_point
   FROM (((inventory_items i
     JOIN inventory_stock_levels sl ON ((i.id = sl.item_id)))
     LEFT JOIN inventory_warehouses w ON ((sl.warehouse_id = w.id)))
     LEFT JOIN inventory_categories ic ON ((i.category_id = ic.id)))
  WHERE ((i.is_active = true) AND (w.is_active = true))
  ORDER BY i.item_name, w.warehouse_name;

-- 3. sales_order_fulfillment_status
DROP VIEW IF EXISTS public.sales_order_fulfillment_status CASCADE;
CREATE VIEW public.sales_order_fulfillment_status
WITH (security_invoker = true) AS
SELECT id AS order_id,
    company_id,
    order_number,
    order_date,
    delivery_date,
    status,
    customer_id,
    total AS order_total,
    notes,
    jsonb_array_length(items) AS total_items,
        CASE
            WHEN (((status)::text = 'shipped'::text) OR ((status)::text = 'delivered'::text)) THEN 'fulfilled'::text
            WHEN ((status)::text = 'cancelled'::text) THEN 'cancelled'::text
            ELSE 'pending'::text
        END AS fulfillment_status
   FROM sales_orders so
  WHERE (is_active = true)
  ORDER BY order_date DESC;

-- 4. table_size_stats
DROP VIEW IF EXISTS public.table_size_stats CASCADE;
CREATE VIEW public.table_size_stats
WITH (security_invoker = true) AS
SELECT schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass)) AS total_size,
    pg_size_pretty(pg_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass)) AS table_size,
    pg_size_pretty((pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass) - pg_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass))) AS index_size
   FROM pg_tables
  WHERE (schemaname = 'public'::name)
  ORDER BY (pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass)) DESC;

-- 5. template_performance_summary
DROP VIEW IF EXISTS public.template_performance_summary CASCADE;
CREATE VIEW public.template_performance_summary
WITH (security_invoker = true) AS
SELECT id,
    company_id,
    name,
    stage,
    channel,
    status,
    sent_count,
    opened_count,
    clicked_count,
    response_count,
    conversion_rate,
        CASE
            WHEN (sent_count > 0) THEN (((opened_count)::numeric / (sent_count)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END AS open_rate,
        CASE
            WHEN (sent_count > 0) THEN (((clicked_count)::numeric / (sent_count)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END AS click_rate,
        CASE
            WHEN (sent_count > 0) THEN (((response_count)::numeric / (sent_count)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END AS response_rate
   FROM reminder_templates
  WHERE (status = 'active'::text)
  ORDER BY sent_count DESC;

-- 6. v_account_linking_stats
DROP VIEW IF EXISTS public.v_account_linking_stats CASCADE;
CREATE VIEW public.v_account_linking_stats
WITH (security_invoker = true) AS
SELECT company_id,
    count(*) AS total_accounts,
    count(*) FILTER (WHERE (is_header = true)) AS header_accounts,
    count(*) FILTER (WHERE (is_header = false)) AS detail_accounts,
    count(*) FILTER (WHERE (is_system = true)) AS system_accounts,
    count(*) FILTER (WHERE (can_link_customers = true)) AS customer_linkable,
    count(*) FILTER (WHERE (can_link_vendors = true)) AS vendor_linkable,
    count(*) FILTER (WHERE (can_link_employees = true)) AS employee_linkable,
    count(*) FILTER (WHERE ((can_link_customers = true) OR (can_link_vendors = true) OR (can_link_employees = true))) AS total_linkable
   FROM chart_of_accounts
  WHERE (is_active = true)
  GROUP BY company_id;;
