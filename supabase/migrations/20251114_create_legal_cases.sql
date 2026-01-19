-- Create legal_cases table for managing legal cases
-- This table stores all legal cases related to contracts, customers, and vehicles

CREATE TABLE IF NOT EXISTS legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  case_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Case Type and Status
  case_type VARCHAR(50) NOT NULL CHECK (case_type IN (
    'contract_dispute',      -- نزاع عقد
    'payment_dispute',       -- نزاع دفع
    'accident_claim',        -- مطالبة حادث
    'insurance_claim',       -- مطالبة تأمين
    'vehicle_damage',        -- ضرر مركبة
    'theft',                 -- سرقة
    'traffic_violation',     -- مخالفة مرورية
    'other'                  -- أخرى
  )),
  
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',           -- مفتوحة
    'in_progress',    -- قيد المعالجة
    'pending',        -- معلقة
    'resolved',       -- محلولة
    'closed',         -- مغلقة
    'dismissed'       -- مرفوضة
  )),
  
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low',
    'medium',
    'high',
    'urgent'
  )),
  
  -- Related Entities
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  
  -- Legal Details
  court_name VARCHAR(255),
  court_case_number VARCHAR(100),
  lawyer_name VARCHAR(255),
  lawyer_contact VARCHAR(100),
  
  -- Financial Information
  claim_amount DECIMAL(15, 2),
  settlement_amount DECIMAL(15, 2),
  legal_fees DECIMAL(15, 2),
  
  -- Important Dates
  incident_date DATE,
  filing_date DATE,
  hearing_date DATE,
  resolution_date DATE,
  
  -- Documents and Notes
  documents JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  
  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_legal_cases_company_id ON legal_cases(company_id);
CREATE INDEX idx_legal_cases_customer_id ON legal_cases(customer_id);
CREATE INDEX idx_legal_cases_contract_id ON legal_cases(contract_id);
CREATE INDEX idx_legal_cases_vehicle_id ON legal_cases(vehicle_id);
CREATE INDEX idx_legal_cases_status ON legal_cases(status);
CREATE INDEX idx_legal_cases_case_type ON legal_cases(case_type);
CREATE INDEX idx_legal_cases_priority ON legal_cases(priority);
CREATE INDEX idx_legal_cases_created_at ON legal_cases(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_legal_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_legal_cases_updated_at
  BEFORE UPDATE ON legal_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_cases_updated_at();

-- Enable Row Level Security
ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Policy: Users can view legal cases from their company
CREATE POLICY "Users can view legal cases from their company"
  ON legal_cases
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert legal cases for their company
CREATE POLICY "Users can insert legal cases for their company"
  ON legal_cases
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update legal cases from their company
CREATE POLICY "Users can update legal cases from their company"
  ON legal_cases
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete legal cases from their company
CREATE POLICY "Users can delete legal cases from their company"
  ON legal_cases
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid()
    )
  );

-- Create function to generate case number
CREATE OR REPLACE FUNCTION generate_case_number(company_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  case_count INTEGER;
  new_case_number VARCHAR(50);
  year_suffix VARCHAR(2);
BEGIN
  -- Get current year suffix (e.g., "25" for 2025)
  year_suffix := TO_CHAR(NOW(), 'YY');
  
  -- Count existing cases for this company in current year
  SELECT COUNT(*) INTO case_count
  FROM legal_cases
  WHERE company_id = company_uuid
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  -- Generate new case number: LC-YY-NNNN (e.g., LC-25-0001)
  new_case_number := 'LC-' || year_suffix || '-' || LPAD((case_count + 1)::TEXT, 4, '0');
  
  RETURN new_case_number;
END;
$$ LANGUAGE plpgsql;

-- Add comment to table
COMMENT ON TABLE legal_cases IS 'Stores legal cases related to contracts, customers, and vehicles';
COMMENT ON COLUMN legal_cases.case_number IS 'Unique case identifier (e.g., LC-25-0001)';
COMMENT ON COLUMN legal_cases.case_type IS 'Type of legal case';
COMMENT ON COLUMN legal_cases.status IS 'Current status of the case';
COMMENT ON COLUMN legal_cases.priority IS 'Priority level of the case';
COMMENT ON COLUMN legal_cases.documents IS 'Array of document URLs and metadata stored as JSONB';
