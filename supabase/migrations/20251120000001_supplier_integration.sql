-- ============================================================================
-- Supplier Integration System - Phase 7B+
-- Created: 2025-11-20
-- Description: Supplier management and purchase order automation
-- ============================================================================

-- ============================================================================
-- 1. SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  company_name_ar VARCHAR(255),
  contact_person VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Saudi Arabia',
  tax_number VARCHAR(50),
  commercial_register VARCHAR(50),
  payment_terms VARCHAR(50) DEFAULT 'NET30',
  delivery_terms VARCHAR(100) DEFAULT 'Standard Delivery',
  rating DECIMAL(3, 2) DEFAULT 3.0 CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false,
  lead_time_days INTEGER DEFAULT 7 CHECK (lead_time_days >= 0),
  minimum_order_value DECIMAL(15, 3) DEFAULT 0 CHECK (minimum_order_value >= 0),
  website VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_supplier_per_company UNIQUE(company_id, company_name),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================================================
-- 2. SUPPLIER CATEGORIES TABLE (MANY-TO-MANY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_supplier_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL,
  category_name_ar VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_category_per_company UNIQUE(company_id, category_name)
);

-- Supplier-Category mapping table
CREATE TABLE IF NOT EXISTS inventory_supplier_category_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES inventory_supplier_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_supplier_category UNIQUE(supplier_id, category_id)
);

-- ============================================================================
-- 3. SUPPLIER PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  supplier_product_code VARCHAR(100),
  unit_price DECIMAL(15, 3) NOT NULL CHECK (unit_price >= 0),
  min_order_quantity INTEGER DEFAULT 1 CHECK (min_order_quantity >= 1),
  package_size INTEGER,
  availability_status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (
    availability_status IN ('AVAILABLE', 'LIMITED', 'OUT_OF_STOCK', 'DISCONTINUED')
  ),
  lead_time_days INTEGER DEFAULT 7 CHECK (lead_time_days >= 0),
  quality_rating DECIMAL(3, 2) CHECK (quality_rating >= 0 AND quality_rating <= 5),
  currency VARCHAR(10) DEFAULT 'QAR',
  discount_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  last_price_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supplier_catalog_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_supplier_item UNIQUE(supplier_id, item_id),
  CONSTRAINT check_expiry_after_effective CHECK (expiry_date IS NULL OR expiry_date >= effective_date)
);

-- ============================================================================
-- 4. PURCHASE ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id) ON DELETE RESTRICT,
  status VARCHAR(50) DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED')
  ),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  total_amount DECIMAL(15, 3) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency VARCHAR(10) DEFAULT 'QAR',
  payment_terms VARCHAR(50),
  delivery_address TEXT,
  internal_reference VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_order_number UNIQUE(company_id, order_number),
  CONSTRAINT check_delivery_dates CHECK (
    actual_delivery_date IS NULL OR actual_delivery_date >= order_date::DATE
  )
);

-- ============================================================================
-- 5. PURCHASE ORDER ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  sku VARCHAR(100) NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15, 3) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(15, 3) NOT NULL CHECK (total_price >= 0),
  received_quantity DECIMAL(15, 3) DEFAULT 0 CHECK (received_quantity >= 0),
  remaining_quantity DECIMAL(15, 3) GENERATED ALWAYS AS (quantity - received_quantity) STORED,
  unit_of_measure VARCHAR(50) DEFAULT 'Unit',
  expected_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_received_not_exceed_quantity CHECK (received_quantity <= quantity),
  CONSTRAINT unique_item_per_order UNIQUE(order_id, item_id)
);

-- ============================================================================
-- 6. SUPPLIER PERFORMANCE METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id) ON DELETE CASCADE,
  evaluation_period VARCHAR(7) NOT NULL, -- YYYY-MM format
  total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
  on_time_deliveries INTEGER DEFAULT 0 CHECK (on_time_deliveries >= 0),
  delayed_deliveries INTEGER DEFAULT 0 CHECK (delayed_deliveries >= 0),
  quality_score DECIMAL(3, 2) DEFAULT 3.0 CHECK (quality_score >= 0 AND quality_score <= 5),
  average_lead_time_days DECIMAL(5, 2) DEFAULT 0 CHECK (average_lead_time_days >= 0),
  order_accuracy_rate DECIMAL(5, 2) DEFAULT 100 CHECK (order_accuracy_rate >= 0 AND order_accuracy_rate <= 100),
  price_competitiveness_score DECIMAL(3, 2) DEFAULT 3.0 CHECK (price_competitiveness_score >= 0 AND price_competitiveness_score <= 5),
  responsiveness_score DECIMAL(3, 2) DEFAULT 3.0 CHECK (responsiveness_score >= 0 AND responsiveness_score <= 5),
  total_order_value DECIMAL(15, 3) DEFAULT 0 CHECK (total_order_value >= 0),
  return_rate DECIMAL(5, 2) DEFAULT 0 CHECK (return_rate >= 0 AND return_rate <= 100),
  issues_count INTEGER DEFAULT 0 CHECK (issues_count >= 0),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_supplier_period UNIQUE(supplier_id, evaluation_period),
  CONSTRAINT check_delivery_counts CHECK (on_time_deliveries + delayed_deliveries <= total_orders)
);

-- ============================================================================
-- 7. AUTOMATED PURCHASING RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_purchasing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (
    rule_type IN ('REPLENISHMENT', 'BULK_PURCHASE', 'CONTRACT', 'MIN_ORDER', 'BEST_PRICE')
  ),
  trigger_condition JSONB NOT NULL, -- Flexible trigger conditions
  action_config JSONB NOT NULL, -- Action configuration
  supplier_preferences JSONB, -- Preferred suppliers and criteria
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  execution_frequency VARCHAR(50) DEFAULT 'MANUAL', -- MANUAL, DAILY, WEEKLY, MONTHLY
  last_executed_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0 CHECK (execution_count >= 0),
  success_count INTEGER DEFAULT 0 CHECK (success_count >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT check_execution_count CHECK (success_count <= execution_count)
);

-- ============================================================================
-- 8. TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Apply timestamp triggers
CREATE TRIGGER update_suppliers_timestamp
  BEFORE UPDATE ON inventory_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_supplier_categories_timestamp
  BEFORE UPDATE ON inventory_supplier_categories
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_supplier_products_timestamp
  BEFORE UPDATE ON inventory_supplier_products
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_purchase_orders_timestamp
  BEFORE UPDATE ON inventory_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_purchase_order_items_timestamp
  BEFORE UPDATE ON inventory_purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_supplier_performance_timestamp
  BEFORE UPDATE ON inventory_supplier_performance
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_purchasing_rules_timestamp
  BEFORE UPDATE ON inventory_purchasing_rules
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

-- ============================================================================
-- 9. PURCHASE ORDER TOTAL CALCULATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    UPDATE inventory_purchase_orders
    SET total_amount = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM inventory_purchase_order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to purchase order items
CREATE TRIGGER trigger_update_po_total_on_item_insert
  AFTER INSERT ON inventory_purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

CREATE TRIGGER trigger_update_po_total_on_item_update
  AFTER UPDATE ON inventory_purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

CREATE TRIGGER trigger_update_po_total_on_item_delete
  AFTER DELETE ON inventory_purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

-- ============================================================================
-- 10. PERFORMANCE INDEXES
-- ============================================================================

-- Indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON inventory_suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON inventory_suppliers(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON inventory_suppliers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON inventory_suppliers(city);

-- Indexes for supplier products
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON inventory_supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_item ON inventory_supplier_products(item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_available ON inventory_supplier_products(availability_status, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_sku ON inventory_supplier_products(sku);

-- Indexes for purchase orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON inventory_purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON inventory_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON inventory_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON inventory_purchase_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery ON inventory_purchase_orders(expected_delivery_date);

-- Indexes for purchase order items
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON inventory_purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item ON inventory_purchase_order_items(item_id);

-- Indexes for supplier performance
CREATE INDEX IF NOT EXISTS idx_supplier_performance_company ON inventory_supplier_performance(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier ON inventory_supplier_performance(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_period ON inventory_supplier_performance(evaluation_period DESC);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_supplier_category_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_supplier_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchasing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers
CREATE POLICY "Users can view their company's suppliers"
  ON inventory_suppliers FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage suppliers for their company"
  ON inventory_suppliers FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for purchase orders (same pattern)
CREATE POLICY "Users can view their company's purchase orders"
  ON inventory_purchase_orders FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage purchase orders for their company"
  ON inventory_purchase_orders FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Similar policies for other tables...

-- ============================================================================
-- 12. HELPFUL VIEWS
-- ============================================================================

-- View: Supplier summary with latest performance
CREATE OR REPLACE VIEW inventory_suppliers_summary AS
SELECT
  s.*,
  c.category_name,
  sp.evaluation_period,
  sp.quality_score,
  sp.average_lead_time_days,
  sp.order_accuracy_rate,
  sp.price_competitiveness_score,
  sp.total_orders,
  sp.total_order_value
FROM inventory_suppliers s
LEFT JOIN inventory_supplier_category_mapping scm ON s.id = scm.supplier_id
LEFT JOIN inventory_supplier_categories c ON scm.category_id = c.id
LEFT JOIN LATERAL (
  SELECT *
  FROM inventory_supplier_performance
  WHERE supplier_id = s.id
  ORDER BY evaluation_period DESC
  LIMIT 1
) sp ON true
WHERE s.is_active = true
ORDER BY s.rating DESC, sp.quality_score DESC NULLS LAST;

-- View: Purchase order status summary
CREATE OR REPLACE VIEW inventory_purchase_order_summary AS
SELECT
  po.company_id,
  po.status,
  COUNT(*) as order_count,
  SUM(po.total_amount) as total_value,
  AVG(po.total_amount) as average_order_value,
  DATE_TRUNC('month', po.order_date) as order_month
FROM inventory_purchase_orders po
GROUP BY po.company_id, po.status, DATE_TRUNC('month', po.order_date)
ORDER BY order_month DESC, po.status;

-- View: Pending purchase orders by supplier
CREATE OR REPLACE VIEW inventory_pending_purchase_orders AS
SELECT
  po.*,
  s.company_name as supplier_name,
  s.contact_person,
  s.email,
  COUNT(poi.item_id) as item_count,
  SUM(poi.quantity) as total_quantity
FROM inventory_purchase_orders po
JOIN inventory_suppliers s ON po.supplier_id = s.id
LEFT JOIN inventory_purchase_order_items poi ON po.id = poi.order_id
WHERE po.status IN ('DRAFT', 'SENT', 'CONFIRMED')
GROUP BY po.id, s.company_name, s.contact_person, s.email
ORDER BY po.expected_delivery_date ASC NULLS LAST;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE inventory_suppliers IS 'Supplier master data and contact information';
COMMENT ON TABLE inventory_supplier_products IS 'Product catalog by supplier with pricing';
COMMENT ON TABLE inventory_purchase_orders IS 'Purchase order management';
COMMENT ON TABLE inventory_supplier_performance IS 'Supplier performance metrics and KPIs';
COMMENT ON TABLE inventory_purchasing_rules IS 'Automated purchasing rules and configurations';