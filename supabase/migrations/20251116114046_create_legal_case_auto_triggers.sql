-- Create legal_case_auto_triggers table
CREATE TABLE IF NOT EXISTS legal_case_auto_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Trigger 1: Overdue Invoice
  enable_overdue_invoice_trigger BOOLEAN DEFAULT true,
  overdue_days_threshold INTEGER DEFAULT 21,
  
  -- Trigger 2: Overdue Amount
  enable_overdue_amount_trigger BOOLEAN DEFAULT true,
  overdue_amount_threshold DECIMAL(10,2) DEFAULT 15000,
  
  -- Trigger 3: Broken Promises
  enable_broken_promises_trigger BOOLEAN DEFAULT true,
  broken_promises_count INTEGER DEFAULT 3,
  
  -- Default Settings
  auto_case_priority VARCHAR(20) DEFAULT 'high',
  auto_case_type VARCHAR(50) DEFAULT 'payment_collection',
  notify_on_auto_create BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Ensure one config per company
  UNIQUE(company_id)
);

-- Create payment_promises table for tracking broken promises
CREATE TABLE IF NOT EXISTS payment_promises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  promise_date DATE NOT NULL,
  promise_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  notes TEXT,
  
  status VARCHAR(20) DEFAULT 'pending', -- pending, kept, broken
  actual_payment_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_case_auto_triggers_company 
  ON legal_case_auto_triggers(company_id);

CREATE INDEX IF NOT EXISTS idx_payment_promises_customer 
  ON payment_promises(customer_id);

CREATE INDEX IF NOT EXISTS idx_payment_promises_status 
  ON payment_promises(status);

CREATE INDEX IF NOT EXISTS idx_payment_promises_company 
  ON payment_promises(company_id);

-- Enable RLS
ALTER TABLE legal_case_auto_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_promises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_case_auto_triggers
CREATE POLICY "Users can view their company's auto-create triggers"
  ON legal_case_auto_triggers FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's auto-create triggers"
  ON legal_case_auto_triggers FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's auto-create triggers"
  ON legal_case_auto_triggers FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for payment_promises
CREATE POLICY "Users can view their company's payment promises"
  ON payment_promises FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's payment promises"
  ON payment_promises FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's payment promises"
  ON payment_promises FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_case_auto_triggers_updated_at
  BEFORE UPDATE ON legal_case_auto_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_promises_updated_at
  BEFORE UPDATE ON payment_promises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
