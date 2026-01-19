-- إنشاء إعدادات الوحدات الافتراضية للشركات التي لا تملك إعدادات
-- شركة النور للمقاولات (العقارات)
INSERT INTO module_settings (company_id, module_name, module_config, is_enabled, version)
SELECT 
  '6dfd73fd-221b-4d93-aa98-41f80ce58db2',
  unnest(ARRAY['core', 'finance', 'properties', 'contracts', 'customers', 'tenants']),
  '{}',
  true,
  '1.0.0'
ON CONFLICT (company_id, module_name) DO NOTHING;

-- إضافة إعدادات افتراضية لجميع الشركات الأخرى التي لا تملك إعدادات
WITH companies_without_settings AS (
  SELECT DISTINCT c.id as company_id, c.business_type, c.active_modules
  FROM companies c
  LEFT JOIN module_settings ms ON c.id = ms.company_id
  WHERE ms.company_id IS NULL
    AND c.active_modules IS NOT NULL
    AND array_length(c.active_modules, 1) > 0
)
INSERT INTO module_settings (company_id, module_name, module_config, is_enabled, version)
SELECT 
  cws.company_id,
  unnest(cws.active_modules),
  '{}',
  true,
  '1.0.0'
FROM companies_without_settings cws;