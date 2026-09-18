-- ============================================================================
-- Migration: Create company_settings table for SaaS multi-tenancy
-- Date: 2026-01-17
-- Purpose: Centralized company configuration for customizable SaaS platform
-- ============================================================================

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Reference
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,

  -- ============================================================================
  -- Company Basic Information
  -- ============================================================================
  -- Company names (display names)
  company_name_ar VARCHAR(255) NOT NULL,
  company_name_en VARCHAR(255) NOT NULL,

  -- Legal entity names (for contracts and legal documents)
  legal_name_ar VARCHAR(255),
  legal_name_en VARCHAR(255),

  -- Company type and registration
  company_type VARCHAR(100) CHECK (company_type IN ('LLC', 'Sole Proprietorship', 'Partnership', 'Corporation', 'Other')),
  commercial_register VARCHAR(100),
  tax_number VARCHAR(100),
  license_number VARCHAR(100),

  -- ============================================================================
  -- Contact Information
  -- ============================================================================
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(255),

  -- Address information
  address_ar TEXT,
  address_en TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),

  -- Office location for geofencing features
  office_latitude DECIMAL(10,8),
  office_longitude DECIMAL(11,8),
  allowed_radius_meters INTEGER DEFAULT 1000,

  -- ============================================================================
  -- Business Settings
  -- ============================================================================
  -- Currency and number formatting
  currency VARCHAR(3) DEFAULT 'KWD' CHECK (currency IN ('KWD', 'QAR', 'SAR', 'AED', 'USD', 'EUR', 'GBP')),
  number_format VARCHAR(50) DEFAULT '1,234.56',
  decimal_places INTEGER DEFAULT 2 CHECK (decimal_places >= 0 AND decimal_places <= 4),
  thousands_separator VARCHAR(1) DEFAULT ',',
  decimal_separator VARCHAR(1) DEFAULT '.',

  -- Date and time settings
  date_format VARCHAR(20) DEFAULT 'yyyy/MM/dd',
  time_format VARCHAR(20) DEFAULT 'HH:mm',
  timezone VARCHAR(50) DEFAULT 'Asia/Qatar',
  calendar_system VARCHAR(20) DEFAULT 'gregorian' CHECK (calendar_system IN ('gregorian', 'hijri', 'both')),

  -- Working hours
  work_start_time TIME DEFAULT '08:00:00',
  work_end_time TIME DEFAULT '18:00:00',
  work_days VARCHAR(20) DEFAULT 'sunday-thursday' CHECK (work_days IN ('monday-friday', 'sunday-thursday', 'saturday-thursday')),

  -- Auto checkout for vehicles
  auto_checkout_enabled BOOLEAN DEFAULT false,
  auto_checkout_time TIME DEFAULT '18:00:00',

  -- ============================================================================
  -- Contract and Legal Settings
  -- ============================================================================
  -- Default contract configuration
  default_contract_template_id UUID,

  -- Legal terms for contracts
  legal_terms_ar TEXT,
  legal_terms_en TEXT,

  -- Payment terms
  default_payment_terms_days INTEGER DEFAULT 30 CHECK (default_payment_terms_days > 0),
  advance_payment_percentage INTEGER DEFAULT 0 CHECK (advance_payment_percentage >= 0 AND advance_payment_percentage <= 100),
  security_deposit_required BOOLEAN DEFAULT false,
  security_deposit_percentage INTEGER DEFAULT 10 CHECK (security_deposit_percentage >= 0 AND security_deposit_percentage <= 100),

  -- Late fee configuration
  late_fee_enabled BOOLEAN DEFAULT true,
  late_fee_percentage DECIMAL(5,2) DEFAULT 5.00 CHECK (late_fee_percentage >= 0),
  late_fee_fixed_amount DECIMAL(10,2),
  late_fee_max_amount DECIMAL(10,2),
  late_fee_grace_period_days INTEGER DEFAULT 3 CHECK (late_fee_grace_period_days >= 0),
  late_fee_calculation_type VARCHAR(20) DEFAULT 'percentage' CHECK (late_fee_calculation_type IN ('percentage', 'fixed', 'both')),

  -- ============================================================================
  -- Integration Settings
  -- ============================================================================
  -- WhatsApp integration
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_business_phone VARCHAR(50),
  whatsapp_api_key TEXT,
  whatsapp_api_url VARCHAR(255),

  -- Email settings
  email_enabled BOOLEAN DEFAULT true,
  email_sender_name VARCHAR(255),
  email_sender_email VARCHAR(255),
  email_signature_ar TEXT,
  email_signature_en TEXT,

  -- SMS integration
  sms_enabled BOOLEAN DEFAULT false,
  sms_provider VARCHAR(50) CHECK (sms_provider IN ('twilio', 'nexmo', 'other')),
  sms_api_key TEXT,
  sms_sender_id VARCHAR(50),

  -- ============================================================================
  -- Feature Toggles (per company)
  -- ============================================================================
  enabled_features JSONB DEFAULT '{
    "contracts": true,
    "fleet": true,
    "customers": true,
    "finance": true,
    "inventory": false,
    "property": false,
    "hr": false,
    "maintenance": true,
    "violations": true,
    "reports": true,
    "mobile_app": false,
    "api_access": false
  }'::jsonb,

  -- Module-specific settings
  module_settings JSONB DEFAULT '{}'::jsonb,

  -- ============================================================================
  -- Notifications Settings
  -- ============================================================================
  -- Notification preferences
  notifications_enabled BOOLEAN DEFAULT true,
  notification_channels JSONB DEFAULT '{
    "email": true,
    "whatsapp": false,
    "sms": false,
    "in_app": true
  }'::jsonb,

  -- Reminder settings
  payment_reminders_enabled BOOLEAN DEFAULT true,
  payment_reminder_days_before JSONB DEFAULT '[3, 7, 14]'::jsonb,
  contract_expiry_reminder_days INTEGER DEFAULT 7,
  maintenance_reminder_days INTEGER DEFAULT 30,

  -- ============================================================================
  -- Audit Trail
  -- ============================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Additional metadata (flexible storage)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Soft delete support
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Primary index on company_id (already UNIQUE)
-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_currency ON company_settings(currency);
CREATE INDEX IF NOT EXISTS idx_company_settings_timezone ON company_settings(timezone);
CREATE INDEX IF NOT EXISTS idx_company_settings_country ON company_settings(country);
CREATE INDEX IF NOT EXISTS idx_company_settings_is_deleted ON company_settings(is_deleted) WHERE is_deleted = false;

-- ============================================================================
-- Triggers for updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_settings_updated_at_trigger ON company_settings;
CREATE TRIGGER company_settings_updated_at_trigger
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can access all company settings
CREATE POLICY "Super admins can access all company settings"
  ON company_settings
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

-- Policy: Company users can access their own company settings
CREATE POLICY "Company users can access their own company settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Public cannot access any company settings
CREATE POLICY "Public cannot access company settings"
  ON company_settings
  FOR ALL
  TO anon
  USING (false);

-- ============================================================================
-- Helpful Functions
-- ============================================================================

-- Function to get company settings with defaults
CREATE OR REPLACE FUNCTION get_company_settings(p_company_id UUID)
RETURNS company_settings AS $$
DECLARE
  v_settings company_settings;
BEGIN
  SELECT * INTO v_settings
  FROM company_settings
  WHERE company_id = p_company_id
    AND is_deleted = false
  LIMIT 1;

  -- If no settings found, return NULL (application should use defaults)
  RETURN v_settings;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a feature is enabled for a company
CREATE OR REPLACE FUNCTION is_feature_enabled(p_company_id UUID, p_feature_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT enabled_features->>p_feature_name FROM company_settings WHERE company_id = p_company_id AND is_deleted = false)::boolean,
    false
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get company currency symbol
CREATE OR REPLACE FUNCTION get_currency_symbol(p_currency VARCHAR(3))
RETURNS VARCHAR(10) AS $$
BEGIN
  RETURN CASE p_currency
    WHEN 'KWD' THEN 'د.ك'
    WHEN 'QAR' THEN 'ر.ق'
    WHEN 'SAR' THEN 'ر.س'
    WHEN 'AED' THEN 'د.إ'
    WHEN 'USD' THEN '$'
    WHEN 'EUR' THEN '€'
    WHEN 'GBP' THEN '£'
    ELSE p_currency
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE company_settings IS 'Centralized configuration settings for each company in the multi-tenant SaaS platform';

COMMENT ON COLUMN company_settings.company_id IS 'Reference to the companies table';
COMMENT ON COLUMN company_settings.company_name_ar IS 'Company display name in Arabic';
COMMENT ON COLUMN company_settings.company_name_en IS 'Company display name in English';
COMMENT ON COLUMN company_settings.legal_name_ar IS 'Legal entity name in Arabic (for contracts)';
COMMENT ON COLUMN company_settings.legal_name_en IS 'Legal entity name in English (for contracts)';
COMMENT ON COLUMN company_settings.currency IS 'Company primary currency (ISO 4217 code)';
COMMENT ON COLUMN company_settings.late_fee_percentage IS 'Late fee percentage charged on overdue payments';
COMMENT ON COLUMN company_settings.enabled_features IS 'JSON object controlling which features are enabled for this company';
COMMENT ON COLUMN company_settings.notification_channels IS 'JSON object controlling which notification channels are active';
COMMENT ON COLUMN company_settings.metadata IS 'Flexible storage for additional company-specific settings';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_company_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_feature_enabled(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_currency_symbol(VARCHAR) TO authenticated, anon;;
