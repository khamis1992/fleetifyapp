-- Create Sales/CRM System Tables
-- Migration: 20251019000000_create_sales_system.sql

-- Create trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sales Leads Table
CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_name VARCHAR(255) NOT NULL,
  lead_name_ar VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  source VARCHAR(100), -- website, referral, cold_call, trade_show, etc.
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Opportunities Table
CREATE TABLE IF NOT EXISTS sales_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES sales_leads(id) ON DELETE SET NULL,
  opportunity_name VARCHAR(255) NOT NULL,
  opportunity_name_ar VARCHAR(255),
  stage VARCHAR(50) DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  estimated_value NUMERIC(15, 2) DEFAULT 0,
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Quotes Table
CREATE TABLE IF NOT EXISTS sales_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES sales_opportunities(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC(15, 2) DEFAULT 0,
  tax NUMERIC(15, 2) DEFAULT 0,
  total NUMERIC(15, 2) DEFAULT 0,
  valid_until DATE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Orders Table
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES sales_quotes(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(15, 2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_leads_company_id ON sales_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON sales_leads(status);
CREATE INDEX IF NOT EXISTS idx_sales_leads_assigned_to ON sales_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_leads_is_active ON sales_leads(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_leads_created_at ON sales_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_opportunities_company_id ON sales_opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_lead_id ON sales_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_stage ON sales_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_assigned_to ON sales_opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_is_active ON sales_opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_expected_close_date ON sales_opportunities(expected_close_date);

CREATE INDEX IF NOT EXISTS idx_sales_quotes_company_id ON sales_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_opportunity_id ON sales_quotes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_customer_id ON sales_quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_status ON sales_quotes(status);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_is_active ON sales_quotes(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_valid_until ON sales_quotes(valid_until);

CREATE INDEX IF NOT EXISTS idx_sales_orders_company_id ON sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_quote_id ON sales_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_is_active ON sales_orders(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(order_date DESC);

-- Timestamp triggers
CREATE TRIGGER set_timestamp_sales_leads
  BEFORE UPDATE ON sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_sales_opportunities
  BEFORE UPDATE ON sales_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_sales_quotes
  BEFORE UPDATE ON sales_quotes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_sales_orders
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Row Level Security (RLS) Policies
ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (cleanup from any previous runs)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view leads from their company" ON sales_leads;
  DROP POLICY IF EXISTS "Users can insert leads to their company" ON sales_leads;
  DROP POLICY IF EXISTS "Users can update leads from their company" ON sales_leads;
  DROP POLICY IF EXISTS "Users can delete leads from their company" ON sales_leads;
  
  DROP POLICY IF EXISTS "Users can view opportunities from their company" ON sales_opportunities;
  DROP POLICY IF EXISTS "Users can insert opportunities to their company" ON sales_opportunities;
  DROP POLICY IF EXISTS "Users can update opportunities from their company" ON sales_opportunities;
  DROP POLICY IF EXISTS "Users can delete opportunities from their company" ON sales_opportunities;
  
  DROP POLICY IF EXISTS "Users can view quotes from their company" ON sales_quotes;
  DROP POLICY IF EXISTS "Users can insert quotes to their company" ON sales_quotes;
  DROP POLICY IF EXISTS "Users can update quotes from their company" ON sales_quotes;
  DROP POLICY IF EXISTS "Users can delete quotes from their company" ON sales_quotes;
  
  DROP POLICY IF EXISTS "Users can view orders from their company" ON sales_orders;
  DROP POLICY IF EXISTS "Users can insert orders to their company" ON sales_orders;
  DROP POLICY IF EXISTS "Users can update orders from their company" ON sales_orders;
  DROP POLICY IF EXISTS "Users can delete orders from their company" ON sales_orders;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors if policies don't exist
END $$;

-- Sales Leads Policies
CREATE POLICY "Users can view leads from their company"
  ON sales_leads FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert leads to their company"
  ON sales_leads FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update leads from their company"
  ON sales_leads FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leads from their company"
  ON sales_leads FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Sales Opportunities Policies
CREATE POLICY "Users can view opportunities from their company"
  ON sales_opportunities FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert opportunities to their company"
  ON sales_opportunities FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update opportunities from their company"
  ON sales_opportunities FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete opportunities from their company"
  ON sales_opportunities FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Sales Quotes Policies
CREATE POLICY "Users can view quotes from their company"
  ON sales_quotes FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert quotes to their company"
  ON sales_quotes FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update quotes from their company"
  ON sales_quotes FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quotes from their company"
  ON sales_quotes FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Sales Orders Policies
CREATE POLICY "Users can view orders from their company"
  ON sales_orders FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert orders to their company"
  ON sales_orders FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders from their company"
  ON sales_orders FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete orders from their company"
  ON sales_orders FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- View for Sales Pipeline Metrics
CREATE OR REPLACE VIEW sales_pipeline_metrics AS
SELECT
  company_id,
  COUNT(*) FILTER (WHERE stage = 'lead') as lead_count,
  COUNT(*) FILTER (WHERE stage = 'qualified') as qualified_count,
  COUNT(*) FILTER (WHERE stage = 'proposal') as proposal_count,
  COUNT(*) FILTER (WHERE stage = 'negotiation') as negotiation_count,
  COUNT(*) FILTER (WHERE stage = 'won') as won_count,
  COUNT(*) FILTER (WHERE stage = 'lost') as lost_count,
  SUM(estimated_value) FILTER (WHERE stage = 'lead') as lead_value,
  SUM(estimated_value) FILTER (WHERE stage = 'qualified') as qualified_value,
  SUM(estimated_value) FILTER (WHERE stage = 'proposal') as proposal_value,
  SUM(estimated_value) FILTER (WHERE stage = 'negotiation') as negotiation_value,
  SUM(estimated_value) FILTER (WHERE stage = 'won') as won_value,
  SUM(estimated_value) FILTER (WHERE stage = 'lost') as lost_value,
  AVG(estimated_value) as avg_opportunity_value,
  SUM(estimated_value) as total_pipeline_value
FROM sales_opportunities
WHERE is_active = true
GROUP BY company_id;

-- Grant access to view
GRANT SELECT ON sales_pipeline_metrics TO authenticated;

-- RLS for view
ALTER VIEW sales_pipeline_metrics SET (security_invoker = true);
