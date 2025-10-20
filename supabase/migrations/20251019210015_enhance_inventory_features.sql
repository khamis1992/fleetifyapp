-- ============================================================================
-- Inventory Module Enhancement - Phase 7B
-- Created: 2025-10-19 21:00:15
-- Description: Performance indexes, stored procedures, and analytical views
-- ============================================================================

-- ============================================================================
-- 1. PERFORMANCE INDEXES
-- ============================================================================

-- Indexes on inventory_movements for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_date
  ON inventory_movements(item_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_date
  ON inventory_movements(warehouse_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_date
  ON inventory_movements(company_id, movement_date DESC);

-- Composite index for stock level queries
CREATE INDEX IF NOT EXISTS idx_inventory_stock_levels_item_warehouse
  ON inventory_stock_levels(item_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_levels_company_item
  ON inventory_stock_levels(company_id, item_id);

-- ============================================================================
-- 2. INVENTORY VALUATION STORED PROCEDURE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_inventory_valuation(
  p_company_id UUID,
  p_warehouse_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  warehouse_id UUID,
  warehouse_name VARCHAR,
  category_id UUID,
  category_name VARCHAR,
  total_items BIGINT,
  total_quantity NUMERIC,
  total_cost_value NUMERIC,
  total_selling_value NUMERIC,
  potential_profit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id as warehouse_id,
    w.warehouse_name,
    c.id as category_id,
    COALESCE(c.category_name, 'غير مصنف') as category_name,
    COUNT(DISTINCT i.id) as total_items,
    SUM(sl.quantity_on_hand) as total_quantity,
    SUM(sl.quantity_on_hand * i.cost_price) as total_cost_value,
    SUM(sl.quantity_on_hand * i.unit_price) as total_selling_value,
    SUM(sl.quantity_on_hand * (i.unit_price - i.cost_price)) as potential_profit
  FROM inventory_items i
  INNER JOIN inventory_stock_levels sl ON i.id = sl.item_id
  INNER JOIN inventory_warehouses w ON sl.warehouse_id = w.id
  LEFT JOIN inventory_categories c ON i.category_id = c.id
  WHERE i.company_id = p_company_id
    AND i.is_active = true
    AND (p_warehouse_id IS NULL OR w.id = p_warehouse_id)
    AND (p_category_id IS NULL OR i.category_id = p_category_id)
  GROUP BY w.id, w.warehouse_name, c.id, c.category_name
  ORDER BY total_cost_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_inventory_valuation TO authenticated;

-- ============================================================================
-- 3. INVENTORY AGING ANALYSIS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW inventory_aging_analysis AS
SELECT
  i.id as item_id,
  i.company_id,
  i.item_name,
  i.item_code,
  i.sku,
  c.category_name,
  w.id as warehouse_id,
  w.warehouse_name,
  sl.quantity_on_hand,
  sl.quantity_available,
  sl.last_movement_at,
  CASE
    WHEN sl.last_movement_at IS NULL THEN 999
    ELSE EXTRACT(DAY FROM (NOW() - sl.last_movement_at))
  END as days_since_last_movement,
  CASE
    WHEN sl.last_movement_at IS NULL THEN 'لا توجد حركة'
    WHEN EXTRACT(DAY FROM (NOW() - sl.last_movement_at)) > 180 THEN 'راكد جداً (>180 يوم)'
    WHEN EXTRACT(DAY FROM (NOW() - sl.last_movement_at)) > 90 THEN 'راكد (>90 يوم)'
    WHEN EXTRACT(DAY FROM (NOW() - sl.last_movement_at)) > 30 THEN 'بطيء الحركة (>30 يوم)'
    ELSE 'نشط (<30 يوم)'
  END as aging_category,
  (sl.quantity_on_hand * i.cost_price) as tied_up_value
FROM inventory_items i
JOIN inventory_stock_levels sl ON i.id = sl.item_id
JOIN inventory_warehouses w ON sl.warehouse_id = w.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
WHERE i.is_active = true
  AND i.is_tracked = true
  AND sl.quantity_on_hand > 0
ORDER BY days_since_last_movement DESC, tied_up_value DESC;

-- ============================================================================
-- 4. INVENTORY TURNOVER ANALYSIS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW inventory_turnover_analysis AS
WITH movement_stats AS (
  SELECT
    item_id,
    warehouse_id,
    COUNT(*) as total_movements,
    SUM(CASE WHEN movement_type = 'SALE' THEN ABS(quantity) ELSE 0 END) as total_sales_quantity,
    SUM(CASE WHEN movement_type = 'PURCHASE' THEN ABS(quantity) ELSE 0 END) as total_purchase_quantity,
    MIN(movement_date) as first_movement_date,
    MAX(movement_date) as last_movement_date,
    EXTRACT(DAY FROM (MAX(movement_date) - MIN(movement_date))) as days_active
  FROM inventory_movements
  WHERE movement_date >= NOW() - INTERVAL '90 days'
  GROUP BY item_id, warehouse_id
)
SELECT
  i.id as item_id,
  i.company_id,
  i.item_name,
  i.item_code,
  i.sku,
  c.category_name,
  w.id as warehouse_id,
  w.warehouse_name,
  sl.quantity_on_hand as current_stock,
  sl.quantity_available,
  COALESCE(ms.total_movements, 0) as movements_last_90_days,
  COALESCE(ms.total_sales_quantity, 0) as sales_quantity_last_90_days,
  COALESCE(ms.total_purchase_quantity, 0) as purchase_quantity_last_90_days,
  CASE
    WHEN COALESCE(ms.days_active, 0) > 0 AND sl.quantity_on_hand > 0 THEN
      ROUND((COALESCE(ms.total_sales_quantity, 0) / NULLIF(sl.quantity_on_hand, 0)) * (90.0 / NULLIF(ms.days_active, 1)), 2)
    ELSE 0
  END as turnover_ratio,
  CASE
    WHEN COALESCE(ms.total_movements, 0) = 0 THEN 'لا توجد حركة'
    WHEN COALESCE(ms.total_sales_quantity, 0) > sl.quantity_on_hand * 3 THEN 'سريع الحركة'
    WHEN COALESCE(ms.total_sales_quantity, 0) > sl.quantity_on_hand THEN 'متوسط الحركة'
    ELSE 'بطيء الحركة'
  END as turnover_category,
  ms.first_movement_date,
  ms.last_movement_date
FROM inventory_items i
JOIN inventory_stock_levels sl ON i.id = sl.item_id
JOIN inventory_warehouses w ON sl.warehouse_id = w.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
LEFT JOIN movement_stats ms ON i.id = ms.item_id AND sl.warehouse_id = ms.warehouse_id
WHERE i.is_active = true
  AND i.is_tracked = true
ORDER BY turnover_ratio DESC;

-- ============================================================================
-- 5. STOCK LEVEL ALERTS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW inventory_stock_alerts AS
SELECT
  i.id as item_id,
  i.company_id,
  i.item_name,
  i.item_code,
  i.sku,
  c.category_name,
  w.id as warehouse_id,
  w.warehouse_name,
  sl.quantity_on_hand,
  sl.quantity_reserved,
  sl.quantity_available,
  i.min_stock_level,
  i.max_stock_level,
  i.reorder_point,
  i.reorder_quantity,
  CASE
    WHEN sl.quantity_available = 0 THEN 'نفذ المخزون'
    WHEN sl.quantity_available < i.min_stock_level THEN 'أقل من الحد الأدنى'
    WHEN i.reorder_point IS NOT NULL AND sl.quantity_available <= i.reorder_point THEN 'نقطة إعادة الطلب'
    WHEN i.max_stock_level IS NOT NULL AND sl.quantity_on_hand > i.max_stock_level THEN 'تخزين زائد'
    ELSE 'طبيعي'
  END as alert_type,
  CASE
    WHEN sl.quantity_available = 0 THEN 1
    WHEN sl.quantity_available < i.min_stock_level THEN 2
    WHEN i.reorder_point IS NOT NULL AND sl.quantity_available <= i.reorder_point THEN 3
    WHEN i.max_stock_level IS NOT NULL AND sl.quantity_on_hand > i.max_stock_level THEN 4
    ELSE 5
  END as alert_priority,
  (i.min_stock_level - sl.quantity_available) as shortage_quantity,
  CASE
    WHEN i.reorder_quantity IS NOT NULL THEN i.reorder_quantity
    WHEN i.min_stock_level > 0 THEN i.min_stock_level * 2
    ELSE 10
  END as suggested_order_quantity,
  sl.last_movement_at
FROM inventory_items i
JOIN inventory_stock_levels sl ON i.id = sl.item_id
JOIN inventory_warehouses w ON sl.warehouse_id = w.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
WHERE i.is_active = true
  AND i.is_tracked = true
  AND (
    sl.quantity_available = 0 OR
    sl.quantity_available < i.min_stock_level OR
    (i.reorder_point IS NOT NULL AND sl.quantity_available <= i.reorder_point) OR
    (i.max_stock_level IS NOT NULL AND sl.quantity_on_hand > i.max_stock_level)
  )
ORDER BY alert_priority ASC, shortage_quantity DESC;

-- ============================================================================
-- 6. HELPER FUNCTION: GET ITEM MOVEMENT HISTORY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_item_movement_summary(
  p_item_id UUID,
  p_warehouse_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  movement_type VARCHAR,
  total_quantity NUMERIC,
  movement_count BIGINT,
  avg_quantity NUMERIC,
  total_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    im.movement_type,
    SUM(ABS(im.quantity)) as total_quantity,
    COUNT(*) as movement_count,
    AVG(ABS(im.quantity)) as avg_quantity,
    SUM(COALESCE(im.total_cost, 0)) as total_cost
  FROM inventory_movements im
  WHERE im.item_id = p_item_id
    AND (p_warehouse_id IS NULL OR im.warehouse_id = p_warehouse_id)
    AND im.movement_date >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY im.movement_type
  ORDER BY total_quantity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_item_movement_summary TO authenticated;

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION calculate_inventory_valuation IS 'Phase 7B: Calculate inventory valuation by warehouse and category';
COMMENT ON VIEW inventory_aging_analysis IS 'Phase 7B: Analyze inventory aging by days since last movement';
COMMENT ON VIEW inventory_turnover_analysis IS 'Phase 7B: Analyze inventory turnover rates and movement frequency';
COMMENT ON VIEW inventory_stock_alerts IS 'Phase 7B: Comprehensive stock level alerts for all items';
COMMENT ON FUNCTION get_item_movement_summary IS 'Phase 7B: Get movement summary for specific item';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
