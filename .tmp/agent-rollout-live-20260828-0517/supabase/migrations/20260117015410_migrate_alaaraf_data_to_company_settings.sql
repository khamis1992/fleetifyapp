-- ============================================================================
-- Migration: Migrate Al-Araf hardcoded data to company_settings and branding
-- Date: 2026-01-17
-- Purpose: Move hardcoded Alaraf company values into new SaaS tables
-- ============================================================================

-- Get the Al-Araf company ID
DO $$
DECLARE
  v_alaraf_company_id UUID;
  v_companies_count INTEGER;
BEGIN
  -- Check if Al-Araf company exists
  SELECT id INTO v_alaraf_company_id
  FROM companies
  WHERE id = '24bc0b21-4e2d-4413-9842-31719a3669f4'  -- Known Al-Araf company ID
  LIMIT 1;

  IF v_alaraf_company_id IS NOT NULL THEN
    RAISE NOTICE 'Found Al-Araf company: %', v_alaraf_company_id;
  ELSE
    -- Try to find by name
    SELECT id INTO v_alaraf_company_id
    FROM companies
    WHERE name LIKE '%العراف%' OR name ILIKE '%alaraf%'
    LIMIT 1;

    IF v_alaraf_company_id IS NOT NULL THEN
      RAISE NOTICE 'Found Al-Araf company by name: %', v_alaraf_company_id;
    ELSE
      RAISE NOTICE 'Al-Araf company not found. Data migration will be skipped.';
      RAISE NOTICE 'Please ensure Al-Araf company exists before running this migration.';
      RETURN;
    END IF;
  END IF;

  -- ============================================================================
  -- Migrate company_settings for Al-Araf
  -- ============================================================================

  INSERT INTO company_settings (
    company_id,
    company_name_ar,
    company_name_en,
    legal_name_ar,
    legal_name_en,
    company_type,
    commercial_register,
    license_number,
    email,
    phone,
    website,
    address_ar,
    address_en,
    city,
    country,
    currency,
    date_format,
    timezone,
    calendar_system,
    work_start_time,
    work_end_time,
    work_days,
    auto_checkout_enabled,
    default_payment_terms_days,
    security_deposit_required,
    security_deposit_percentage,
    late_fee_enabled,
    late_fee_percentage,
    late_fee_grace_period_days,
    whatsapp_enabled,
    email_enabled,
    notifications_enabled,
    payment_reminders_enabled,
    enabled_features,
    created_by
  )
  VALUES (
    v_alaraf_company_id,

    -- Basic Info
    'شركة العراف لتأجير السيارات',
    'Al-Araf Car Rental',
    'شركة العراف لتأجير السيارات ذ.م.م',
    'Al-Araf Car Rental LLC',

    -- Company Type
    'LLC',

    -- Registration
    NULL, -- commercial_register - to be filled with actual value
    NULL, -- license_number - to be filled with actual value

    -- Contact Info
    'info@alaraf.qa',
    '+974 31151919',
    'https://www.alaraf.online',
    NULL, -- address_ar - to be filled with actual value
    NULL, -- address_en - to be filled with actual value
    'Doha',
    'Qatar',

    -- Business Settings
    'QAR',
    'yyyy/MM/dd',
    'Asia/Qatar',
    'gregorian',
    '08:00:00',
    '18:00:00',
    'sunday-thursday',
    false,

    -- Contract Settings
    30, -- default_payment_terms_days
    true, -- security_deposit_required
    10, -- security_deposit_percentage

    -- Late Fee Settings
    true, -- late_fee_enabled
    5.00, -- late_fee_percentage
    3, -- late_fee_grace_period_days

    -- Integration Settings
    false, -- whatsapp_enabled
    true, -- email_enabled

    -- Notifications
    true, -- notifications_enabled
    true, -- payment_reminders_enabled

    -- Enabled Features
    '{
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
      "mobile_app": true,
      "api_access": false
    }'::jsonb,

    -- Audit
    NULL -- created_by - migration user
  )
  ON CONFLICT (company_id)
  DO NOTHING;

  RAISE NOTICE 'Company settings migrated for Al-Araf';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error migrating company settings: %', SQLERRM;
END $$;

-- ============================================================================
-- Update company_branding_settings for Al-Araf with contract-specific colors
-- ============================================================================

UPDATE company_branding_settings
SET
  -- Contract Colors (Al-Araf red theme)
  contract_header_color = '#991B1B',      -- Al-Araf red
  contract_accent_color = '#D97706',        -- Al-Araf gold
  contract_text_color = '#1f2937',
  contract_background_color = '#ffffff',
  contract_border_color = '#e5e7eb',
  contract_footer_text = 'جميع الحقوق محفوظة لشركة العراف لتأجير السيارات © ' || EXTRACT(YEAR FROM CURRENT_DATE),

  -- Invoice Colors
  invoice_header_color = '#991B1B',
  invoice_accent_color = '#D97706',

  -- Report Colors
  report_header_color = '#991B1B',
  report_accent_color = '#D97706',

  -- Print Settings
  print_logo_size = 'large',
  print_paper_size = 'a4',
  print_margins = 'normal',
  print_show_logo = true,
  print_show_company_name = true,
  print_show_address = true,

  -- Typography
  font_size_base = 16,
  font_scale = 1.00,
  line_height = 1.5,

  -- Additional Colors
  success_color = '#10b981',
  warning_color = '#f59e0b',
  error_color = '#991B1B',        -- Al-Araf red as error color
  info_color = '#3b82f6',

  -- Border Radius
  border_radius = 8,
  button_border_radius = 6,
  input_border_radius = 6,

  -- Shadows and Effects
  shadow_intensity = 'normal',
  card_shadow_enabled = true,

  -- Spacing
  space_scale = 'normal'
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  OR company_id IN (
    SELECT id FROM companies
    WHERE name LIKE '%العراف%' OR name ILIKE '%alaraf%'
    LIMIT 1
  );

-- ============================================================================
-- Also update the main branding colors to match Al-Araf theme
-- ============================================================================

UPDATE company_branding_settings
SET
  primary_color = '#991B1B',           -- Al-Araf red
  secondary_color = '#D97706',         -- Al-Araf gold
  accent_color = '#991B1B',           -- Al-Araf red (same as primary)
  background_color = '#ffffff',
  text_color = '#1f2937',
  sidebar_background_color = '#ffffff',
  sidebar_foreground_color = '#1f2937',
  sidebar_accent_color = '#991B1B',     -- Al-Araf red
  sidebar_border_color = '#e5e7eb',
  system_name = 'Fleetify',
  system_name_ar = 'فليتفاي',
  logo_url = COALESCE(logo_url, '/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png'),
  font_family = 'cairo'
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  OR company_id IN (
    SELECT id FROM companies
    WHERE name LIKE '%العراف%' OR name ILIKE '%alaraf%'
    LIMIT 1
  );

-- ============================================================================
-- Verify Migration
-- ============================================================================

DO $$
DECLARE
  v_settings_count INTEGER;
  v_branding_count INTEGER;
BEGIN
  -- Count company_settings
  SELECT COUNT(*) INTO v_settings_count
  FROM company_settings
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    OR company_id IN (
      SELECT id FROM companies
      WHERE name LIKE '%العراف%' OR name ILIKE '%alaraf%'
      LIMIT 1
    );

  -- Count company_branding_settings
  SELECT COUNT(*) INTO v_branding_count
  FROM company_branding_settings
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    OR company_id IN (
      SELECT id FROM companies
      WHERE name LIKE '%العراف%' OR name ILIKE '%alaraf%'
      LIMIT 1
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Verification';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Company settings records: %', v_settings_count;
  RAISE NOTICE 'Company branding records: %', v_branding_count;

  IF v_settings_count > 0 AND v_branding_count > 0 THEN
    RAISE NOTICE 'Migration completed successfully!';
  ELSE
    RAISE NOTICE 'Migration may have issues. Please verify.';
  END IF;

  RAISE NOTICE '========================================';
END $$;;
