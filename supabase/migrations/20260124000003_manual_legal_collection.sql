-- Create manual legal collection cases table
CREATE TABLE IF NOT EXISTS legal_collection_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL, -- Optional link to specific contract
  
  claim_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- المبلغ المطالب به (يحدده المستخدم يدوياً)
  collected_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- المبلغ الذي تم تحصيله (يحدث تلقائياً)
  
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'on_hold')),
  case_number VARCHAR(100), -- رقم الملف/القضية اليدوي إن وجد
  notes TEXT,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legal_collection_cases_company_id ON legal_collection_cases(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_collection_cases_customer_id ON legal_collection_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_legal_collection_cases_status ON legal_collection_cases(status);

-- RLS Policies
ALTER TABLE legal_collection_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view legal cases for their company"
  ON legal_collection_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id = legal_collection_cases.company_id
    )
  );

CREATE POLICY "Users can insert legal cases for their company"
  ON legal_collection_cases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id = legal_collection_cases.company_id
    )
  );

CREATE POLICY "Users can update legal cases for their company"
  ON legal_collection_cases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id = legal_collection_cases.company_id
    )
  );

CREATE POLICY "Users can delete legal cases for their company"
  ON legal_collection_cases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id = legal_collection_cases.company_id
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_legal_collection_cases_updated_at
  BEFORE UPDATE ON legal_collection_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- AUTOMATIC PAYMENT DEDUCTION LOGIC
-- ============================================================================

CREATE OR REPLACE FUNCTION update_legal_collection_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the payment is completed
  IF NEW.payment_status IN ('completed', 'paid', 'approved') THEN
    
    -- Check if the customer has an open legal collection case
    -- We assume FIFO (First In First Out) or updates all open cases proportionally? 
    -- Simplest approach: Update the oldest open case or all open cases.
    -- Let's update ALL open cases for this customer by adding the payment amount to collected_amount
    -- This is just tracking; it doesn't prevent payment logic elsewhere.
    
    UPDATE legal_collection_cases
    SET 
      collected_amount = collected_amount + NEW.amount,
      updated_at = NOW()
    WHERE 
      customer_id = NEW.customer_id 
      AND company_id = NEW.company_id
      AND status = 'open';
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on payments table
DROP TRIGGER IF EXISTS trigger_update_legal_collection_on_payment ON payments;
CREATE TRIGGER trigger_update_legal_collection_on_payment
  AFTER INSERT OR UPDATE OF payment_status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_collection_on_payment();
