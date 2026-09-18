-- Batch 6: Remove SECURITY DEFINER from 11 additional views

-- 1. inventory_low_stock_items
CREATE OR REPLACE VIEW public.inventory_low_stock_items AS
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

-- 2. inventory_pending_purchase_orders
CREATE OR REPLACE VIEW public.inventory_pending_purchase_orders AS
SELECT po.id,
    po.company_id,
    po.order_number,
    po.supplier_id,
    po.status,
    po.order_date,
    po.expected_delivery_date,
    po.actual_delivery_date,
    po.total_amount,
    po.currency,
    po.payment_terms,
    po.delivery_address,
    po.internal_reference,
    po.notes,
    po.created_by,
    po.approved_by,
    po.approved_at,
    po.sent_at,
    po.confirmed_at,
    po.created_at,
    po.updated_at,
    s.company_name AS supplier_name,
    s.contact_person,
    s.email,
    count(poi.item_id) AS item_count,
    sum(poi.quantity) AS total_quantity
   FROM ((inventory_purchase_orders po
     JOIN inventory_suppliers s ON ((po.supplier_id = s.id)))
     LEFT JOIN inventory_purchase_order_items poi ON ((po.id = poi.order_id)))
  WHERE ((po.status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SENT'::character varying, 'CONFIRMED'::character varying])::text[]))
  GROUP BY po.id, s.company_name, s.contact_person, s.email
  ORDER BY po.expected_delivery_date;

-- 3. inventory_stock_alerts
CREATE OR REPLACE VIEW public.inventory_stock_alerts AS
SELECT i.id AS item_id,
    i.company_id,
    i.item_name,
    i.item_code,
    i.sku,
    c.category_name,
    w.id AS warehouse_id,
    w.warehouse_name,
    sl.quantity_on_hand,
    sl.quantity_reserved,
    sl.quantity_available,
    i.min_stock_level,
    i.max_stock_level,
    i.reorder_point,
    i.reorder_quantity,
        CASE
            WHEN (sl.quantity_available = (0)::numeric) THEN 'نفذ المخزون'::text
            WHEN (sl.quantity_available < (i.min_stock_level)::numeric) THEN 'أقل من الحد الأدنى'::text
            WHEN ((i.reorder_point IS NOT NULL) AND (sl.quantity_available <= (i.reorder_point)::numeric)) THEN 'نقطة إعادة الطلب'::text
            WHEN ((i.max_stock_level IS NOT NULL) AND (sl.quantity_on_hand > (i.max_stock_level)::numeric)) THEN 'تخزين زائد'::text
            ELSE 'طبيعي'::text
        END AS alert_type,
        CASE
            WHEN (sl.quantity_available = (0)::numeric) THEN 1
            WHEN (sl.quantity_available < (i.min_stock_level)::numeric) THEN 2
            WHEN ((i.reorder_point IS NOT NULL) AND (sl.quantity_available <= (i.reorder_point)::numeric)) THEN 3
            WHEN ((i.max_stock_level IS NOT NULL) AND (sl.quantity_on_hand > (i.max_stock_level)::numeric)) THEN 4
            ELSE 5
        END AS alert_priority,
    ((i.min_stock_level)::numeric - sl.quantity_available) AS shortage_quantity,
        CASE
            WHEN (i.reorder_quantity IS NOT NULL) THEN i.reorder_quantity
            WHEN (i.min_stock_level > 0) THEN (i.min_stock_level * 2)
            ELSE 10
        END AS suggested_order_quantity,
    sl.last_movement_at
   FROM (((inventory_items i
     JOIN inventory_stock_levels sl ON ((i.id = sl.item_id)))
     JOIN inventory_warehouses w ON ((sl.warehouse_id = w.id)))
     LEFT JOIN inventory_categories c ON ((i.category_id = c.id)))
  WHERE ((i.is_active = true) AND (i.is_tracked = true) AND ((sl.quantity_available = (0)::numeric) OR (sl.quantity_available < (i.min_stock_level)::numeric) OR ((i.reorder_point IS NOT NULL) AND (sl.quantity_available <= (i.reorder_point)::numeric)) OR ((i.max_stock_level IS NOT NULL) AND (sl.quantity_on_hand > (i.max_stock_level)::numeric))))
  ORDER BY
        CASE
            WHEN (sl.quantity_available = (0)::numeric) THEN 1
            WHEN (sl.quantity_available < (i.min_stock_level)::numeric) THEN 2
            WHEN ((i.reorder_point IS NOT NULL) AND (sl.quantity_available <= (i.reorder_point)::numeric)) THEN 3
            WHEN ((i.max_stock_level IS NOT NULL) AND (sl.quantity_on_hand > (i.max_stock_level)::numeric)) THEN 4
            ELSE 5
        END, ((i.min_stock_level)::numeric - sl.quantity_available) DESC;

-- 4. inventory_transfer_summary
CREATE OR REPLACE VIEW public.inventory_transfer_summary AS
SELECT t.company_id,
    t.from_warehouse_id,
    fw.warehouse_name AS from_warehouse_name,
    t.to_warehouse_id,
    tw.warehouse_name AS to_warehouse_name,
    t.status,
    count(*) AS transfer_count,
    sum(COALESCE(ti.quantity_requested, (0)::numeric)) AS total_quantity_requested,
    sum(COALESCE(ti.quantity_shipped, (0)::numeric)) AS total_quantity_shipped,
    sum(COALESCE(ti.quantity_received, (0)::numeric)) AS total_quantity_received,
    t.transfer_date
   FROM (((inventory_warehouse_transfers t
     LEFT JOIN inventory_warehouse_transfer_items ti ON ((t.id = ti.transfer_id)))
     LEFT JOIN inventory_warehouses fw ON ((t.from_warehouse_id = fw.id)))
     LEFT JOIN inventory_warehouses tw ON ((t.to_warehouse_id = tw.id)))
  GROUP BY t.company_id, t.from_warehouse_id, fw.warehouse_name, t.to_warehouse_id, tw.warehouse_name, t.status, t.transfer_date
  ORDER BY t.transfer_date DESC;

-- 5. inventory_turnover_analysis
CREATE OR REPLACE VIEW public.inventory_turnover_analysis AS
WITH movement_stats AS (
         SELECT inventory_movements.item_id,
            inventory_movements.warehouse_id,
            count(*) AS total_movements,
            sum(
                CASE
                    WHEN ((inventory_movements.movement_type)::text = 'SALE'::text) THEN abs(inventory_movements.quantity)
                    ELSE (0)::numeric
                END) AS total_sales_quantity,
            sum(
                CASE
                    WHEN ((inventory_movements.movement_type)::text = 'PURCHASE'::text) THEN abs(inventory_movements.quantity)
                    ELSE (0)::numeric
                END) AS total_purchase_quantity,
            min(inventory_movements.movement_date) AS first_movement_date,
            max(inventory_movements.movement_date) AS last_movement_date,
            EXTRACT(day FROM (max(inventory_movements.movement_date) - min(inventory_movements.movement_date))) AS days_active
           FROM inventory_movements
          WHERE (inventory_movements.movement_date >= (now() - '90 days'::interval))
          GROUP BY inventory_movements.item_id, inventory_movements.warehouse_id
        )
SELECT i.id AS item_id,
    i.company_id,
    i.item_name,
    i.item_code,
    i.sku,
    c.category_name,
    w.id AS warehouse_id,
    w.warehouse_name,
    sl.quantity_on_hand AS current_stock,
    sl.quantity_available,
    COALESCE(ms.total_movements, (0)::bigint) AS movements_last_90_days,
    COALESCE(ms.total_sales_quantity, (0)::numeric) AS sales_quantity_last_90_days,
    COALESCE(ms.total_purchase_quantity, (0)::numeric) AS purchase_quantity_last_90_days,
        CASE
            WHEN ((COALESCE(ms.days_active, (0)::numeric) > (0)::numeric) AND (sl.quantity_on_hand > (0)::numeric)) THEN round(((COALESCE(ms.total_sales_quantity, (0)::numeric) / NULLIF(sl.quantity_on_hand, (0)::numeric)) * (90.0 / NULLIF(ms.days_active, (1)::numeric))), 2)
            ELSE (0)::numeric
        END AS turnover_ratio,
        CASE
            WHEN (COALESCE(ms.total_movements, (0)::bigint) = 0) THEN 'لا توجد حركة'::text
            WHEN (COALESCE(ms.total_sales_quantity, (0)::numeric) > (sl.quantity_on_hand * (3)::numeric)) THEN 'سريع الحركة'::text
            WHEN (COALESCE(ms.total_sales_quantity, (0)::numeric) > sl.quantity_on_hand) THEN 'متوسط الحركة'::text
            ELSE 'بطيء الحركة'::text
        END AS turnover_category,
    ms.first_movement_date,
    ms.last_movement_date
   FROM ((((inventory_items i
     JOIN inventory_stock_levels sl ON ((i.id = sl.item_id)))
     JOIN inventory_warehouses w ON ((sl.warehouse_id = w.id)))
     LEFT JOIN inventory_categories c ON ((i.category_id = c.id)))
     LEFT JOIN movement_stats ms ON (((i.id = ms.item_id) AND (sl.warehouse_id = ms.warehouse_id))))
  WHERE ((i.is_active = true) AND (i.is_tracked = true))
  ORDER BY
        CASE
            WHEN ((COALESCE(ms.days_active, (0)::numeric) > (0)::numeric) AND (sl.quantity_on_hand > (0)::numeric)) THEN round(((COALESCE(ms.total_sales_quantity, (0)::numeric) / NULLIF(sl.quantity_on_hand, (0)::numeric)) * (90.0 / NULLIF(ms.days_active, (1)::numeric))), 2)
            ELSE (0)::numeric
        END DESC;

-- 6. maintenance_cost_summary
CREATE OR REPLACE VIEW public.maintenance_cost_summary AS
SELECT vm.company_id,
    vm.vehicle_id,
    v.make,
    v.model,
    v.plate_number,
    count(*) AS total_maintenance_count,
    count(*) FILTER (WHERE (vm.status = 'completed'::maintenance_status)) AS completed_maintenance_count,
    COALESCE(sum(vm.actual_cost), (0)::numeric) AS total_maintenance_cost,
    COALESCE(sum(vm.tax_amount), (0)::numeric) AS total_tax_amount,
    COALESCE(sum((vm.actual_cost + COALESCE(vm.tax_amount, (0)::numeric))), (0)::numeric) AS total_cost_with_tax,
    COALESCE(avg(vm.actual_cost), (0)::numeric) AS average_maintenance_cost,
    max(vm.completed_date) AS last_maintenance_date
   FROM (vehicle_maintenance vm
     JOIN vehicles v ON ((vm.vehicle_id = v.id)))
  WHERE (vm.status = 'completed'::maintenance_status)
  GROUP BY vm.company_id, vm.vehicle_id, v.make, v.model, v.plate_number;

-- 7. overdue_payment_promises
CREATE OR REPLACE VIEW public.overdue_payment_promises AS
SELECT pp.id,
    pp.company_id,
    pp.customer_id,
    pp.invoice_id,
    pp.promise_date,
    pp.promised_amount,
    pp.actual_paid_amount,
    pp.actual_paid_date,
    pp.status,
    pp.contact_method,
    pp.notes,
    pp.created_by,
    pp.created_at,
    pp.updated_at,
    COALESCE(((c.first_name || ' '::text) || c.last_name), c.first_name, c.last_name, ''::text) AS customer_name,
    i.invoice_number,
    i.total_amount AS invoice_amount,
    (CURRENT_DATE - pp.promise_date) AS days_overdue
   FROM ((payment_promises pp
     LEFT JOIN customers c ON ((pp.customer_id = c.id)))
     LEFT JOIN invoices i ON ((pp.invoice_id = i.id)))
  WHERE ((pp.status = 'pending'::text) AND (pp.promise_date < CURRENT_DATE));

-- 8. payment_timeline_invoices
CREATE OR REPLACE VIEW public.payment_timeline_invoices AS
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

-- 9. sales_inventory_availability
CREATE OR REPLACE VIEW public.sales_inventory_availability AS
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

-- 10. sales_order_fulfillment_status
CREATE OR REPLACE VIEW public.sales_order_fulfillment_status AS
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

-- 11. table_size_stats
CREATE OR REPLACE VIEW public.table_size_stats AS
SELECT schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass)) AS total_size,
    pg_size_pretty(pg_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass)) AS table_size,
    pg_size_pretty((pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass) - pg_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass))) AS index_size
   FROM pg_tables
  WHERE (schemaname = 'public'::name)
  ORDER BY (pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass)) DESC;;
