-- ============================================================================
-- Migration: Enhance company_branding_settings for contract and print branding
-- Date: 2026-01-17
-- Purpose: Add contract-specific branding and print configuration columns
-- ============================================================================

-- Add contract-specific branding columns if they don't exist
DO $$
BEGIN
  -- ============================================================================
  -- Contract Branding Columns
  -- ============================================================================

  -- Contract header color (main color for contract header)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'contract_header_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN contract_header_color VARCHAR(7) DEFAULT '#2563eb';
  END IF;

  -- Contract accent color (secondary color for highlights)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'contract_accent_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN contract_accent_color VARCHAR(7) DEFAULT '#f59e0b';
  END IF;

  -- Contract text color (main text color for contract body)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'contract_text_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN contract_text_color VARCHAR(7) DEFAULT '#1f2937';
  END IF;

  -- Contract background color (background for contract pages)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'contract_background_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN contract_background_color VARCHAR(7) DEFAULT '#ffffff';
  END IF;

  -- Contract border color (border color for contract sections)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'contract_border_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN contract_border_color VARCHAR(7) DEFAULT '#e5e7eb';
  END IF;

  -- Contract footer text (custom footer for printed contracts)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'contract_footer_text'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN contract_footer_text TEXT;
  END IF;

  -- ============================================================================
  -- Invoice Branding Columns
  -- ============================================================================

  -- Invoice header color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'invoice_header_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN invoice_header_color VARCHAR(7) DEFAULT '#2563eb';
  END IF;

  -- Invoice accent color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'invoice_accent_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN invoice_accent_color VARCHAR(7) DEFAULT '#f59e0b';
  END IF;

  -- ============================================================================
  -- Report Branding Columns
  -- ============================================================================

  -- Report header color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'report_header_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN report_header_color VARCHAR(7) DEFAULT '#2563eb';
  END IF;

  -- Report accent color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'report_accent_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN report_accent_color VARCHAR(7) DEFAULT '#f59e0b';
  END IF;

  -- ============================================================================
  -- Print Settings Columns
  -- ============================================================================

  -- Logo size for print (small, medium, large, extra-large)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'print_logo_size'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN print_logo_size VARCHAR(20) DEFAULT 'medium';
  END IF;

  -- Paper size for print (a4, letter, legal)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'print_paper_size'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN print_paper_size VARCHAR(10) DEFAULT 'a4';
  END IF;

  -- Print margin (tight, normal, generous)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'print_margins'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN print_margins VARCHAR(20) DEFAULT 'normal';
  END IF;

  -- Show/hide logo on print
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'print_show_logo'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN print_show_logo BOOLEAN DEFAULT true;
  END IF;

  -- Show/hide company name on print
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'print_show_company_name'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN print_show_company_name BOOLEAN DEFAULT true;
  END IF;

  -- Show/hide address on print
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'print_show_address'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN print_show_address BOOLEAN DEFAULT true;
  END IF;

  -- ============================================================================
  -- Additional Typography Settings
  -- ============================================================================

  -- Font size base (pixels)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'font_size_base'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN font_size_base INTEGER DEFAULT 16;
  END IF;

  -- Font scale (percentage multiplier for different screen sizes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'font_scale'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN font_scale DECIMAL(3,2) DEFAULT 1.00;
  END IF;

  -- Line height (multiplier for line spacing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'line_height'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN line_height DECIMAL(3,2) DEFAULT 1.5;
  END IF;

  -- ============================================================================
  -- Additional Color Variants
  -- ============================================================================

  -- Success color (for positive notifications)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'success_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN success_color VARCHAR(7) DEFAULT '#10b981';
  END IF;

  -- Warning color (for alerts)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'warning_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN warning_color VARCHAR(7) DEFAULT '#f59e0b';
  END IF;

  -- Error color (for errors and destructive actions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'error_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN error_color VARCHAR(7) DEFAULT '#ef4444';
  END IF;

  -- Info color (for informational messages)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'info_color'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN info_color VARCHAR(7) DEFAULT '#3b82f6';
  END IF;

  -- ============================================================================
  -- Border Radius Settings
  -- ============================================================================

  -- Border radius for cards (pixels)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'border_radius'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN border_radius INTEGER DEFAULT 8;
  END IF;

  -- Border radius for buttons (pixels)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'button_border_radius'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN button_border_radius INTEGER DEFAULT 6;
  END IF;

  -- Border radius for inputs (pixels)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'input_border_radius'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN input_border_radius INTEGER DEFAULT 6;
  END IF;

  -- ============================================================================
  -- Shadows and Effects
  -- ============================================================================

  -- Shadow intensity (none, subtle, normal, strong)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'shadow_intensity'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN shadow_intensity VARCHAR(20) DEFAULT 'normal';
  END IF;

  -- Card shadow enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'card_shadow_enabled'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN card_shadow_enabled BOOLEAN DEFAULT true;
  END IF;

  -- ============================================================================
  -- Spacing Settings
  -- ============================================================================

  -- Space scale (tight, normal, relaxed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'space_scale'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN space_scale VARCHAR(20) DEFAULT 'normal';
  END IF;

  -- ============================================================================
  -- Soft Delete Support
  -- ============================================================================

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding_settings'
    AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE company_branding_settings
    ADD COLUMN deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

END $$;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_company_branding_settings_is_deleted
  ON company_branding_settings(is_deleted)
  WHERE is_deleted = false;

-- Index for theme preset queries
CREATE INDEX IF NOT EXISTS idx_company_branding_settings_theme_preset
  ON company_branding_settings(theme_preset)
  WHERE is_deleted = false;

-- ============================================================================
-- Row Level Security (RLS) Policies - Ensure they exist and are updated
-- ============================================================================

-- Enable RLS (if not already enabled)
ALTER TABLE company_branding_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Super admins can access all company branding settings" ON company_branding_settings;
  DROP POLICY IF EXISTS "Company users can access their own company branding settings" ON company_branding_settings;
  DROP POLICY IF EXISTS "Public cannot access company branding settings" ON company_branding_settings;
END $$;

-- Policy: Super admins can access all company branding settings
CREATE POLICY "Super admins can access all company branding settings"
  ON company_branding_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = auth.uid()
      AND ur.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- Policy: Company users can access their own company branding settings
CREATE POLICY "Company users can access their own company branding settings"
  ON company_branding_settings
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
    AND is_deleted = false
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
    AND is_deleted = false
  );

-- Policy: Public cannot access any company branding settings
CREATE POLICY "Public cannot access company branding settings"
  ON company_branding_settings
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- Helpful Functions
-- ============================================================================

-- Function to get branding settings with defaults
CREATE OR REPLACE FUNCTION get_company_branding(p_company_id UUID)
RETURNS company_branding_settings AS $$
DECLARE
  v_branding company_branding_settings;
BEGIN
  SELECT * INTO v_branding
  FROM company_branding_settings
  WHERE company_id = p_company_id
    AND is_deleted = false
  LIMIT 1;

  -- Return branding settings or NULL (application should use defaults)
  RETURN v_branding;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to apply branding CSS variables to a context
CREATE OR REPLACE FUNCTION get_branding_css_variables(p_company_id UUID)
RETURNS TABLE(css_variable TEXT, css_value TEXT) AS $$
DECLARE
  v_branding company_branding_settings;
BEGIN
  SELECT * INTO v_branding
  FROM company_branding_settings
  WHERE company_id = p_company_id
    AND is_deleted = false
  LIMIT 1;

  -- Return CSS variables as rows
  RETURN QUERY
  SELECT
    '--primary'::TEXT,
    v_branding.primary_color::TEXT
  UNION ALL
  SELECT
    '--secondary'::TEXT,
    v_branding.secondary_color::TEXT
  UNION ALL
  SELECT
    '--accent'::TEXT,
    v_branding.accent_color::TEXT
  UNION ALL
  SELECT
    '--background'::TEXT,
    v_branding.background_color::TEXT
  UNION ALL
  SELECT
    '--text'::TEXT,
    v_branding.text_color::TEXT
  UNION ALL
  SELECT
    '--sidebar-background'::TEXT,
    v_branding.sidebar_background_color::TEXT
  UNION ALL
  SELECT
    '--sidebar-foreground'::TEXT,
    v_branding.sidebar_foreground_color::TEXT
  UNION ALL
  SELECT
    '--sidebar-accent'::TEXT,
    v_branding.sidebar_accent_color::TEXT
  UNION ALL
  SELECT
    '--sidebar-border'::TEXT,
    v_branding.sidebar_border_color::TEXT
  UNION ALL
  SELECT
    '--contract-header-color'::TEXT,
    v_branding.contract_header_color::TEXT
  UNION ALL
  SELECT
    '--contract-accent-color'::TEXT,
    v_branding.contract_accent_color::TEXT
  UNION ALL
  SELECT
    '--contract-text-color'::TEXT,
    v_branding.contract_text_color::TEXT
  UNION ALL
  SELECT
    '--contract-background-color'::TEXT,
    v_branding.contract_background_color::TEXT
  UNION ALL
  SELECT
    '--success'::TEXT,
    v_branding.success_color::TEXT
  UNION ALL
  SELECT
    '--warning'::TEXT,
    v_branding.warning_color::TEXT
  UNION ALL
  SELECT
    '--error'::TEXT,
    v_branding.error_color::TEXT
  UNION ALL
  SELECT
    '--info'::TEXT,
    v_branding.info_color::TEXT
  UNION ALL
  SELECT
    '--font-sans'::TEXT,
    v_branding.font_family::TEXT
  UNION ALL
  SELECT
    '--font-size-base'::TEXT,
    (v_branding.font_size_base || 'px')::TEXT
  UNION ALL
  SELECT
    '--border-radius'::TEXT,
    (v_branding.border_radius || 'px')::TEXT
  UNION ALL
  SELECT
    '--button-border-radius'::TEXT,
    (v_branding.button_border_radius || 'px')::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN company_branding_settings.contract_header_color IS 'Primary color for contract headers';
COMMENT ON COLUMN company_branding_settings.contract_accent_color IS 'Secondary accent color for contracts';
COMMENT ON COLUMN company_branding_settings.contract_footer_text IS 'Custom footer text for printed contracts';
COMMENT ON COLUMN company_branding_settings.print_logo_size IS 'Logo size for print (small, medium, large, extra-large, none)';
COMMENT ON COLUMN company_branding_settings.print_paper_size IS 'Paper size for print (a4, letter, legal)';
COMMENT ON COLUMN company_branding_settings.font_size_base IS 'Base font size in pixels (10-24)';
COMMENT ON COLUMN company_branding_settings.font_scale IS 'Font scale multiplier (0.8-1.5)';
COMMENT ON COLUMN company_branding_settings.line_height IS 'Line height multiplier (1.0-2.5)';
COMMENT ON COLUMN company_branding_settings.success_color IS 'Color for success notifications (green)';
COMMENT ON COLUMN company_branding_settings.warning_color IS 'Color for warning alerts (amber)';
COMMENT ON COLUMN company_branding_settings.error_color IS 'Color for errors (red)';
COMMENT ON COLUMN company_branding_settings.info_color IS 'Color for informational messages (blue)';
COMMENT ON COLUMN company_branding_settings.border_radius IS 'Border radius for cards (0-32px)';
COMMENT ON COLUMN company_branding_settings.shadow_intensity IS 'Shadow intensity (none, subtle, normal, strong)';
COMMENT ON COLUMN company_branding_settings.space_scale IS 'Spacing scale (tight, normal, relaxed)';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_company_branding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branding_css_variables(UUID) TO authenticated;;
