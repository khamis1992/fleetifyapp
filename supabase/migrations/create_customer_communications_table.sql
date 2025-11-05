-- Create customer_communications table for CRM system
-- This table stores all communication history with customers

CREATE TABLE IF NOT EXISTS customer_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer reference
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Communication details
  communication_type TEXT NOT NULL CHECK (communication_type IN ('phone', 'message', 'meeting', 'note')),
  communication_date DATE NOT NULL,
  communication_time TIME NOT NULL,
  duration_minutes INTEGER, -- للمكالمات فقط
  
  -- Employee who made the communication
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Communication content
  notes TEXT NOT NULL,
  
  -- Action tracking
  action_required TEXT CHECK (action_required IN ('quote', 'contract', 'payment', 'maintenance', 'renewal', 'none')),
  action_description TEXT,
  
  -- Follow-up scheduling
  follow_up_scheduled BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_time TIME,
  follow_up_status TEXT CHECK (follow_up_status IN ('pending', 'completed', 'cancelled')),
  
  -- Attachments (optional)
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_customer_communications_customer ON customer_communications(customer_id);
CREATE INDEX idx_customer_communications_company ON customer_communications(company_id);
CREATE INDEX idx_customer_communications_employee ON customer_communications(employee_id);
CREATE INDEX idx_customer_communications_date ON customer_communications(communication_date DESC);
CREATE INDEX idx_customer_communications_follow_up ON customer_communications(follow_up_date, follow_up_status) 
  WHERE follow_up_scheduled = TRUE;

-- Enable RLS
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see communications for their company
CREATE POLICY "Users can view communications for their company"
  ON customer_communications
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert communications for their company
CREATE POLICY "Users can create communications for their company"
  ON customer_communications
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Users can update communications they created
CREATE POLICY "Users can update their own communications"
  ON customer_communications
  FOR UPDATE
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Users can delete communications they created (or admins)
CREATE POLICY "Users can delete their own communications"
  ON customer_communications
  FOR DELETE
  USING (
    employee_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 
      FROM company_users 
      WHERE user_id = auth.uid() 
      AND company_id = customer_communications.company_id
      AND role IN ('admin', 'owner')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_update_customer_communications_updated_at
  BEFORE UPDATE ON customer_communications
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_communications_updated_at();

-- Comments
COMMENT ON TABLE customer_communications IS 'CRM communication history with customers';
COMMENT ON COLUMN customer_communications.communication_type IS 'Type of communication: phone, message, meeting, or note';
COMMENT ON COLUMN customer_communications.duration_minutes IS 'Duration in minutes (for phone calls)';
COMMENT ON COLUMN customer_communications.action_required IS 'Required action after communication';
COMMENT ON COLUMN customer_communications.follow_up_scheduled IS 'Whether a follow-up is scheduled';
COMMENT ON COLUMN customer_communications.follow_up_status IS 'Status of the scheduled follow-up';
COMMENT ON COLUMN customer_communications.attachments IS 'JSON array of attachment URLs';

