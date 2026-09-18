-- Inventory Safe Essential Performance Indexes
-- Add indexes for the main inventory tables we know exist

-- Inventory Items - Main table
CREATE INDEX IF NOT EXISTS idx_inventory_items_company_category ON inventory_items(company_id, category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_company_active ON inventory_items(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku_name ON inventory_items(sku, item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_code ON inventory_items(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_reorder ON inventory_items(reorder_point, min_stock_level);
CREATE INDEX IF NOT EXISTS idx_inventory_items_type_active ON inventory_items(item_type, is_active);

-- Inventory Stock Levels - Current status
CREATE INDEX IF NOT EXISTS idx_inventory_stock_levels_item_warehouse ON inventory_stock_levels(item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_levels_company_available ON inventory_stock_levels(company_id, quantity_available);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_levels_last_updated ON inventory_stock_levels(last_movement_at);

-- Inventory Movements - Transaction tracking
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_date ON inventory_movements(item_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_type ON inventory_movements(company_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);

-- Inventory Purchase Orders - Procurement
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_orders_company_status ON inventory_purchase_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_orders_supplier_date ON inventory_purchase_orders(supplier_id, order_date);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_orders_expected_date ON inventory_purchase_orders(expected_delivery_date);

-- Inventory Suppliers - Vendor management (using correct column names)
CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_company_active ON inventory_suppliers(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_rating ON inventory_suppliers(rating, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_preferred ON inventory_suppliers(is_preferred, company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_name_rating ON inventory_suppliers(company_name, rating);

-- Partial index for active inventory items (optimizes common queries)
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(company_id, is_active, created_at) 
WHERE is_active = true;

-- Partial index for low stock items (optimizes alerts)
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(company_id, reorder_point, min_stock_level) 
WHERE min_stock_level > 0 AND reorder_point IS NOT NULL;

-- Partial index for pending purchase orders (optimizes procurement dashboard)
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_orders_pending ON inventory_purchase_orders(company_id, order_date, expected_delivery_date) 
WHERE status IN ('pending', 'approved', 'sent');

-- Partial index for preferred active suppliers (optimizes vendor selection)
CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_preferred_active ON inventory_suppliers(company_id, is_preferred, rating) 
WHERE is_active = true AND is_preferred = true;

-- Add comments for documentation
COMMENT ON INDEX idx_inventory_items_company_category IS 'Optimizes company inventory views by category';
COMMENT ON INDEX idx_inventory_items_company_active IS 'Optimizes company inventory filtering by active status';
COMMENT ON INDEX idx_inventory_items_sku_name IS 'Optimizes item lookups by SKU or name';
COMMENT ON INDEX idx_inventory_items_item_code IS 'Optimizes item code lookups';
COMMENT ON INDEX idx_inventory_items_reorder IS 'Optimizes reorder point calculations';
COMMENT ON INDEX idx_inventory_items_type_active IS 'Optimizes item type filtering with active status';

COMMENT ON INDEX idx_inventory_stock_levels_item_warehouse IS 'Optimizes warehouse stock queries';
COMMENT ON INDEX idx_inventory_stock_levels_company_available IS 'Optimizes low stock detection';
COMMENT ON INDEX idx_inventory_stock_levels_last_updated IS 'Optimizes recent movement tracking';

COMMENT ON INDEX idx_inventory_movements_item_date IS 'Optimizes item movement history queries';
COMMENT ON INDEX idx_inventory_movements_company_type IS 'Optimizes company movement reports by type';
COMMENT ON INDEX idx_inventory_movements_reference IS 'Optimizes reference-based movement lookups';

COMMENT ON INDEX idx_inventory_purchase_orders_company_status IS 'Optimizes company purchase order views by status';
COMMENT ON INDEX idx_inventory_purchase_orders_supplier_date IS 'Optimizes supplier order history';
COMMENT ON INDEX idx_inventory_purchase_orders_expected_date IS 'Optimizes delivery scheduling queries';

COMMENT ON INDEX idx_inventory_suppliers_company_active IS 'Optimizes company supplier filtering';
COMMENT ON INDEX idx_inventory_suppliers_rating IS 'Optimizes supplier performance analysis';
COMMENT ON INDEX idx_inventory_suppliers_preferred IS 'Optimizes preferred supplier queries';
COMMENT ON INDEX idx_inventory_suppliers_name_rating IS 'Optimizes supplier lookups by name and rating';

COMMENT ON INDEX idx_inventory_items_active IS 'Partial index for active inventory items';
COMMENT ON INDEX idx_inventory_items_low_stock IS 'Partial index for items with reorder points';
COMMENT ON INDEX idx_inventory_purchase_orders_pending IS 'Partial index for pending purchase orders';
COMMENT ON INDEX idx_inventory_suppliers_preferred_active IS 'Partial index for preferred active suppliers';;
