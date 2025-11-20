-- ============================================================================
-- Warehouse Transfers Enhancement - Phase 7B+
-- Created: 2025-11-20
-- Description: Multi-warehouse transfer management system
-- ============================================================================

-- ============================================================================
-- 1. WAREHOUSE TRANSFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transfer_number VARCHAR(50) NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id) ON DELETE RESTRICT,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  transfer_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_warehouse_transfer_number UNIQUE(company_id, transfer_number),
  CONSTRAINT different_warehouses CHECK (from_warehouse_id != to_warehouse_id)
);

-- ============================================================================
-- 2. WAREHOUSE TRANSFER ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_warehouse_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES inventory_warehouse_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_requested DECIMAL(15, 3) NOT NULL CHECK (quantity_requested > 0),
  quantity_shipped DECIMAL(15, 3),
  quantity_received DECIMAL(15, 3),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_item_per_warehouse_transfer UNIQUE(transfer_id, item_id),
  CONSTRAINT check_shipped_quantity CHECK (quantity_shipped IS NULL OR quantity_shipped >= 0),
  CONSTRAINT check_received_quantity CHECK (quantity_received IS NULL OR quantity_received >= 0)
);

-- ============================================================================
-- 3. AUTOMATIC REPLENISHMENT RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_replenishment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES inventory_categories(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('MANUAL', 'AUTOMATIC', 'PERIODIC', 'DEMAND_BASED')),
  reorder_point DECIMAL(15, 3) NOT NULL,
  reorder_quantity DECIMAL(15, 3) NOT NULL,
  max_stock_level DECIMAL(15, 3),
  lead_time_days INTEGER DEFAULT 7,
  safety_stock DECIMAL(15, 3) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  supplier_id UUID, -- Will link to future suppliers table
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT check_rule_targets CHECK (
    (item_id IS NOT NULL) OR (category_id IS NOT NULL)
  ),
  CONSTRAINT check_stock_levels CHECK (
    reorder_quantity > reorder_point AND
    (max_stock_level IS NULL OR max_stock_level >= reorder_quantity)
  )
);

-- ============================================================================
-- 4. REPLENISHMENT REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_replenishment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_number VARCHAR(50) NOT NULL,
  rule_id UUID REFERENCES inventory_replenishment_rules(id) ON DELETE SET NULL,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  current_stock DECIMAL(15, 3) NOT NULL,
  requested_quantity DECIMAL(15, 3) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED')),
  urgency_level VARCHAR(50) DEFAULT 'NORMAL' CHECK (urgency_level IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  expected_delivery_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_replenishment_request_number UNIQUE(company_id, request_number)
);

-- ============================================================================
-- 5. DEMAND FORECASTING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_period VARCHAR(50) NOT NULL CHECK (forecast_period IN ('DAILY', 'WEEKLY', 'MONTHLY')),
  predicted_demand DECIMAL(15, 3) NOT NULL,
  confidence_level DECIMAL(5, 2) DEFAULT 80 CHECK (confidence_level BETWEEN 0 AND 100),
  actual_demand DECIMAL(15, 3),
  forecast_method VARCHAR(50) DEFAULT 'LINEAR_REGRESSION',
  model_parameters JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_forecast_item_warehouse_date_period UNIQUE(item_id, warehouse_id, forecast_date, forecast_period),
  CONSTRAINT check_demand_positive CHECK (predicted_demand >= 0),
  CONSTRAINT check_actual_demand_positive CHECK (actual_demand IS NULL OR actual_demand >= 0)
);

-- ============================================================================
-- 6. INVENTORY OPTIMIZATION METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_optimization_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL,
  inventory_turnover_rate DECIMAL(10, 4),
  days_of_supply INTEGER,
  stockout_count INTEGER DEFAULT 0,
  excess_stock_value DECIMAL(15, 3) DEFAULT 0,
  optimal_stock_level DECIMAL(15, 3),
  current_stock_level DECIMAL(15, 3),
  holding_cost DECIMAL(15, 3) DEFAULT 0,
  ordering_cost DECIMAL(15, 3) DEFAULT 0,
  total_cost DECIMAL(15, 3) DEFAULT 0,
  service_level DECIMAL(5, 2) DEFAULT 95 CHECK (service_level BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_optimization_item_warehouse_date UNIQUE(item_id, warehouse_id, calculation_date),
  CONSTRAINT check_turnover_positive CHECK (inventory_turnover_rate IS NULL OR inventory_turnover_rate >= 0),
  CONSTRAINT check_days_positive CHECK (days_of_supply IS NULL OR days_of_supply >= 0)
);

-- ============================================================================
-- 7. TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Apply timestamp triggers to new tables
CREATE TRIGGER update_warehouse_transfers_timestamp
  BEFORE UPDATE ON inventory_warehouse_transfers
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_transfer_items_timestamp
  BEFORE UPDATE ON inventory_warehouse_transfer_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_replenishment_rules_timestamp
  BEFORE UPDATE ON inventory_replenishment_rules
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_replenishment_requests_timestamp
  BEFORE UPDATE ON inventory_replenishment_requests
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_demand_forecasts_timestamp
  BEFORE UPDATE ON inventory_demand_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

-- ============================================================================
-- 8. AUTOMATIC REPLENISHMENT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_create_replenishment_request()
RETURNS TRIGGER AS $$
DECLARE
  v_rule inventory_replenishment_rules%ROWTYPE;
  v_current_stock DECIMAL(15, 3);
  v_request_number VARCHAR(50);
  v_urgency_level VARCHAR(50);
BEGIN
  -- Check if this is a stock level update that might trigger replenishment
  IF TG_TABLE_NAME = 'inventory_stock_levels' AND TG_OP = 'UPDATE' THEN
    -- Find applicable replenishment rules
    FOR v_rule IN
      SELECT r.* FROM inventory_replenishment_rules r
      JOIN inventory_stock_levels sl ON (
        (r.item_id IS NOT NULL AND r.item_id = sl.item_id) OR
        (r.category_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM inventory_items i
          WHERE i.id = sl.item_id AND i.category_id = r.category_id
        ))
      )
      WHERE r.is_active = true
        AND r.warehouse_id = NEW.warehouse_id
        AND sl.quantity_available <= r.reorder_point
        AND sl.item_id = NEW.item_id
    LOOP
      -- Check if there's already a pending request
      IF NOT EXISTS (
        SELECT 1 FROM inventory_replenishment_requests rr
        WHERE rr.item_id = NEW.item_id
          AND rr.warehouse_id = NEW.warehouse_id
          AND rr.status IN ('PENDING', 'APPROVED', 'ORDERED')
      ) THEN
        -- Generate request number
        SELECT 'REQ-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
        INTO v_request_number
        FROM inventory_replenishment_requests
        WHERE company_id = v_rule.company_id;

        -- Determine urgency level
        v_urgency_level := CASE
          WHEN NEW.quantity_available = 0 THEN 'CRITICAL'
          WHEN NEW.quantity_available < (v_rule.reorder_point * 0.5) THEN 'HIGH'
          WHEN NEW.quantity_available < (v_rule.reorder_point * 0.8) THEN 'NORMAL'
          ELSE 'LOW'
        END;

        -- Create replenishment request
        INSERT INTO inventory_replenishment_requests (
          company_id, request_number, rule_id, item_id, warehouse_id,
          current_stock, requested_quantity, urgency_level, notes, created_by
        ) VALUES (
          v_rule.company_id, v_request_number, v_rule.id, NEW.item_id, NEW.warehouse_id,
          NEW.quantity_available, v_rule.reorder_quantity, v_urgency_level,
          'تم إنشاؤه تلقائياً بناءً على وصول المخزون لنقطة إعادة الطلب',
          COALESCE(NEW.updated_at, NEW.created_at)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to stock levels table
CREATE TRIGGER trigger_replenishment_check
  AFTER UPDATE ON inventory_stock_levels
  FOR EACH ROW
  EXECUTE FUNCTION check_and_create_replenishment_request();

-- ============================================================================
-- 9. PERFORMANCE INDEXES
-- ============================================================================

-- Indexes for warehouse transfers
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_company ON inventory_warehouse_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_status ON inventory_warehouse_transfers(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_date ON inventory_warehouse_transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_from_warehouse ON inventory_warehouse_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_to_warehouse ON inventory_warehouse_transfers(to_warehouse_id);

-- Indexes for transfer items
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON inventory_warehouse_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_item ON inventory_warehouse_transfer_items(item_id);

-- Indexes for replenishment rules
CREATE INDEX IF NOT EXISTS idx_replenishment_rules_company ON inventory_replenishment_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_rules_item_warehouse ON inventory_replenishment_rules(item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_rules_active ON inventory_replenishment_rules(company_id, is_active);

-- Indexes for replenishment requests
CREATE INDEX IF NOT EXISTS idx_replenishment_requests_company ON inventory_replenishment_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_requests_status ON inventory_replenishment_requests(status);
CREATE INDEX IF NOT EXISTS idx_replenishment_requests_item_warehouse ON inventory_replenishment_requests(item_id, warehouse_id);

-- Indexes for demand forecasts
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_item_warehouse ON inventory_demand_forecasts(item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_date ON inventory_demand_forecasts(forecast_date DESC);

-- Indexes for optimization metrics
CREATE INDEX IF NOT EXISTS idx_optimization_metrics_item_warehouse ON inventory_optimization_metrics(item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_optimization_metrics_date ON inventory_optimization_metrics(calculation_date DESC);

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE inventory_warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_warehouse_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_replenishment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_replenishment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_optimization_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warehouse transfers
CREATE POLICY "Users can view their company's warehouse transfers"
  ON inventory_warehouse_transfers FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage warehouse transfers for their company"
  ON inventory_warehouse_transfers FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for transfer items
CREATE POLICY "Users can view transfer items for their company"
  ON inventory_warehouse_transfer_items FOR SELECT
  USING (transfer_id IN (
    SELECT id FROM inventory_warehouse_transfers
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage transfer items for their company"
  ON inventory_warehouse_transfer_items FOR ALL
  USING (transfer_id IN (
    SELECT id FROM inventory_warehouse_transfers
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

-- RLS Policies for replenishment rules (same pattern for other tables)
CREATE POLICY "Users can view replenishment rules for their company"
  ON inventory_replenishment_rules FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage replenishment rules for their company"
  ON inventory_replenishment_rules FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Similar policies for other tables...

-- ============================================================================
-- 11. HELPFUL VIEWS
-- ============================================================================

-- View: Pending replenishment requests
CREATE OR REPLACE VIEW inventory_pending_replenishments AS
SELECT
  rr.id,
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
    WHEN rr.urgency_level = 'CRITICAL' THEN 1
    WHEN rr.urgency_level = 'HIGH' THEN 2
    WHEN rr.urgency_level = 'NORMAL' THEN 3
    ELSE 4
  END as priority_rank
FROM inventory_replenishment_requests rr
JOIN inventory_items i ON rr.item_id = i.id
JOIN inventory_warehouses w ON rr.warehouse_id = w.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
WHERE rr.status = 'PENDING'
ORDER BY priority_rank ASC, rr.created_at DESC;

-- View: Transfer status summary
CREATE OR REPLACE VIEW inventory_transfer_summary AS
SELECT
  t.company_id,
  t.from_warehouse_id,
  fw.warehouse_name as from_warehouse_name,
  t.to_warehouse_id,
  tw.warehouse_name as to_warehouse_name,
  t.status,
  COUNT(*) as transfer_count,
  SUM(COALESCE(ti.quantity_requested, 0)) as total_quantity_requested,
  SUM(COALESCE(ti.quantity_shipped, 0)) as total_quantity_shipped,
  SUM(COALESCE(ti.quantity_received, 0)) as total_quantity_received,
  t.transfer_date
FROM inventory_warehouse_transfers t
LEFT JOIN inventory_warehouse_transfer_items ti ON t.id = ti.transfer_id
LEFT JOIN inventory_warehouses fw ON t.from_warehouse_id = fw.id
LEFT JOIN inventory_warehouses tw ON t.to_warehouse_id = tw.id
GROUP BY t.company_id, t.from_warehouse_id, fw.warehouse_name, t.to_warehouse_id, tw.warehouse_name, t.status, t.transfer_date
ORDER BY t.transfer_date DESC;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE inventory_warehouse_transfers IS 'Multi-warehouse transfer management';
COMMENT ON TABLE inventory_replenishment_rules IS 'Automatic and manual replenishment rules';
COMMENT ON TABLE inventory_demand_forecasts IS 'Demand forecasting for inventory optimization';
COMMENT ON TABLE inventory_optimization_metrics IS 'Inventory optimization metrics and KPIs';