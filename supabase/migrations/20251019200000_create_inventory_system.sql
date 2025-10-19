-- ============================================================================
-- Inventory Management System - Complete Schema
-- Created: 2025-10-19
-- Phase: 7B - Module Expansion
-- Description: Multi-warehouse inventory tracking with stock movements
-- ============================================================================

-- ============================================================================
-- 1. INVENTORY CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL,
  category_name_ar VARCHAR(255),
  description TEXT,
  parent_category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_category_per_company UNIQUE(company_id, category_name)
);

-- Indexes for categories
CREATE INDEX idx_inventory_categories_company ON inventory_categories(company_id);
CREATE INDEX idx_inventory_categories_parent ON inventory_categories(parent_category_id);
CREATE INDEX idx_inventory_categories_active ON inventory_categories(company_id, is_active);

-- ============================================================================
-- 2. INVENTORY WAREHOUSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_name VARCHAR(255) NOT NULL,
  warehouse_name_ar VARCHAR(255),
  warehouse_code VARCHAR(50),
  location_address TEXT,
  location_city VARCHAR(100),
  location_country VARCHAR(100) DEFAULT 'Saudi Arabia',
  manager_id UUID REFERENCES auth.users(id),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_warehouse_code_per_company UNIQUE(company_id, warehouse_code),
  CONSTRAINT unique_warehouse_name_per_company UNIQUE(company_id, warehouse_name)
);

-- Indexes for warehouses
CREATE INDEX idx_inventory_warehouses_company ON inventory_warehouses(company_id);
CREATE INDEX idx_inventory_warehouses_active ON inventory_warehouses(company_id, is_active);
CREATE INDEX idx_inventory_warehouses_manager ON inventory_warehouses(manager_id);

-- ============================================================================
-- 3. INVENTORY ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  item_name_ar VARCHAR(255),
  item_code VARCHAR(100),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  description TEXT,
  unit_of_measure VARCHAR(50) DEFAULT 'Unit',
  unit_price DECIMAL(15, 3) DEFAULT 0,
  cost_price DECIMAL(15, 3) DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  reorder_point INTEGER,
  reorder_quantity INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_tracked BOOLEAN DEFAULT true,
  item_type VARCHAR(50) DEFAULT 'Product', -- Product, Service, Component
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_item_code_per_company UNIQUE(company_id, item_code),
  CONSTRAINT unique_sku_per_company UNIQUE(company_id, sku)
);

-- Indexes for items
CREATE INDEX idx_inventory_items_company ON inventory_items(company_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_active ON inventory_items(company_id, is_active);
CREATE INDEX idx_inventory_items_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku) WHERE sku IS NOT NULL;

-- ============================================================================
-- 4. INVENTORY STOCK LEVELS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  quantity_on_hand DECIMAL(15, 3) DEFAULT 0,
  quantity_reserved DECIMAL(15, 3) DEFAULT 0,
  quantity_available DECIMAL(15, 3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  last_movement_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_stock_per_item_warehouse UNIQUE(item_id, warehouse_id),
  CONSTRAINT check_quantities_non_negative CHECK (
    quantity_on_hand >= 0 AND
    quantity_reserved >= 0 AND
    quantity_reserved <= quantity_on_hand
  )
);

-- Indexes for stock levels
CREATE INDEX idx_inventory_stock_levels_company ON inventory_stock_levels(company_id);
CREATE INDEX idx_inventory_stock_levels_item ON inventory_stock_levels(item_id);
CREATE INDEX idx_inventory_stock_levels_warehouse ON inventory_stock_levels(warehouse_id);
CREATE INDEX idx_inventory_stock_levels_low_stock ON inventory_stock_levels(item_id)
  WHERE quantity_available < 10;

-- ============================================================================
-- 5. INVENTORY MOVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id) ON DELETE RESTRICT,
  movement_type VARCHAR(50) NOT NULL, -- PURCHASE, SALE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, RETURN
  movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quantity DECIMAL(15, 3) NOT NULL,
  unit_cost DECIMAL(15, 3),
  total_cost DECIMAL(15, 3),
  reference_type VARCHAR(50), -- INVOICE, PURCHASE_ORDER, SALES_ORDER, ADJUSTMENT, TRANSFER
  reference_id UUID,
  reference_number VARCHAR(100),
  from_warehouse_id UUID REFERENCES inventory_warehouses(id),
  to_warehouse_id UUID REFERENCES inventory_warehouses(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_quantity_not_zero CHECK (quantity != 0),
  CONSTRAINT check_transfer_warehouses CHECK (
    (movement_type NOT IN ('TRANSFER_IN', 'TRANSFER_OUT')) OR
    (from_warehouse_id IS NOT NULL AND to_warehouse_id IS NOT NULL)
  )
);

-- Indexes for movements
CREATE INDEX idx_inventory_movements_company ON inventory_movements(company_id);
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(movement_date DESC);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);

-- ============================================================================
-- 6. STOCK TAKE (PHYSICAL COUNT) TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_stock_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  stock_take_number VARCHAR(100),
  stock_take_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
  counted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_stock_take_number UNIQUE(company_id, stock_take_number)
);

-- Stock take lines
CREATE TABLE IF NOT EXISTS inventory_stock_take_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id UUID NOT NULL REFERENCES inventory_stock_takes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  system_quantity DECIMAL(15, 3) DEFAULT 0,
  counted_quantity DECIMAL(15, 3),
  variance DECIMAL(15, 3) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  variance_value DECIMAL(15, 3),
  notes TEXT,
  counted_at TIMESTAMP WITH TIME ZONE,
  counted_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_item_per_stock_take UNIQUE(stock_take_id, item_id)
);

CREATE INDEX idx_stock_takes_company ON inventory_stock_takes(company_id);
CREATE INDEX idx_stock_takes_warehouse ON inventory_stock_takes(warehouse_id);
CREATE INDEX idx_stock_takes_status ON inventory_stock_takes(status);
CREATE INDEX idx_stock_take_lines_take ON inventory_stock_take_lines(stock_take_id);

-- ============================================================================
-- 7. TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_inventory_categories_timestamp
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_inventory_warehouses_timestamp
  BEFORE UPDATE ON inventory_warehouses
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_inventory_items_timestamp
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_inventory_stock_levels_timestamp
  BEFORE UPDATE ON inventory_stock_levels
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_inventory_stock_takes_timestamp
  BEFORE UPDATE ON inventory_stock_takes
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

-- ============================================================================
-- 8. STOCK LEVEL UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stock_level_on_movement()
RETURNS TRIGGER AS $$
DECLARE
  stock_record RECORD;
BEGIN
  -- Lock the stock level record for update
  SELECT * INTO stock_record
  FROM inventory_stock_levels
  WHERE item_id = NEW.item_id AND warehouse_id = NEW.warehouse_id
  FOR UPDATE;

  -- If stock record doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO inventory_stock_levels (company_id, item_id, warehouse_id, quantity_on_hand, last_movement_at)
    VALUES (NEW.company_id, NEW.item_id, NEW.warehouse_id, 0, NEW.movement_date);

    SELECT * INTO stock_record
    FROM inventory_stock_levels
    WHERE item_id = NEW.item_id AND warehouse_id = NEW.warehouse_id;
  END IF;

  -- Update quantity based on movement type
  IF NEW.movement_type IN ('PURCHASE', 'ADJUSTMENT', 'TRANSFER_IN', 'RETURN') THEN
    UPDATE inventory_stock_levels
    SET quantity_on_hand = quantity_on_hand + ABS(NEW.quantity),
        last_movement_at = NEW.movement_date
    WHERE item_id = NEW.item_id AND warehouse_id = NEW.warehouse_id;

  ELSIF NEW.movement_type IN ('SALE', 'TRANSFER_OUT') THEN
    UPDATE inventory_stock_levels
    SET quantity_on_hand = quantity_on_hand - ABS(NEW.quantity),
        last_movement_at = NEW.movement_date
    WHERE item_id = NEW.item_id AND warehouse_id = NEW.warehouse_id;

    -- Check for negative stock
    IF (SELECT quantity_on_hand FROM inventory_stock_levels
        WHERE item_id = NEW.item_id AND warehouse_id = NEW.warehouse_id) < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for item % in warehouse %', NEW.item_id, NEW.warehouse_id;
    END IF;
  END IF;

  -- Handle transfers (create corresponding movement in destination warehouse)
  IF NEW.movement_type = 'TRANSFER_OUT' AND NEW.to_warehouse_id IS NOT NULL THEN
    INSERT INTO inventory_movements (
      company_id, item_id, warehouse_id, movement_type, movement_date,
      quantity, unit_cost, total_cost, reference_type, reference_id,
      from_warehouse_id, to_warehouse_id, notes, created_by
    ) VALUES (
      NEW.company_id, NEW.item_id, NEW.to_warehouse_id, 'TRANSFER_IN', NEW.movement_date,
      ABS(NEW.quantity), NEW.unit_cost, NEW.total_cost, NEW.reference_type, NEW.reference_id,
      NEW.warehouse_id, NEW.to_warehouse_id, NEW.notes, NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_level_on_movement();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_take_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_categories
CREATE POLICY "Users can view their company's inventory categories"
  ON inventory_categories FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert inventory categories for their company"
  ON inventory_categories FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's inventory categories"
  ON inventory_categories FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's inventory categories"
  ON inventory_categories FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for inventory_warehouses (same pattern)
CREATE POLICY "Users can view their company's warehouses"
  ON inventory_warehouses FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert warehouses for their company"
  ON inventory_warehouses FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's warehouses"
  ON inventory_warehouses FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's warehouses"
  ON inventory_warehouses FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for inventory_items
CREATE POLICY "Users can view their company's inventory items"
  ON inventory_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert inventory items for their company"
  ON inventory_items FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's inventory items"
  ON inventory_items FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's inventory items"
  ON inventory_items FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for inventory_stock_levels
CREATE POLICY "Users can view their company's stock levels"
  ON inventory_stock_levels FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert stock levels for their company"
  ON inventory_stock_levels FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's stock levels"
  ON inventory_stock_levels FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for inventory_movements
CREATE POLICY "Users can view their company's inventory movements"
  ON inventory_movements FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert inventory movements for their company"
  ON inventory_movements FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for stock takes
CREATE POLICY "Users can view their company's stock takes"
  ON inventory_stock_takes FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their company's stock takes"
  ON inventory_stock_takes FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage stock take lines"
  ON inventory_stock_take_lines FOR ALL
  USING (stock_take_id IN (
    SELECT id FROM inventory_stock_takes
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

-- ============================================================================
-- 10. HELPFUL VIEWS
-- ============================================================================

-- View: Low stock items
CREATE OR REPLACE VIEW inventory_low_stock_items AS
SELECT
  i.id,
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
  (i.min_stock_level - sl.quantity_available) as shortage
FROM inventory_items i
JOIN inventory_stock_levels sl ON i.id = sl.item_id
JOIN inventory_warehouses w ON sl.warehouse_id = w.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
WHERE i.is_active = true
  AND i.is_tracked = true
  AND sl.quantity_available < i.min_stock_level
ORDER BY shortage DESC;

-- View: Inventory valuation
CREATE OR REPLACE VIEW inventory_valuation AS
SELECT
  i.company_id,
  i.id as item_id,
  i.item_name,
  i.item_code,
  w.id as warehouse_id,
  w.warehouse_name,
  sl.quantity_on_hand,
  sl.quantity_reserved,
  sl.quantity_available,
  i.cost_price,
  i.unit_price,
  (sl.quantity_on_hand * i.cost_price) as total_cost_value,
  (sl.quantity_on_hand * i.unit_price) as total_selling_value
FROM inventory_items i
JOIN inventory_stock_levels sl ON i.id = sl.item_id
JOIN inventory_warehouses w ON sl.warehouse_id = w.id
WHERE i.is_active = true AND w.is_active = true;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE inventory_items IS 'Phase 7B: Inventory items master data';
COMMENT ON TABLE inventory_stock_levels IS 'Phase 7B: Real-time stock levels per warehouse';
COMMENT ON TABLE inventory_movements IS 'Phase 7B: Complete audit trail of all stock movements';
