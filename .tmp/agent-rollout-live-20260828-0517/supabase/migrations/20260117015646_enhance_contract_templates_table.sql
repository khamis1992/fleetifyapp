-- ============================================================================
-- Migration: Enhance contract_templates table for SaaS customization
-- Date: 2026-01-17
-- Purpose: Add columns for multi-language, branding, and contract types
-- ============================================================================

-- ============================================================================
-- Add new columns to existing contract_templates table
-- ============================================================================

-- Add template_code column
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS template_code VARCHAR(100);
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS template_type VARCHAR(50) DEFAULT 'rental';

-- Language-specific headers
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS header_ar TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS header_en TEXT;

-- Language-specific bodies
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS body_ar TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS body_en TEXT;

-- Language-specific footers
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS footer_ar TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS footer_en TEXT;

-- Legal clauses as JSONB
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS legal_clauses_ar JSONB DEFAULT '[]'::jsonb;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS legal_clauses_en JSONB DEFAULT '[]'::jsonb;

-- Contract terms
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS payment_terms_ar TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS payment_terms_en TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS late_fee_terms_ar TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS late_fee_terms_en TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS termination_terms_ar TEXT;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS termination_terms_en TEXT;

-- Branding configuration
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS use_company_branding BOOLEAN DEFAULT true;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS custom_header_color VARCHAR(7);
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS custom_accent_color VARCHAR(7);
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS custom_font_family VARCHAR(100);
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;

-- Layout settings
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS paper_size VARCHAR(10) DEFAULT 'a4';
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS margin_top DECIMAL(5,2) DEFAULT 2.54;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS margin_bottom DECIMAL(5,2) DEFAULT 2.54;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS margin_left DECIMAL(5,2) DEFAULT 2.54;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS margin_right DECIMAL(5,2) DEFAULT 2.54;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT true;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS show_company_name BOOLEAN DEFAULT true;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS show_signature_lines BOOLEAN DEFAULT true;

-- Template sections configuration
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;

-- Template variables configuration
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;

-- Versioning
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS parent_template_id UUID;

-- Statistics
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Flags
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT false;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Metadata
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contract_templates_company_id ON contract_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON contract_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_contract_templates_default ON contract_templates(company_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON contract_templates(is_active) WHERE is_active = true;

-- ============================================================================
-- Add triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contract_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contract_templates_updated_at_trigger ON contract_templates;
CREATE TRIGGER contract_templates_updated_at_trigger
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_templates_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can access all contract templates" ON contract_templates;
DROP POLICY IF EXISTS "Company users can access their own contract templates" ON contract_templates;
DROP POLICY IF EXISTS "Public cannot access contract templates" ON contract_templates;

-- Policy: Super admins can access all contract templates
CREATE POLICY "Super admins can access all contract templates"
  ON contract_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- Policy: Company users can access their own contract templates
CREATE POLICY "Company users can access their own contract templates"
  ON contract_templates
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Public cannot access contract templates
CREATE POLICY "Public cannot access contract templates"
  ON contract_templates
  FOR ALL
  TO anon
  USING (false);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get default template for a company and type
CREATE OR REPLACE FUNCTION get_default_contract_template(p_company_id UUID, p_template_type VARCHAR DEFAULT 'rental')
RETURNS contract_templates AS $$
DECLARE
  v_template contract_templates;
BEGIN
  SELECT * INTO v_template
  FROM contract_templates
  WHERE company_id = p_company_id
    AND template_type = p_template_type
    AND is_default = true
    AND is_active = true
  LIMIT 1;

  RETURN v_template;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get template content in specified language
CREATE OR REPLACE FUNCTION get_template_content(p_template_id UUID, p_language VARCHAR(2) DEFAULT 'ar')
RETURNS TABLE(
  header TEXT,
  body TEXT,
  footer TEXT,
  legal_clauses JSONB,
  payment_terms TEXT,
  late_fee_terms TEXT,
  termination_terms TEXT
) AS $$
BEGIN
  IF p_language = 'ar' THEN
    RETURN QUERY
    SELECT
      ct.header_ar AS header,
      ct.body_ar AS body,
      ct.footer_ar AS footer,
      ct.legal_clauses_ar AS legal_clauses,
      ct.payment_terms_ar AS payment_terms,
      ct.late_fee_terms_ar AS late_fee_terms,
      ct.termination_terms_ar AS termination_terms
    FROM contract_templates ct
    WHERE ct.id = p_template_id;
  ELSE
    RETURN QUERY
    SELECT
      ct.header_en AS header,
      ct.body_en AS body,
      ct.footer_en AS footer,
      ct.legal_clauses_en AS legal_clauses,
      ct.payment_terms_en AS payment_terms,
      ct.late_fee_terms_en AS late_fee_terms,
      ct.termination_terms_en AS termination_terms
    FROM contract_templates ct
    WHERE ct.id = p_template_id;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_default_contract_template(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_content(UUID, VARCHAR) TO authenticated;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE contract_templates IS 'Customizable contract templates for multi-tenant SaaS platform';
COMMENT ON COLUMN contract_templates.template_type IS 'Type of contract (rental, sales, property, service, other)';
COMMENT ON COLUMN contract_templates.use_company_branding IS 'If true, use company branding colors; otherwise use custom colors';
COMMENT ON COLUMN contract_templates.sections IS 'JSON array of template sections with visibility and titles';
COMMENT ON COLUMN contract_templates.variables IS 'JSON object of template variables with labels and types';
COMMENT ON COLUMN contract_templates.is_system_template IS 'System templates are pre-built and cannot be deleted';;
