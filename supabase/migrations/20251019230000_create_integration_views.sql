-- ============================================================================
-- Integration Views for Inventory, Sales, Purchase Orders, and Vendors
-- Created: 2025-10-19
-- Purpose: Enable seamless cross-module data access and reporting
-- ============================================================================

-- ============================================================================
-- 1. INVENTORY → PURCHASE ORDERS SUMMARY VIEW
-- ============================================================================
-- Shows items with pending/received PO quantities for reorder planning
CREATE OR REPLACE VIEW inventory_purchase_order_summary AS
SELECT
  i.id AS item_id,
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
  po.status AS po_status,
  COUNT(DISTINCT po.id) AS total_pos,
  SUM(poi.quantity) AS total_ordered_quantity,
  SUM(poi.received_quantity) AS total_received_quantity,
  SUM(poi.quantity - poi.received_quantity) AS pending_quantity,
  SUM(poi.total_price) AS total_po_value,
  MAX(po.order_date) AS last_po_date,
  MAX(po.expected_delivery_date) AS next_expected_delivery
FROM
  inventory_items i
  LEFT JOIN purchase_order_items poi ON i.item_code = poi.item_code
  LEFT JOIN purchase_orders po ON poi.purchase_order_id = po.id
WHERE
  i.is_active = true
  AND i.is_tracked = true
GROUP BY
  i.id, i.item_name, i.item_name_ar, i.item_code, i.sku,
  i.unit_of_measure, i.cost_price, i.unit_price,
  i.min_stock_level, i.reorder_point, i.reorder_quantity, po.status;

-- Add comment
COMMENT ON VIEW inventory_purchase_order_summary IS
'Comprehensive view of inventory items with their purchase order status and quantities';

-- ============================================================================
-- 2. SALES → INVENTORY AVAILABILITY VIEW
-- ============================================================================
-- Real-time stock availability for sales operations
CREATE OR REPLACE VIEW sales_inventory_availability AS
SELECT
  i.id AS item_id,
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
    WHEN sl.quantity_available > i.min_stock_level THEN 'available'
    WHEN sl.quantity_available > 0 THEN 'low_stock'
    ELSE 'out_of_stock'
  END AS stock_status,
  i.min_stock_level,
  i.reorder_point
FROM
  inventory_items i
  INNER JOIN inventory_stock_levels sl ON i.id = sl.item_id
  LEFT JOIN inventory_warehouses w ON sl.warehouse_id = w.id
  LEFT JOIN inventory_categories ic ON i.category_id = ic.id
WHERE
  i.is_active = true
  AND w.is_active = true
ORDER BY
  i.item_name, w.warehouse_name;

-- Add comment
COMMENT ON VIEW sales_inventory_availability IS
'Real-time inventory availability across all warehouses for sales order processing';

-- ============================================================================
-- 3. VENDOR → PURCHASE PERFORMANCE VIEW
-- ============================================================================
-- Vendor performance metrics aggregated from purchase orders
CREATE OR REPLACE VIEW vendor_purchase_performance AS
SELECT
  v.id AS vendor_id,
  v.company_id,
  v.vendor_name,
  v.vendor_name_ar,
  v.vendor_code,
  v.contact_person,
  v.email,
  v.phone,
  COUNT(DISTINCT po.id) AS total_orders,
  SUM(po.total_amount) AS total_purchase_value,
  AVG(po.total_amount) AS avg_order_value,
  COUNT(DISTINCT CASE WHEN po.status = 'received' THEN po.id END) AS completed_orders,
  COUNT(DISTINCT CASE WHEN po.status = 'cancelled' THEN po.id END) AS cancelled_orders,
  -- On-time delivery calculation
  COUNT(DISTINCT CASE
    WHEN po.delivery_date IS NOT NULL
      AND po.expected_delivery_date IS NOT NULL
      AND po.delivery_date <= po.expected_delivery_date
    THEN po.id
  END) AS on_time_deliveries,
  COUNT(DISTINCT CASE
    WHEN po.delivery_date IS NOT NULL
      AND po.expected_delivery_date IS NOT NULL
    THEN po.id
  END) AS total_deliveries,
  -- On-time delivery rate percentage
  CASE
    WHEN COUNT(DISTINCT CASE WHEN po.delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL THEN po.id END) > 0
    THEN ROUND(
      (COUNT(DISTINCT CASE WHEN po.delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL AND po.delivery_date <= po.expected_delivery_date THEN po.id END)::NUMERIC /
       COUNT(DISTINCT CASE WHEN po.delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL THEN po.id END)) * 100,
      2
    )
    ELSE 0
  END AS on_time_delivery_rate,
  -- Average delivery days
  ROUND(
    AVG(
      CASE
        WHEN po.delivery_date IS NOT NULL AND po.order_date IS NOT NULL
        THEN EXTRACT(DAY FROM (po.delivery_date::timestamp - po.order_date::timestamp))
        ELSE NULL
      END
    ),
    1
  ) AS avg_delivery_days,
  MIN(po.order_date) AS first_order_date,
  MAX(po.order_date) AS last_order_date,
  -- Active status
  CASE
    WHEN MAX(po.order_date) > NOW() - INTERVAL '6 months' THEN true
    ELSE false
  END AS is_active_vendor
FROM
  vendors v
  LEFT JOIN purchase_orders po ON v.id = po.vendor_id
WHERE
  v.is_active = true
GROUP BY
  v.id, v.company_id, v.vendor_name, v.vendor_name_ar, v.vendor_code,
  v.contact_person, v.email, v.phone
ORDER BY
  total_purchase_value DESC NULLS LAST;

-- Add comment
COMMENT ON VIEW vendor_purchase_performance IS
'Vendor performance metrics including on-time delivery, order volume, and delivery speed';

-- ============================================================================
-- 4. INVENTORY MOVEMENT SUMMARY VIEW
-- ============================================================================
-- Summarized inventory movements by type for analytics
CREATE OR REPLACE VIEW inventory_movement_summary AS
SELECT
  i.id AS item_id,
  i.company_id,
  i.item_name,
  i.item_name_ar,
  i.item_code,
  im.warehouse_id,
  w.warehouse_name,
  im.movement_type,
  COUNT(*) AS movement_count,
  SUM(im.quantity) AS total_quantity,
  SUM(ABS(im.quantity)) AS total_absolute_quantity,
  MIN(im.movement_date) AS first_movement_date,
  MAX(im.movement_date) AS last_movement_date,
  -- Value calculations (approximate based on current prices)
  SUM(
    CASE
      WHEN im.movement_type IN ('PURCHASE', 'RETURN') THEN ABS(im.quantity) * i.cost_price
      WHEN im.movement_type = 'SALE' THEN ABS(im.quantity) * i.unit_price
      ELSE 0
    END
  ) AS estimated_value
FROM
  inventory_items i
  INNER JOIN inventory_movements im ON i.id = im.item_id
  LEFT JOIN inventory_warehouses w ON im.warehouse_id = w.id
WHERE
  i.is_active = true
GROUP BY
  i.id, i.company_id, i.item_name, i.item_name_ar, i.item_code,
  im.warehouse_id, w.warehouse_name, im.movement_type
ORDER BY
  last_movement_date DESC;

-- Add comment
COMMENT ON VIEW inventory_movement_summary IS
'Aggregated inventory movements by item, warehouse, and movement type';

-- ============================================================================
-- 5. LOW STOCK ITEMS WITH VENDOR RECOMMENDATIONS VIEW
-- ============================================================================
-- Items below reorder point with suggested vendors
CREATE OR REPLACE VIEW inventory_reorder_recommendations AS
SELECT
  i.id AS item_id,
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
  -- Current stock across all warehouses
  COALESCE(SUM(sl.quantity_available), 0) AS total_available,
  COALESCE(SUM(sl.quantity_reserved), 0) AS total_reserved,
  COALESCE(SUM(sl.quantity_on_hand), 0) AS total_on_hand,
  -- Shortage calculation
  GREATEST(i.reorder_point - COALESCE(SUM(sl.quantity_available), 0), 0) AS shortage,
  -- Suggested order quantity
  GREATEST(
    COALESCE(i.reorder_quantity, i.min_stock_level, 10),
    i.reorder_point - COALESCE(SUM(sl.quantity_available), 0)
  ) AS suggested_order_quantity,
  -- Pending PO quantity
  COALESCE(
    (SELECT SUM(poi.quantity - poi.received_quantity)
     FROM purchase_order_items poi
     JOIN purchase_orders po ON poi.purchase_order_id = po.id
     WHERE poi.item_code = i.item_code
       AND po.status IN ('draft', 'pending_approval', 'approved', 'sent_to_vendor', 'partially_received')
    ), 0
  ) AS pending_po_quantity,
  -- Last PO vendor (as a suggestion)
  (SELECT v.id
   FROM purchase_order_items poi
   JOIN purchase_orders po ON poi.purchase_order_id = po.id
   JOIN vendors v ON po.vendor_id = v.id
   WHERE poi.item_code = i.item_code
   ORDER BY po.order_date DESC
   LIMIT 1
  ) AS last_vendor_id,
  (SELECT v.vendor_name
   FROM purchase_order_items poi
   JOIN purchase_orders po ON poi.purchase_order_id = po.id
   JOIN vendors v ON po.vendor_id = v.id
   WHERE poi.item_code = i.item_code
   ORDER BY po.order_date DESC
   LIMIT 1
  ) AS last_vendor_name
FROM
  inventory_items i
  LEFT JOIN inventory_stock_levels sl ON i.id = sl.item_id
WHERE
  i.is_active = true
  AND i.is_tracked = true
  AND i.reorder_point IS NOT NULL
GROUP BY
  i.id, i.company_id, i.item_name, i.item_name_ar, i.item_code, i.sku,
  i.unit_of_measure, i.cost_price, i.unit_price,
  i.min_stock_level, i.reorder_point, i.reorder_quantity
HAVING
  COALESCE(SUM(sl.quantity_available), 0) <= i.reorder_point
ORDER BY
  shortage DESC, i.item_name;

-- Add comment
COMMENT ON VIEW inventory_reorder_recommendations IS
'Items requiring reorder with suggested quantities and preferred vendors';

-- ============================================================================
-- 6. SALES ORDER FULFILLMENT STATUS VIEW
-- ============================================================================
-- Sales orders with inventory availability status
CREATE OR REPLACE VIEW sales_order_fulfillment_status AS
SELECT
  so.id AS order_id,
  so.company_id,
  so.order_number,
  so.order_date,
  so.delivery_date,
  so.status,
  so.customer_id,
  so.total AS order_total,
  so.notes,
  -- Extract items from JSONB
  jsonb_array_length(so.items) AS total_items,
  -- Fulfillment status placeholder
  CASE
    WHEN so.status = 'shipped' OR so.status = 'delivered' THEN 'fulfilled'
    WHEN so.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END AS fulfillment_status
FROM
  sales_orders so
WHERE
  so.is_active = true
ORDER BY
  so.order_date DESC;

-- Add comment
COMMENT ON VIEW sales_order_fulfillment_status IS
'Sales orders with fulfillment and inventory allocation status';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Grant SELECT on all views to authenticated users
GRANT SELECT ON inventory_purchase_order_summary TO authenticated;
GRANT SELECT ON sales_inventory_availability TO authenticated;
GRANT SELECT ON vendor_purchase_performance TO authenticated;
GRANT SELECT ON inventory_movement_summary TO authenticated;
GRANT SELECT ON inventory_reorder_recommendations TO authenticated;
GRANT SELECT ON sales_order_fulfillment_status TO authenticated;

-- ============================================================================
-- Helper function: Allocate inventory stock
-- ============================================================================
-- Used by sales order integration to allocate inventory

CREATE OR REPLACE FUNCTION allocate_inventory_stock(
  p_item_id UUID,
  p_warehouse_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- Get current available quantity
  SELECT quantity_available INTO v_available
  FROM inventory_stock_levels
  WHERE item_id = p_item_id
    AND warehouse_id = p_warehouse_id;

  -- Check if enough stock available
  IF v_available IS NULL OR v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock available for allocation';
  END IF;

  -- Update stock levels (increase reserved, decrease available automatically via generated column)
  UPDATE inventory_stock_levels
  SET
    quantity_reserved = quantity_reserved + p_quantity,
    updated_at = NOW()
  WHERE item_id = p_item_id
    AND warehouse_id = p_warehouse_id;

  RETURN TRUE;
END;
$$;

-- Add comment
COMMENT ON FUNCTION allocate_inventory_stock IS
'Allocates inventory stock for sales orders (increases reserved, decreases available automatically)';

-- ============================================================================
-- Helper function: Deallocate inventory stock
-- ============================================================================
-- Used when sales orders are cancelled

CREATE OR REPLACE FUNCTION deallocate_inventory_stock(
  p_item_id UUID,
  p_warehouse_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update stock levels (decrease reserved, increase available automatically via generated column)
  UPDATE inventory_stock_levels
  SET
    quantity_reserved = GREATEST(quantity_reserved - p_quantity, 0),
    updated_at = NOW()
  WHERE item_id = p_item_id
    AND warehouse_id = p_warehouse_id;

  RETURN TRUE;
END;
$$;

-- Add comment
COMMENT ON FUNCTION deallocate_inventory_stock IS
'Deallocates inventory stock when sales orders are cancelled (decreases reserved, increases available automatically)';

-- ============================================================================
-- Indexes for better view performance
-- ============================================================================

-- Index on purchase_order_items for faster item_code lookups
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_code
ON purchase_order_items(item_code) WHERE item_code IS NOT NULL;

-- Index on purchase_orders status for filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
ON purchase_orders(status, company_id);

-- Index on inventory_movements for summary queries
CREATE INDEX IF NOT EXISTS idx_inventory_movements_summary
ON inventory_movements(item_id, warehouse_id, movement_type, movement_date);

-- ============================================================================
-- End of integration views migration
-- ============================================================================
