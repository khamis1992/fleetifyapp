-- Batch 1: Fix 7 SECURITY DEFINER views with explicit security_invoker = true

-- 1. bank_reconciliation_summary
DROP VIEW IF EXISTS public.bank_reconciliation_summary CASCADE;
CREATE VIEW public.bank_reconciliation_summary
WITH (security_invoker = true) AS
SELECT company_id,
    count(id) AS total_payments,
    COALESCE(sum(amount), (0)::numeric) AS total_amount
   FROM payments
  GROUP BY company_id;

-- 2. inventory_aging_analysis
DROP VIEW IF EXISTS public.inventory_aging_analysis CASCADE;
CREATE VIEW public.inventory_aging_analysis
WITH (security_invoker = true) AS
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
            WHEN (sl.last_movement_at IS NULL) THEN (999)::numeric
            ELSE EXTRACT(day FROM (now() - sl.last_movement_at))
        END AS days_since_last_movement,
        CASE
            WHEN (sl.last_movement_at IS NULL) THEN 'لا توجد حركة'::text
            WHEN (EXTRACT(day FROM (now() - sl.last_movement_at)) > (180)::numeric) THEN 'راكد جداً (>180 يوم)'::text
            WHEN (EXTRACT(day FROM (now() - sl.last_movement_at)) > (90)::numeric) THEN 'راكد (>90 يوم)'::text
            WHEN (EXTRACT(day FROM (now() - sl.last_movement_at)) > (30)::numeric) THEN 'بطيء الحركة (>30 يوم)'::text
            ELSE 'نشط (<30 يوم)'::text
        END AS aging_category,
    (sl.quantity_on_hand * i.cost_price) AS tied_up_value
   FROM (((inventory_items i
     JOIN inventory_stock_levels sl ON ((i.id = sl.item_id)))
     JOIN inventory_warehouses w ON ((sl.warehouse_id = w.id)))
     LEFT JOIN inventory_categories c ON ((i.category_id = c.id)))
  WHERE ((i.is_active = true) AND (i.is_tracked = true) AND (sl.quantity_on_hand > (0)::numeric))
  ORDER BY
        CASE
            WHEN (sl.last_movement_at IS NULL) THEN (999)::numeric
            ELSE EXTRACT(day FROM (now() - sl.last_movement_at))
        END DESC, (sl.quantity_on_hand * i.cost_price) DESC;

-- 3. inventory_movement_summary
DROP VIEW IF EXISTS public.inventory_movement_summary CASCADE;
CREATE VIEW public.inventory_movement_summary
WITH (security_invoker = true) AS
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
    sum(
        CASE
            WHEN ((im.movement_type)::text = ANY ((ARRAY['PURCHASE'::character varying, 'RETURN'::character varying])::text[])) THEN (abs(im.quantity) * i.cost_price)
            WHEN ((im.movement_type)::text = 'SALE'::text) THEN (abs(im.quantity) * i.unit_price)
            ELSE (0)::numeric
        END) AS estimated_value
   FROM ((inventory_items i
     JOIN inventory_movements im ON ((i.id = im.item_id)))
     LEFT JOIN inventory_warehouses w ON ((im.warehouse_id = w.id)))
  WHERE (i.is_active = true)
  GROUP BY i.id, i.company_id, i.item_name, i.item_name_ar, i.item_code, im.warehouse_id, w.warehouse_name, im.movement_type
  ORDER BY (max(im.movement_date)) DESC;

-- 4. security_policy_violations
DROP VIEW IF EXISTS public.security_policy_violations CASCADE;
CREATE VIEW public.security_policy_violations
WITH (security_invoker = true) AS
SELECT 'users_without_company'::text AS violation_type,
    count(*) AS count,
    array_agg(profiles.user_id) AS affected_users
   FROM profiles
  WHERE ((profiles.company_id IS NULL) AND (profiles.is_active = true))
UNION ALL
 SELECT 'orphaned_records'::text AS violation_type,
    count(*) AS count,
    array_agg(contracts.id) AS affected_users
   FROM contracts
  WHERE (NOT (contracts.company_id IN ( SELECT companies.id
           FROM companies)))
UNION ALL
 SELECT 'inactive_users_with_active_data'::text AS violation_type,
    count(*) AS count,
    array_agg(DISTINCT contracts.created_by) AS affected_users
   FROM contracts
  WHERE (contracts.created_by IN ( SELECT profiles.user_id
           FROM profiles
          WHERE (profiles.is_active = false)));

-- 5. v_deploy_readiness
DROP VIEW IF EXISTS public.v_deploy_readiness CASCADE;
CREATE VIEW public.v_deploy_readiness
WITH (security_invoker = true) AS
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

-- 6. v_linkable_accounts
DROP VIEW IF EXISTS public.v_linkable_accounts CASCADE;
CREATE VIEW public.v_linkable_accounts
WITH (security_invoker = true) AS
SELECT id,
    company_id,
    account_code,
    account_name,
    account_name_ar,
    account_type,
    account_subtype,
    parent_account_id,
    is_active,
    is_system,
    balance_type,
    current_balance,
    description,
    created_at,
    updated_at,
    account_level,
    sort_order,
    is_header,
    is_default,
    parent_account_code,
    can_link_customers,
    can_link_vendors,
    can_link_employees,
        CASE
            WHEN can_link_customers THEN 'customers'::text
            WHEN can_link_vendors THEN 'vendors'::text
            WHEN can_link_employees THEN 'employees'::text
            ELSE 'none'::text
        END AS primary_link_type,
    (((can_link_customers)::integer + (can_link_vendors)::integer) + (can_link_employees)::integer) AS link_count
   FROM chart_of_accounts ca
  WHERE ((is_header = false) AND (is_active = true) AND ((can_link_customers = true) OR (can_link_vendors = true) OR (can_link_employees = true)));

-- 7. vendor_purchase_performance
DROP VIEW IF EXISTS public.vendor_purchase_performance CASCADE;
CREATE VIEW public.vendor_purchase_performance
WITH (security_invoker = true) AS
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
    count(DISTINCT
        CASE
            WHEN (po.status = 'received'::text) THEN po.id
            ELSE NULL::uuid
        END) AS completed_orders,
    count(DISTINCT
        CASE
            WHEN (po.status = 'cancelled'::text) THEN po.id
            ELSE NULL::uuid
        END) AS cancelled_orders,
    count(DISTINCT
        CASE
            WHEN ((po.delivery_date IS NOT NULL) AND (po.expected_delivery_date IS NOT NULL) AND (po.delivery_date <= po.expected_delivery_date)) THEN po.id
            ELSE NULL::uuid
        END) AS on_time_deliveries,
    count(DISTINCT
        CASE
            WHEN ((po.delivery_date IS NOT NULL) AND (po.expected_delivery_date IS NOT NULL)) THEN po.id
            ELSE NULL::uuid
        END) AS total_deliveries,
        CASE
            WHEN (count(DISTINCT
            CASE
                WHEN ((po.delivery_date IS NOT NULL) AND (po.expected_delivery_date IS NOT NULL)) THEN po.id
                ELSE NULL::uuid
            END) > 0) THEN round((((count(DISTINCT
            CASE
                WHEN ((po.delivery_date IS NOT NULL) AND (po.expected_delivery_date IS NOT NULL) AND (po.delivery_date <= po.expected_delivery_date)) THEN po.id
                ELSE NULL::uuid
            END))::numeric / (count(DISTINCT
            CASE
                WHEN ((po.delivery_date IS NOT NULL) AND (po.expected_delivery_date IS NOT NULL)) THEN po.id
                ELSE NULL::uuid
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS on_time_delivery_rate,
    round(avg(
        CASE
            WHEN ((po.delivery_date IS NOT NULL) AND (po.order_date IS NOT NULL)) THEN EXTRACT(day FROM ((po.delivery_date)::timestamp without time zone - (po.order_date)::timestamp without time zone))
            ELSE NULL::numeric
        END), 1) AS avg_delivery_days,
    min(po.order_date) AS first_order_date,
    max(po.order_date) AS last_order_date,
        CASE
            WHEN (max(po.order_date) > (now() - '6 mons'::interval)) THEN true
            ELSE false
        END AS is_active_vendor
   FROM (vendors v
     LEFT JOIN purchase_orders po ON ((v.id = po.vendor_id)))
  WHERE (v.is_active = true)
  GROUP BY v.id, v.company_id, v.vendor_name, v.vendor_name_ar, v.vendor_code, v.contact_person, v.email, v.phone
  ORDER BY (sum(po.total_amount)) DESC NULLS LAST;;
