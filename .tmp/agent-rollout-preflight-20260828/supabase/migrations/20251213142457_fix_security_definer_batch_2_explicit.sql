-- Batch 2: Fix 7 more SECURITY DEFINER views with explicit security_invoker = true

-- 1. active_payment_plans_summary
DROP VIEW IF EXISTS public.active_payment_plans_summary CASCADE;
CREATE VIEW public.active_payment_plans_summary
WITH (security_invoker = true) AS
SELECT pp.id,
    pp.company_id,
    pp.customer_id,
    COALESCE(((c.first_name || ' '::text) || c.last_name), c.first_name, c.last_name, ''::text) AS customer_name,
    pp.invoice_id,
    pp.total_amount,
    pp.number_of_payments,
    pp.frequency,
    pp.status,
    count(pi.id) AS total_installments,
    count(pi.id) FILTER (WHERE (pi.status = 'paid'::text)) AS paid_installments,
    count(pi.id) FILTER (WHERE (pi.status = 'overdue'::text)) AS overdue_installments,
    sum(pi.amount) AS total_plan_amount,
    sum(pi.paid_amount) AS total_paid_amount,
    pp.start_date,
    pp.end_date
   FROM ((payment_plans pp
     LEFT JOIN payment_installments pi ON ((pp.id = pi.payment_plan_id)))
     LEFT JOIN customers c ON ((pp.customer_id = c.id)))
  WHERE (pp.status = 'active'::text)
  GROUP BY pp.id, c.first_name, c.last_name;

-- 2. inventory_reorder_recommendations
DROP VIEW IF EXISTS public.inventory_reorder_recommendations CASCADE;
CREATE VIEW public.inventory_reorder_recommendations
WITH (security_invoker = true) AS
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
    COALESCE(sum(sl.quantity_available), (0)::numeric) AS total_available,
    COALESCE(sum(sl.quantity_reserved), (0)::numeric) AS total_reserved,
    COALESCE(sum(sl.quantity_on_hand), (0)::numeric) AS total_on_hand,
    GREATEST(((i.reorder_point)::numeric - COALESCE(sum(sl.quantity_available), (0)::numeric)), (0)::numeric) AS shortage,
    GREATEST((COALESCE(i.reorder_quantity, i.min_stock_level, 10))::numeric, ((i.reorder_point)::numeric - COALESCE(sum(sl.quantity_available), (0)::numeric))) AS suggested_order_quantity,
    COALESCE(( SELECT sum((poi.quantity - poi.received_quantity)) AS sum
           FROM (purchase_order_items poi
             JOIN purchase_orders po ON ((poi.purchase_order_id = po.id)))
          WHERE ((poi.item_code = (i.item_code)::text) AND (po.status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'sent_to_vendor'::text, 'partially_received'::text])))), (0)::numeric) AS pending_po_quantity,
    ( SELECT v.id
           FROM ((purchase_order_items poi
             JOIN purchase_orders po ON ((poi.purchase_order_id = po.id)))
             JOIN vendors v ON ((po.vendor_id = v.id)))
          WHERE (poi.item_code = (i.item_code)::text)
          ORDER BY po.order_date DESC
         LIMIT 1) AS last_vendor_id,
    ( SELECT v.vendor_name
           FROM ((purchase_order_items poi
             JOIN purchase_orders po ON ((poi.purchase_order_id = po.id)))
             JOIN vendors v ON ((po.vendor_id = v.id)))
          WHERE (poi.item_code = (i.item_code)::text)
          ORDER BY po.order_date DESC
         LIMIT 1) AS last_vendor_name
   FROM (inventory_items i
     LEFT JOIN inventory_stock_levels sl ON ((i.id = sl.item_id)))
  WHERE ((i.is_active = true) AND (i.is_tracked = true) AND (i.reorder_point IS NOT NULL))
  GROUP BY i.id
 HAVING (COALESCE(sum(sl.quantity_available), (0)::numeric) <= (i.reorder_point)::numeric)
  ORDER BY GREATEST(((i.reorder_point)::numeric - COALESCE(sum(sl.quantity_available), (0)::numeric)), (0)::numeric) DESC, i.item_name;

-- 3. inventory_suppliers_summary
DROP VIEW IF EXISTS public.inventory_suppliers_summary CASCADE;
CREATE VIEW public.inventory_suppliers_summary
WITH (security_invoker = true) AS
SELECT s.id,
    s.company_id,
    s.company_name,
    s.company_name_ar,
    s.contact_person,
    s.email,
    s.phone,
    s.address,
    s.city,
    s.country,
    s.tax_number,
    s.commercial_register,
    s.payment_terms,
    s.delivery_terms,
    s.rating,
    s.is_active,
    s.is_preferred,
    s.lead_time_days,
    s.minimum_order_value,
    s.website,
    s.notes,
    s.created_at,
    s.updated_at,
    s.created_by,
    c.category_name,
    sp.evaluation_period,
    sp.quality_score,
    sp.average_lead_time_days,
    sp.order_accuracy_rate,
    sp.price_competitiveness_score,
    sp.total_orders,
    sp.total_order_value
   FROM (((inventory_suppliers s
     LEFT JOIN inventory_supplier_category_mapping scm ON ((s.id = scm.supplier_id)))
     LEFT JOIN inventory_supplier_categories c ON ((scm.category_id = c.id)))
     LEFT JOIN LATERAL ( SELECT inventory_supplier_performance.id,
            inventory_supplier_performance.company_id,
            inventory_supplier_performance.supplier_id,
            inventory_supplier_performance.evaluation_period,
            inventory_supplier_performance.total_orders,
            inventory_supplier_performance.on_time_deliveries,
            inventory_supplier_performance.delayed_deliveries,
            inventory_supplier_performance.quality_score,
            inventory_supplier_performance.average_lead_time_days,
            inventory_supplier_performance.order_accuracy_rate,
            inventory_supplier_performance.price_competitiveness_score,
            inventory_supplier_performance.responsiveness_score,
            inventory_supplier_performance.total_order_value,
            inventory_supplier_performance.return_rate,
            inventory_supplier_performance.issues_count,
            inventory_supplier_performance.calculated_at,
            inventory_supplier_performance.created_at,
            inventory_supplier_performance.updated_at
           FROM inventory_supplier_performance
          WHERE (inventory_supplier_performance.supplier_id = s.id)
          ORDER BY inventory_supplier_performance.evaluation_period DESC
         LIMIT 1) sp ON (true))
  WHERE (s.is_active = true)
  ORDER BY s.rating DESC, sp.quality_score DESC NULLS LAST;

-- 4. payroll_financial_analysis
DROP VIEW IF EXISTS public.payroll_financial_analysis CASCADE;
CREATE VIEW public.payroll_financial_analysis
WITH (security_invoker = true) AS
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
            WHEN (p.journal_entry_id IS NOT NULL) THEN 'integrated'::text
            WHEN (p.status = 'paid'::text) THEN 'error'::text
            ELSE 'pending'::text
        END AS integration_status
   FROM (((payroll p
     JOIN employees e ON ((p.employee_id = e.id)))
     LEFT JOIN journal_entries je ON ((p.journal_entry_id = je.id)))
     LEFT JOIN cost_centers cc ON (((cc.company_id = p.company_id) AND (cc.center_code = 'PAYROLL_WAGES'::text))));

-- 5. reminder_statistics
DROP VIEW IF EXISTS public.reminder_statistics CASCADE;
CREATE VIEW public.reminder_statistics
WITH (security_invoker = true) AS
SELECT reminder_type,
    date(sent_at) AS date,
    count(*) AS total_sent,
    count(*) FILTER (WHERE (success = true)) AS successful,
    count(*) FILTER (WHERE (success = false)) AS failed,
    round(((100.0 * (count(*) FILTER (WHERE (success = true)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS success_rate
   FROM reminder_history
  WHERE (reminder_type IS NOT NULL)
  GROUP BY reminder_type, (date(sent_at))
  ORDER BY (date(sent_at)) DESC, reminder_type;

-- 6. v_pending_waivers
DROP VIEW IF EXISTS public.v_pending_waivers CASCADE;
CREATE VIEW public.v_pending_waivers
WITH (security_invoker = true) AS
SELECT id,
    rule_id,
    rule_name,
    reason,
    requested_by,
    expires_at,
    created_at
   FROM cto_waivers
  WHERE (status = 'pending'::text)
  ORDER BY created_at DESC;

-- 7. v_report_schedule_status
DROP VIEW IF EXISTS public.v_report_schedule_status CASCADE;
CREATE VIEW public.v_report_schedule_status
WITH (security_invoker = true) AS
SELECT report_type,
    count(*) FILTER (WHERE ((status = 'completed'::text) AND (created_at > (now() - '7 days'::interval)))) AS successful_last_7_days,
    count(*) FILTER (WHERE ((status = 'failed'::text) AND (created_at > (now() - '7 days'::interval)))) AS failed_last_7_days,
    max(completed_at) FILTER (WHERE (status = 'completed'::text)) AS last_successful_run,
    max(created_at) FILTER (WHERE (status = 'failed'::text)) AS last_failed_run
   FROM scheduled_report_logs
  GROUP BY report_type;;
