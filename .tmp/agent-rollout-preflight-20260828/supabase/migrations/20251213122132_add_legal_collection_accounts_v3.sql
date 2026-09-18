
-- إضافة حسابات الديون المشكوك فيها والتحصيل القانوني
-- لشركة العراف

-- 1. ذمم تحت التحصيل القانوني (أصول متداولة)
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, balance_type,
  parent_account_code, account_level, is_header, is_active, can_link_customers,
  created_at, updated_at
) VALUES (
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  '1203',
  'ذمم تحت التحصيل القانوني',
  'assets',
  'debit',
  '12',
  3,
  false,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (company_id, account_code) DO NOTHING;

-- 2. مخصص الديون المشكوك فيها (أصول سالبة - contra asset)
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, balance_type,
  parent_account_code, account_level, is_header, is_active,
  created_at, updated_at
) VALUES (
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  '1204',
  'مخصص الديون المشكوك فيها',
  'assets',
  'credit',
  '12',
  3,
  false,
  true,
  NOW(),
  NOW()
) ON CONFLICT (company_id, account_code) DO NOTHING;

-- 3. مصروف الديون المشكوك فيها
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, balance_type,
  parent_account_code, account_level, is_header, is_active,
  created_at, updated_at
) VALUES (
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  '5401',
  'مصروف الديون المشكوك فيها',
  'expenses',
  'debit',
  '54',
  3,
  false,
  true,
  NOW(),
  NOW()
) ON CONFLICT (company_id, account_code) DO NOTHING;

-- 4. مصروف الديون المعدومة
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, balance_type,
  parent_account_code, account_level, is_header, is_active,
  created_at, updated_at
) VALUES (
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  '5402',
  'مصروف الديون المعدومة',
  'expenses',
  'debit',
  '54',
  3,
  false,
  true,
  NOW(),
  NOW()
) ON CONFLICT (company_id, account_code) DO NOTHING;

-- 5. إيرادات ديون معدومة محصلة
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, balance_type,
  parent_account_code, account_level, is_header, is_active,
  created_at, updated_at
) VALUES (
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  '4301',
  'إيرادات ديون معدومة محصلة',
  'revenue',
  'credit',
  '43',
  3,
  false,
  true,
  NOW(),
  NOW()
) ON CONFLICT (company_id, account_code) DO NOTHING;

-- 6. مصاريف قانونية وأتعاب محاماة
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, balance_type,
  parent_account_code, account_level, is_header, is_active,
  created_at, updated_at
) VALUES (
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  '5403',
  'مصاريف قانونية وأتعاب محاماة',
  'expenses',
  'debit',
  '54',
  3,
  false,
  true,
  NOW(),
  NOW()
) ON CONFLICT (company_id, account_code) DO NOTHING;
;
