-- ================================================================
-- CREATE TRAFFIC VIOLATIONS (PENALTIES) TABLE
-- ================================================================
-- Creates the penalties table for managing traffic violations
-- ================================================================

-- Drop existing table if exists (clean slate)
DROP TABLE IF EXISTS penalties CASCADE;

-- Create penalties table
CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  
  -- Violation Details
  penalty_number VARCHAR(50) UNIQUE NOT NULL,
  violation_type VARCHAR(100),
  penalty_date DATE NOT NULL,
  amount DECIMAL(15,3) NOT NULL DEFAULT 0,
  location VARCHAR(255),
  vehicle_plate VARCHAR(50),
  reason TEXT,
  notes TEXT,
  
  -- References
  customer_id UUID,
  contract_id UUID,
  vehicle_id UUID,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid')),
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints after table creation (only if tables exist)
DO $$
BEGIN
  -- Add company_id foreign key if companies table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'penalties_company_id_fkey' 
      AND table_name = 'penalties'
    ) THEN
      ALTER TABLE penalties ADD CONSTRAINT penalties_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add customer_id foreign key if customers table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'penalties_customer_id_fkey' 
      AND table_name = 'penalties'
    ) THEN
      ALTER TABLE penalties ADD CONSTRAINT penalties_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add contract_id foreign key if contracts table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'penalties_contract_id_fkey' 
      AND table_name = 'penalties'
    ) THEN
      ALTER TABLE penalties ADD CONSTRAINT penalties_contract_id_fkey 
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add vehicle_id foreign key if vehicles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'penalties_vehicle_id_fkey' 
      AND table_name = 'penalties'
    ) THEN
      ALTER TABLE penalties ADD CONSTRAINT penalties_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add created_by foreign key if auth.users exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'penalties_created_by_fkey' 
      AND table_name = 'penalties'
    ) THEN
      ALTER TABLE penalties ADD CONSTRAINT penalties_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id);
    END IF;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_penalties_company_id ON penalties(company_id);
CREATE INDEX IF NOT EXISTS idx_penalties_customer_id ON penalties(customer_id);
CREATE INDEX IF NOT EXISTS idx_penalties_contract_id ON penalties(contract_id);
CREATE INDEX IF NOT EXISTS idx_penalties_vehicle_id ON penalties(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_penalties_penalty_date ON penalties(penalty_date);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON penalties(status);
CREATE INDEX IF NOT EXISTS idx_penalties_payment_status ON penalties(payment_status);
CREATE INDEX IF NOT EXISTS idx_penalties_penalty_number ON penalties(penalty_number);

-- Enable RLS
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only if profiles table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Policy: Users can view penalties from their company
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'penalties' 
      AND policyname = 'Users can view penalties from their company'
    ) THEN
      CREATE POLICY "Users can view penalties from their company"
        ON penalties FOR SELECT
        USING (
          company_id IN (
            SELECT company_id FROM profiles WHERE user_id = auth.uid()
          )
        );
    END IF;

    -- Policy: Users can insert penalties for their company
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'penalties' 
      AND policyname = 'Users can insert penalties for their company'
    ) THEN
      CREATE POLICY "Users can insert penalties for their company"
        ON penalties FOR INSERT
        WITH CHECK (
          company_id IN (
            SELECT company_id FROM profiles WHERE user_id = auth.uid()
          )
        );
    END IF;

    -- Policy: Users can update penalties from their company
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'penalties' 
      AND policyname = 'Users can update penalties from their company'
    ) THEN
      CREATE POLICY "Users can update penalties from their company"
        ON penalties FOR UPDATE
        USING (
          company_id IN (
            SELECT company_id FROM profiles WHERE user_id = auth.uid()
          )
        );
    END IF;

    -- Policy: Users can delete penalties from their company
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'penalties' 
      AND policyname = 'Users can delete penalties from their company'
    ) THEN
      CREATE POLICY "Users can delete penalties from their company"
        ON penalties FOR DELETE
        USING (
          company_id IN (
            SELECT company_id FROM profiles WHERE user_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_penalties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_penalties_updated_at_trigger ON penalties;
CREATE TRIGGER update_penalties_updated_at_trigger
  BEFORE UPDATE ON penalties
  FOR EACH ROW
  EXECUTE FUNCTION update_penalties_updated_at();

-- Add comments
COMMENT ON TABLE penalties IS 'Traffic violations and penalties for fleet vehicles';
COMMENT ON COLUMN penalties.penalty_number IS 'Unique penalty reference number';
COMMENT ON COLUMN penalties.violation_type IS 'Type of traffic violation (speeding, parking, etc)';
COMMENT ON COLUMN penalties.penalty_date IS 'Date when the violation occurred';
COMMENT ON COLUMN penalties.amount IS 'Fine amount in company currency';
COMMENT ON COLUMN penalties.vehicle_plate IS 'Vehicle plate number (may not have vehicle_id)';
COMMENT ON COLUMN penalties.status IS 'Violation status: pending, confirmed, cancelled';
COMMENT ON COLUMN penalties.payment_status IS 'Payment status: unpaid, paid, partially_paid';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ TRAFFIC VIOLATIONS TABLE CREATED SUCCESSFULLY';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Table: penalties';
  RAISE NOTICE '📊 Indexes: 8 created for optimal performance';
  RAISE NOTICE '🔒 RLS: Enabled with company-based policies';
  RAISE NOTICE '⚙️ Triggers: Auto-update timestamp';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 The TrafficViolations page should now work correctly!';
  RAISE NOTICE '====================================================================';
END $$;

