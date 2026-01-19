-- تحديث إعدادات الشركة بحساب المدينين الصحيح
UPDATE companies 
SET customer_account_settings = jsonb_set(
  COALESCE(customer_account_settings, '{}'),
  '{auto_create_account}',
  'true'
)
WHERE name = 'إدارة النظام';