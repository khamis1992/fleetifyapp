-- ============================================================================
-- Inventory Reporting System - Phase 7B+
-- Created: 2025-11-20
-- Description: Comprehensive inventory reporting and analytics
-- ============================================================================

-- ============================================================================
-- 1. INVENTORY REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  parameters JSONB,
  data JSONB NOT NULL,
  summary JSONB,
  file_url TEXT,
  file_size BIGINT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_report_type CHECK (
    report_type IN (
      'STOCK_VALUATION', 'STOCK_MOVEMENTS', 'AGING_ANALYSIS', 'TURNOVER_ANALYSIS',
      'LOW_STOCK_ALERTS', 'EXCESS_STOCK', 'WAREHOUSE_PERFORMANCE', 'SUPPLIER_PERFORMANCE',
      'DEMAND_FORECAST', 'INVENTORY_OPTIMIZATION', 'PURCHASE_ORDER_SUMMARY', 'ABC_ANALYSIS'
    )
  )
);

-- ============================================================================
-- 2. SCHEDULED REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  schedule JSONB NOT NULL, -- {frequency: 'DAILY|WEEKLY|MONTHLY', time: '09:00', recipients: ['email1', 'email2']}
  parameters JSONB,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_run_counts CHECK (success_count + error_count <= run_count),
  CONSTRAINT check_schedule_format CHECK (
    jsonb_typeof(schedule->'frequency') = 'string' AND
    jsonb_typeof(schedule->'time') = 'string' AND
    jsonb_typeof(schedule->'recipients') = 'array'
  )
);

-- ============================================================================
-- 3. INVENTORY SNAPSHOTS TABLE (for historical reporting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_on_hand DECIMAL(15, 3) NOT NULL,
  quantity_reserved DECIMAL(15, 3) DEFAULT 0,
  unit_cost DECIMAL(15, 3) NOT NULL,
  unit_price DECIMAL(15, 3) NOT NULL,
  total_cost_value DECIMAL(15, 3) GENERATED ALWAYS AS (quantity_on_hand * unit_cost) STORED,
  total_selling_value DECIMAL(15, 3) GENERATED ALWAYS AS (quantity_on_hand * unit_price) STORED,
  days_of_supply INTEGER,
  turnover_rate DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_snapshot_date UNIQUE(snapshot_date, warehouse_id, item_id)
);

-- ============================================================================
-- 4. REPORT TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(100) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL, -- Column definitions, formatting, etc.
  filters JSONB, -- Default filters
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_template_name_per_company UNIQUE(company_id, template_name)
);

-- ============================================================================
-- 5. DASHBOARD WIDGETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  widget_name VARCHAR(255) NOT NULL,
  widget_type VARCHAR(100) NOT NULL,
  data_source JSONB NOT NULL, -- SQL query or API endpoint
  visualization_config JSONB NOT NULL, -- Chart type, colors, etc.
  position JSONB, -- {x: 0, y: 0, w: 4, h: 3}
  refresh_interval INTEGER DEFAULT 300, -- Seconds
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. ALERT RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(100) NOT NULL, -- STOCK_LEVEL, MOVEMENT, QUALITY, PERFORMANCE
  trigger_conditions JSONB NOT NULL, -- Complex trigger logic
  alert_config JSONB NOT NULL, -- Email, SMS, dashboard notification
  severity VARCHAR(50) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. ALERT HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES inventory_alert_rules(id) ON DELETE SET NULL,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  context JSONB, -- Additional data about the alert
  recipients TEXT[], -- Email addresses, user IDs
  status VARCHAR(50) DEFAULT 'NEW' CHECK (status IN ('NEW', 'SENT', 'ACKNOWLEDGED', 'RESOLVED')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. TRIGGERS FOR AUTOMATIC SNAPSHOTS
-- ============================================================================

-- Function to create daily inventory snapshots
CREATE OR REPLACE FUNCTION create_inventory_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- This function would be called by a scheduled job
  -- to create daily snapshots of inventory levels
  INSERT INTO inventory_snapshots (
    company_id, snapshot_date, warehouse_id, item_id,
    quantity_on_hand, quantity_reserved, unit_cost, unit_price
  )
  SELECT
    i.company_id,
    CURRENT_DATE - INTERVAL '1 day', -- Yesterday's snapshot
    sl.warehouse_id,
    sl.item_id,
    sl.quantity_on_hand,
    sl.quantity_reserved,
    i.cost_price,
    i.unit_price
  FROM inventory_items i
  JOIN inventory_stock_levels sl ON i.id = sl.item_id
  WHERE i.company_id = NEW.company_id
    AND i.is_active = true
  ON CONFLICT (snapshot_date, warehouse_id, item_id) DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand,
    quantity_reserved = EXCLUDED.quantity_reserved,
    unit_cost = EXCLUDED.unit_cost,
    unit_price = EXCLUDED.unit_price;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. STORED PROCEDURES FOR REPORTING
-- ============================================================================

-- Get inventory overview metrics
CREATE OR REPLACE FUNCTION get_inventory_overview_metrics(
  p_company_id UUID,
  p_warehouse_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_items BIGINT,
  total_value DECIMAL,
  low_stock_items BIGINT,
  out_of_stock_items BIGINT,
  excess_stock_items BIGINT,
  turnover_rate DECIMAL,
  accuracy_rate DECIMAL,
  fulfillment_rate DECIMAL,
  holding_cost DECIMAL,
  stockout_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH item_metrics AS (
    SELECT
      COUNT(DISTINCT i.id) as total_items,
      COALESCE(SUM(sl.quantity_on_hand * i.cost_price), 0) as total_value,
      COUNT(DISTINCT CASE WHEN sl.quantity_available < i.min_stock_level THEN i.id END) as low_stock_items,
      COUNT(DISTINCT CASE WHEN sl.quantity_available = 0 THEN i.id END) as out_of_stock_items,
      COUNT(DISTINCT CASE WHEN sl.quantity_on_hand > (i.max_stock_level * 1.5) THEN i.id END) as excess_stock_items
    FROM inventory_items i
    JOIN inventory_stock_levels sl ON i.id = sl.item_id
    WHERE i.company_id = p_company_id
      AND i.is_active = true
      AND (p_warehouse_id IS NULL OR sl.warehouse_id = p_warehouse_id)
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
  ),
  turnover_metrics AS (
    SELECT
      CASE
        WHEN SUM(sl.quantity_on_hand * i.cost_price) > 0 THEN
          (COALESCE(SUM(CASE WHEN im.movement_type = 'SALE' THEN ABS(im.quantity) ELSE 0 END), 0) * i.unit_price) /
          SUM(sl.quantity_on_hand * i.cost_price)
        ELSE 0
      END as turnover_rate
    FROM inventory_items i
    JOIN inventory_stock_levels sl ON i.id = sl.item_id
    LEFT JOIN inventory_movements im ON i.id = im.item_id
      AND im.movement_date >= CURRENT_DATE - INTERVAL '90 days'
    WHERE i.company_id = p_company_id
      AND i.is_active = true
      AND (p_warehouse_id IS NULL OR sl.warehouse_id = p_warehouse_id)
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
  )
  SELECT
    im.total_items,
    im.total_value,
    im.low_stock_items,
    im.out_of_stock_items,
    im.excess_stock_items,
    COALESCE(tm.turnover_rate, 0) as turnover_rate,
    95.0 as accuracy_rate, -- Placeholder - would calculate from cycle counts
    98.5 as fulfillment_rate, -- Placeholder - would calculate from order fulfillment
    im.total_value * 0.25 as holding_cost, -- Assuming 25% annual holding cost
    im.total_value * 0.02 as stockout_cost -- Estimated stockout cost
  FROM item_metrics im
  CROSS JOIN turnover_metrics tm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get warehouse performance metrics
CREATE OR REPLACE FUNCTION get_warehouse_performance_metrics(p_company_id UUID)
RETURNS TABLE (
  warehouse_id UUID,
  warehouse_name VARCHAR,
  total_items BIGINT,
  total_value DECIMAL,
  utilization_rate DECIMAL,
  accuracy_rate DECIMAL,
  average_days_of_supply DECIMAL,
  movement_count BIGINT,
  last_count_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id as warehouse_id,
    w.warehouse_name,
    COUNT(DISTINCT sl.item_id) as total_items,
    COALESCE(SUM(sl.quantity_on_hand * i.cost_price), 0) as total_value,
    CASE
      WHEN w.capacity > 0 THEN (SUM(sl.quantity_on_hand * i.volume)::DECIMAL / w.capacity) * 100
      ELSE 0
    END as utilization_rate,
    95.0 as accuracy_rate, -- Placeholder
    COALESCE(AVG(sl.quantity_on_hand / NULLIF(daily_avg.daily_usage, 0)), 0) as average_days_of_supply,
    COUNT(DISTINCT im.id) as movement_count,
    MAX(st.created_at) as last_count_date
  FROM inventory_warehouses w
  LEFT JOIN inventory_stock_levels sl ON w.id = sl.warehouse_id
  LEFT JOIN inventory_items i ON sl.item_id = i.id
  LEFT JOIN inventory_movements im ON sl.item_id = im.item_id AND sl.warehouse_id = im.warehouse_id
    AND im.movement_date >= CURRENT_DATE - INTERVAL '30 days'
  LEFT JOIN inventory_stock_takes st ON w.id = st.warehouse_id AND st.status = 'COMPLETED'
  LEFT JOIN LATERAL (
    SELECT AVG(quantity) as daily_usage
    FROM inventory_movements im2
    WHERE im2.item_id = sl.item_id
      AND im2.movement_type = 'SALE'
      AND im2.movement_date >= CURRENT_DATE - INTERVAL '90 days'
  ) daily_avg ON true
  WHERE w.company_id = p_company_id
    AND w.is_active = true
  GROUP BY w.id, w.warehouse_name, w.capacity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get item performance metrics
CREATE OR REPLACE FUNCTION get_item_performance_metrics(
  p_company_id UUID,
  p_warehouse_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  item_id UUID,
  item_name VARCHAR,
  item_code VARCHAR,
  category VARCHAR,
  current_stock DECIMAL,
  avg_monthly_usage DECIMAL,
  turnover_rate DECIMAL,
  days_of_supply DECIMAL,
  total_value DECIMAL,
  reorder_point DECIMAL,
  safety_stock DECIMAL,
  last_movement_date TIMESTAMP WITH TIME ZONE,
  movement_count BIGINT,
  stockouts INTEGER,
  excess_stock_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH item_usage AS (
    SELECT
      sl.item_id,
      sl.quantity_on_hand as current_stock,
      COALESCE(AVG(monthly_usage.avg_usage), 0) as avg_monthly_usage,
      COALESCE(COUNT(im.id), 0) as movement_count,
      MAX(im.movement_date) as last_movement_date,
      COUNT(DISTINCT CASE WHEN im.movement_type = 'STOCKOUT' THEN im.id END) as stockouts
    FROM inventory_stock_levels sl
    JOIN inventory_items i ON sl.item_id = i.id
    LEFT JOIN inventory_movements im ON sl.item_id = im.item_id
      AND (p_warehouse_id IS NULL OR sl.warehouse_id = im.warehouse_id)
      AND im.movement_date >= CURRENT_DATE - INTERVAL '90 days'
    LEFT JOIN LATERAL (
      SELECT AVG(ABS(quantity)) as avg_usage
      FROM inventory_movements im2
      WHERE im2.item_id = sl.item_id
        AND im2.movement_type = 'SALE'
        AND im2.movement_date >= CURRENT_DATE - INTERVAL '90 days'
    ) monthly_usage ON true
    WHERE i.company_id = p_company_id
      AND i.is_active = true
      AND (p_warehouse_id IS NULL OR sl.warehouse_id = p_warehouse_id)
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
    GROUP BY sl.item_id, sl.quantity_on_hand
  )
  SELECT
    i.id as item_id,
    i.item_name,
    i.item_code,
    c.category_name as category,
    iu.current_stock,
    iu.avg_monthly_usage,
    CASE
      WHEN iu.avg_monthly_usage > 0 AND i.cost_price > 0 THEN
        (iu.avg_monthly_usage * 12 * i.unit_price) / (iu.current_stock * i.cost_price)
      ELSE 0
    END as turnover_rate,
    CASE
      WHEN iu.avg_monthly_usage > 0 THEN iu.current_stock / (iu.avg_monthly_usage / 30)
      ELSE 999
    END as days_of_supply,
    iu.current_stock * i.cost_price as total_value,
    i.reorder_point,
    CASE
      WHEN i.reorder_point IS NOT NULL THEN i.reorder_point * 0.5
      ELSE i.min_stock_level * 0.5
    END as safety_stock,
    iu.last_movement_date,
    iu.movement_count,
    iu.stockouts,
    CASE
      WHEN i.max_stock_level IS NOT NULL AND iu.current_stock > i.max_stock_level THEN
        (iu.current_stock - i.max_stock_level) * i.cost_price
      ELSE 0
    END as excess_stock_value
  FROM inventory_items i
  JOIN item_usage iu ON i.id = iu.item_id
  LEFT JOIN inventory_categories c ON i.category_id = c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get category analysis
CREATE OR REPLACE FUNCTION get_category_analysis(p_company_id UUID)
RETURNS TABLE (
  category_name VARCHAR,
  item_count BIGINT,
  total_value DECIMAL,
  average_turnover DECIMAL,
  percentage_of_total_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH category_totals AS (
    SELECT
      COALESCE(c.category_name, 'غير مصنف') as category_name,
      COUNT(DISTINCT i.id) as item_count,
      COALESCE(SUM(sl.quantity_on_hand * i.cost_price), 0) as total_value,
      AVG(CASE
        WHEN COALESCE(AVG(monthly.avg_usage), 0) > 0 AND i.cost_price > 0 THEN
          (COALESCE(AVG(monthly.avg_usage), 0) * 12 * i.unit_price) / (sl.quantity_on_hand * i.cost_price)
        ELSE 0
      END) as average_turnover
    FROM inventory_items i
    JOIN inventory_stock_levels sl ON i.id = sl.item_id
    LEFT JOIN inventory_categories c ON i.category_id = c.id
    LEFT JOIN LATERAL (
      SELECT AVG(ABS(quantity)) as avg_usage
      FROM inventory_movements im
      WHERE im.item_id = i.id
        AND im.movement_type = 'SALE'
        AND im.movement_date >= CURRENT_DATE - INTERVAL '90 days'
    ) monthly_avg ON true
    WHERE i.company_id = p_company_id
      AND i.is_active = true
    GROUP BY c.category_name
  ),
  total_inventory_value AS (
    SELECT COALESCE(SUM(total_value), 0) as total_value
    FROM category_totals
  )
  SELECT
    ct.category_name,
    ct.item_count,
    ct.total_value,
    ct.average_turnover,
    CASE
      WHEN tiv.total_value > 0 THEN (ct.total_value / tiv.total_value) * 100
      ELSE 0
    END as percentage_of_total_value
  FROM category_totals ct
  CROSS JOIN total_inventory_value tiv
  ORDER BY ct.total_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get inventory trends
CREATE OR REPLACE FUNCTION get_inventory_trends(p_company_id UUID, p_days INTEGER DEFAULT 90)
RETURNS TABLE (
  period DATE,
  total_value DECIMAL,
  movement_count BIGINT,
  new_items INTEGER,
  out_of_stock_items INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_metrics AS (
    SELECT
      DATE(im.movement_date) as movement_date,
      COALESCE(SUM(CASE WHEN im.movement_type IN ('PURCHASE', 'TRANSFER_IN') THEN im.quantity * i.unit_price ELSE 0 END), 0) as inbound_value,
      COALESCE(SUM(CASE WHEN im.movement_type IN ('SALE', 'TRANSFER_OUT') THEN im.quantity * i.unit_price ELSE 0 END), 0) as outbound_value,
      COUNT(DISTINCT im.id) as movement_count
    FROM inventory_movements im
    JOIN inventory_items i ON im.item_id = i.id
    WHERE i.company_id = p_company_id
      AND im.movement_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    GROUP BY DATE(im.movement_date)
  ),
  inventory_levels AS (
    SELECT
      DATE(snapshot_date) as snapshot_date,
      COUNT(DISTINCT item_id) as total_items,
      COUNT(DISTINCT CASE WHEN quantity_on_hand = 0 THEN item_id END) as out_of_stock_items
    FROM inventory_snapshots
    WHERE company_id = p_company_id
      AND snapshot_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    GROUP BY DATE(snapshot_date)
  )
  SELECT
    COALESCE(dm.movement_date, il.snapshot_date) as period,
    COALESCE(dm.inbound_value, 0) as total_value,
    COALESCE(dm.movement_count, 0) as movement_count,
    0 as new_items, -- Placeholder - would track new item creation
    COALESCE(il.out_of_stock_items, 0) as out_of_stock_items
  FROM daily_metrics dm
  FULL OUTER JOIN inventory_levels il ON dm.movement_date = il.snapshot_date
  ORDER BY period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_inventory_overview_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_warehouse_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_item_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_trends TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE inventory_reports IS 'Generated inventory reports with data and metadata';
COMMENT ON TABLE scheduled_reports IS 'Automated report scheduling and delivery configuration';
COMMENT ON TABLE inventory_snapshots IS 'Daily historical snapshots of inventory levels';
COMMENT ON TABLE report_templates IS 'Reusable report templates with custom layouts';
COMMENT ON TABLE dashboard_widgets IS 'Configurable dashboard widgets for real-time analytics';
COMMENT ON TABLE inventory_alert_rules IS 'Automated alert rules for inventory monitoring';
COMMENT ON TABLE inventory_alert_history IS 'History of all triggered inventory alerts';