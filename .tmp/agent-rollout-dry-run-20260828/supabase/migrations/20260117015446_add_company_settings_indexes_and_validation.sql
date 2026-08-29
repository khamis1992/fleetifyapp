-- ============================================================================
-- Migration: Add performance indexes and validation for company tables
-- Date: 2026-01-17
-- Purpose: Optimize queries and add data validation
-- ============================================================================

-- ============================================================================
-- Performance Indexes for company_settings
-- ============================================================================

-- Index for currency-based queries (common in financial operations)
CREATE INDEX IF NOT EXISTS idx_company_settings_currency_active
  ON company_settings(currency)
  WHERE is_deleted = false;

-- Index for timezone queries (for scheduled tasks and reminders)
CREATE INDEX IF NOT EXISTS idx_company_settings_timezone_active
  ON company_settings(timezone)
  WHERE is_deleted = false;

-- Index for country queries (for regional reports)
CREATE INDEX IF NOT EXISTS idx_company_settings_country_active
  ON company_settings(country)
  WHERE is_deleted = false;

-- ============================================================================
-- Performance Indexes for company_branding_settings
-- ============================================================================

-- Index for font family queries
CREATE INDEX IF NOT EXISTS idx_company_branding_settings_font_family
  ON company_branding_settings(font_family)
  WHERE is_deleted = false;

-- ============================================================================
-- Data Validation Functions
-- ============================================================================

-- Function to validate color hex format (#RRGGBB)
CREATE OR REPLACE FUNCTION is_valid_hex_color(p_color VARCHAR(7))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_color ~ '^#[0-9A-Fa-f]{6}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(p_email VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate URL format
CREATE OR REPLACE FUNCTION is_valid_url(p_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_url ~ '^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$'
     OR p_url IS NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate phone number format (international)
CREATE OR REPLACE FUNCTION is_valid_phone(p_phone VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_phone ~ '^\+?[0-9\s\-\(\)]{8,20}$'
     OR p_phone IS NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Helper Functions for Application Use
-- ============================================================================

-- Function to get company display name based on language
CREATE OR REPLACE FUNCTION get_company_display_name(p_company_id UUID, p_language VARCHAR(2) DEFAULT 'ar')
RETURNS TEXT AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF p_language = 'ar' THEN
    SELECT COALESCE(cs.company_name_ar, c.name_ar, c.name) INTO v_name
    FROM company_settings cs
    JOIN companies c ON cs.company_id = c.id
    WHERE cs.company_id = p_company_id
      AND cs.is_deleted = false;
  ELSE
    SELECT COALESCE(cs.company_name_en, c.name) INTO v_name
    FROM company_settings cs
    JOIN companies c ON cs.company_id = c.id
    WHERE cs.company_id = p_company_id
      AND cs.is_deleted = false;
  END IF;

  RETURN COALESCE(v_name, 'Unknown Company');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if company is active (subscription and settings)
CREATE OR REPLACE FUNCTION is_company_active(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_status TEXT;
  v_settings_exists BOOLEAN;
BEGIN
  -- Check subscription status
  SELECT c.subscription_status INTO v_subscription_status
  FROM companies c
  WHERE c.id = p_company_id;

  -- Check if settings exist
  SELECT EXISTS(
    SELECT 1 FROM company_settings
    WHERE company_id = p_company_id
      AND is_deleted = false
  ) INTO v_settings_exists;

  RETURN COALESCE(v_subscription_status = 'active', false) AND v_settings_exists;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get company notification settings
CREATE OR REPLACE FUNCTION get_company_notification_settings(p_company_id UUID)
RETURNS TABLE(
  enabled BOOLEAN,
  channels JSONB,
  payment_reminders_enabled BOOLEAN,
  payment_reminder_days_before JSONB,
  contract_expiry_reminder_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.notifications_enabled,
    cs.notification_channels,
    cs.payment_reminders_enabled,
    cs.payment_reminder_days_before,
    cs.contract_expiry_reminder_days
  FROM company_settings cs
  WHERE cs.company_id = p_company_id
    AND cs.is_deleted = false;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to format currency amount according to company settings
CREATE OR REPLACE FUNCTION format_currency(p_company_id UUID, p_amount NUMERIC)
RETURNS TEXT AS $$
DECLARE
  v_currency VARCHAR(3);
  v_number_format VARCHAR(50);
  v_decimal_places INTEGER;
  v_thousands_separator VARCHAR(1);
  v_decimal_separator VARCHAR(1);
  v_currency_symbol VARCHAR(10);
  v_formatted TEXT;
BEGIN
  -- Get company formatting settings
  SELECT
    currency,
    number_format,
    decimal_places,
    thousands_separator,
    decimal_separator
  INTO v_currency, v_number_format, v_decimal_places, v_thousands_separator, v_decimal_separator
  FROM company_settings
  WHERE company_id = p_company_id
    AND is_deleted = false;

  -- Get currency symbol
  SELECT get_currency_symbol(v_currency) INTO v_currency_symbol;

  -- Format the amount (simplified logic)
  v_formatted := TO_CHAR(p_amount, 'FM999G999G999D' || REPEAT('9', COALESCE(v_decimal_places, 2)));

  RETURN COALESCE(v_currency_symbol, 'QAR') || ' ' || v_formatted;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Grant Permissions on Helper Functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_company_display_name(UUID, VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_company_active(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_company_notification_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION format_currency(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_hex_color(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_email(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_url(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_phone(VARCHAR) TO authenticated;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION is_valid_hex_color(VARCHAR) IS 'Validates hex color format (#RRGGBB)';
COMMENT ON FUNCTION is_valid_email(VARCHAR) IS 'Validates email format';
COMMENT ON FUNCTION is_valid_url(TEXT) IS 'Validates URL format';
COMMENT ON FUNCTION is_valid_phone(VARCHAR) IS 'Validates international phone number format';
COMMENT ON FUNCTION get_company_display_name(UUID, VARCHAR) IS 'Returns company display name in specified language';
COMMENT ON FUNCTION is_company_active(UUID) IS 'Checks if company subscription is active and settings exist';
COMMENT ON FUNCTION get_company_notification_settings(UUID) IS 'Returns notification preferences for company';
COMMENT ON FUNCTION format_currency(UUID, NUMERIC) IS 'Formats currency amount according to company settings';;
