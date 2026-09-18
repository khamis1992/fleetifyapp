-- Batch 7: Explicitly set SECURITY INVOKER to remove SECURITY DEFINER
-- This properly removes the SECURITY DEFINER property

-- Drop and recreate all previously "fixed" views with explicit SECURITY INVOKER

-- From batch 6: inventory_low_stock_items
DROP VIEW IF EXISTS public.inventory_low_stock_items CASCADE;
CREATE VIEW public.inventory_low_stock_items 
WITH (security_invoker = true) AS
SELECT i.id,
    i.company_id,
    i.item_name,
    i.item_code,
    i.sku,
    c.category_name,
    w.warehouse_name,
    sl.quantity_available,
    i.min_stock_level,
    i.reorder_point,
    i.reorder_quantity,
    ((i.min_stock_level)::numeric - sl.quantity_available) AS shortage
   FROM (((inventory_items i
     JOIN inventory_stock_levels sl ON ((i.id = sl.item_id)))
     JOIN inventory_warehouses w ON ((sl.warehouse_id = w.id)))
     LEFT JOIN inventory_categories c ON ((i.category_id = c.id)))
  WHERE ((i.is_active = true) AND (i.is_tracked = true) AND (sl.quantity_available < (i.min_stock_level)::numeric))
  ORDER BY ((i.min_stock_level)::numeric - sl.quantity_available) DESC;

-- contracts_complete
DROP VIEW IF EXISTS public.contracts_complete CASCADE;
CREATE VIEW public.contracts_complete
WITH (security_invoker = true) AS
SELECT c.id,
    c.company_id,
    c.customer_id,
    c.contract_number,
    c.contract_date,
    c.start_date,
    c.end_date,
    c.contract_amount,
    c.monthly_amount,
    c.status,
    c.contract_type,
    c.vehicle_id,
    c.description,
    c.terms,
    c.journal_entry_id,
    c.created_by,
    c.created_at,
    c.updated_at,
    c.cost_center_id,
    c.vehicle_returned,
    c.auto_renew_enabled,
    c.renewal_terms,
    c.last_renewal_check,
    c.account_id,
    c.last_payment_check_date,
    c.suspension_reason,
    c.expired_at,
    c.total_paid,
    c.balance_due,
    c.payment_status,
    c.last_payment_date,
    c.late_fine_amount,
    c.days_overdue,
    c.created_via,
    c.license_plate,
    c.make,
    c.model,
    c.year,
    c.vehicle_status,
    cu.first_name AS customer_first_name,
    cu.last_name AS customer_last_name,
    cu.first_name_ar AS customer_first_name_ar,
    cu.last_name_ar AS customer_last_name_ar,
    cu.phone AS customer_phone,
    cu.email AS customer_email,
    cu.address AS customer_address,
    v.plate_number AS vehicle_plate_number,
    v.make AS vehicle_make,
    v.model AS vehicle_model,
    v.year AS vehicle_year,
    v.color AS vehicle_color,
    v.vin AS vehicle_vin,
    creator.first_name AS created_by_first_name,
    creator.last_name AS created_by_last_name,
    invoice_stats.total_invoices,
    invoice_stats.total_amount,
    invoice_stats.paid_amount,
    invoice_stats.unpaid_amount,
    invoice_stats.overdue_amount,
        CASE
            WHEN (c.end_date < CURRENT_DATE) THEN 'expired'::text
            WHEN ((c.end_date >= CURRENT_DATE) AND (c.end_date <= (CURRENT_DATE + '30 days'::interval))) THEN 'expiring_soon'::text
            WHEN (c.status = 'active'::text) THEN 'active'::text
            ELSE c.status
        END AS computed_status,
    (c.end_date - CURRENT_DATE) AS days_until_expiration,
    date_part('month'::text, age((c.end_date)::timestamp with time zone, (c.start_date)::timestamp with time zone)) AS duration_months
   FROM ((((contracts c
     LEFT JOIN customers cu ON ((c.customer_id = cu.id)))
     LEFT JOIN vehicles v ON ((c.vehicle_id = v.id)))
     LEFT JOIN profiles creator ON ((c.created_by = creator.user_id)))
     LEFT JOIN LATERAL ( SELECT count(*) AS total_invoices,
            COALESCE(sum(invoices.total_amount), (0)::numeric) AS total_amount,
            COALESCE(sum(
                CASE
                    WHEN (invoices.payment_status = 'paid'::text) THEN invoices.paid_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS paid_amount,
            COALESCE(sum(
                CASE
                    WHEN (invoices.payment_status <> 'paid'::text) THEN invoices.total_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS unpaid_amount,
            COALESCE(sum(
                CASE
                    WHEN ((invoices.payment_status <> 'paid'::text) AND (invoices.due_date < CURRENT_DATE)) THEN invoices.total_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS overdue_amount
           FROM invoices
          WHERE (invoices.contract_id = c.id)) invoice_stats ON (true));

-- index_maintenance_recommendations
DROP VIEW IF EXISTS public.index_maintenance_recommendations CASCADE;
CREATE VIEW public.index_maintenance_recommendations
WITH (security_invoker = true) AS
SELECT 'Unused indexes'::text AS recommendation_type,
    pg_stat_user_indexes.schemaname,
    pg_stat_user_indexes.relname AS tablename,
    pg_stat_user_indexes.indexrelname AS indexname,
    'Consider dropping this index if not needed'::text AS action,
    pg_stat_user_indexes.idx_scan AS usage_count
   FROM pg_stat_user_indexes
  WHERE ((pg_stat_user_indexes.schemaname = 'public'::name) AND (pg_stat_user_indexes.idx_scan = 0) AND (pg_stat_user_indexes.indexrelname !~~ '%_pkey'::text))
UNION ALL
 SELECT 'Heavily used indexes'::text AS recommendation_type,
    pg_stat_user_indexes.schemaname,
    pg_stat_user_indexes.relname AS tablename,
    pg_stat_user_indexes.indexrelname AS indexname,
    'Monitor for performance'::text AS action,
    pg_stat_user_indexes.idx_scan AS usage_count
   FROM pg_stat_user_indexes
  WHERE ((pg_stat_user_indexes.schemaname = 'public'::name) AND (pg_stat_user_indexes.idx_scan > 10000))
  ORDER BY 1, 6 DESC;

-- index_usage_stats
DROP VIEW IF EXISTS public.index_usage_stats CASCADE;
CREATE VIEW public.index_usage_stats
WITH (security_invoker = true) AS
SELECT schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
   FROM pg_stat_user_indexes
  WHERE ((schemaname = 'public'::name) AND (idx_scan > 0))
  ORDER BY idx_scan DESC;;
