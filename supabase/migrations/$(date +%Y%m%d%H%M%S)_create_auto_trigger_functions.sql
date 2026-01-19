-- Database functions for auto-create triggers Edge Function

-- Function to get customers with overdue amount exceeding threshold
CREATE OR REPLACE FUNCTION get_customers_with_overdue_amount(
  p_company_id UUID,
  p_threshold DECIMAL
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  total_overdue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    COALESCE(SUM(i.total_amount), 0) AS total_overdue
  FROM customers c
  LEFT JOIN invoices i ON i.customer_id = c.id
  WHERE c.company_id = p_company_id
    AND i.status = 'overdue'
    AND i.legal_case_id IS NULL
  GROUP BY c.id, c.name
  HAVING COALESCE(SUM(i.total_amount), 0) >= p_threshold;
END;
$$ LANGUAGE plpgsql;

-- Function to get customers with broken promises exceeding threshold
CREATE OR REPLACE FUNCTION get_customers_with_broken_promises(
  p_company_id UUID,
  p_threshold INTEGER
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  broken_promises_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    COUNT(pp.id) AS broken_promises_count
  FROM customers c
  LEFT JOIN payment_promises pp ON pp.customer_id = c.id
  WHERE c.company_id = p_company_id
    AND pp.status = 'broken'
  GROUP BY c.id, c.name
  HAVING COUNT(pp.id) >= p_threshold;
END;
$$ LANGUAGE plpgsql;

-- Add auto_created column to legal_cases if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'legal_cases' AND column_name = 'auto_created'
  ) THEN
    ALTER TABLE legal_cases ADD COLUMN auto_created BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add legal_case_id to invoices if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'legal_case_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN legal_case_id UUID REFERENCES legal_cases(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_invoices_legal_case ON invoices(legal_case_id);
  END IF;
END $$;

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  reference_id UUID,
  priority VARCHAR(20) DEFAULT 'medium',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy for notifications
CREATE POLICY "Users can view their company's notifications"
  ON notifications FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's notifications"
  ON notifications FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );
