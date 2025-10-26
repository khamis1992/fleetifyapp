-- Create contract_templates table
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('preset', 'custom')),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('rent_to_own', 'daily_rental', 'weekly_rental', 'monthly_rental', 'yearly_rental')),
  rental_days INTEGER NOT NULL CHECK (rental_days > 0),
  description TEXT,
  terms TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  preset_config JSONB,
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_contract_templates_company ON contract_templates(company_id);
CREATE INDEX idx_contract_templates_type ON contract_templates(template_type);
CREATE INDEX idx_contract_templates_active ON contract_templates(is_active);
CREATE INDEX idx_contract_templates_created_by ON contract_templates(created_by);

-- Enable RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates from their company"
  ON contract_templates
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can create templates"
  ON contract_templates
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('company_admin', 'manager', 'super_admin')
    )
  );

CREATE POLICY "Managers can update their company templates"
  ON contract_templates
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('company_admin', 'manager', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete templates"
  ON contract_templates
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('company_admin', 'super_admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE contract_templates IS 'Contract templates for quick contract creation with preset and custom configurations';
