-- إضافة عمود created_via لجدول العقود لتتبع طريقة إنشاء العقد
ALTER TABLE contracts 
ADD COLUMN created_via text DEFAULT 'manual'::text;

-- إضافة تعليق للعمود
COMMENT ON COLUMN contracts.created_via IS 'طريقة إنشاء العقد: manual, smart_upload, api, etc.';

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_contracts_created_via ON contracts(created_via);

-- تحديث العقود الموجودة لتكون manual
UPDATE contracts SET created_via = 'manual' WHERE created_via IS NULL;