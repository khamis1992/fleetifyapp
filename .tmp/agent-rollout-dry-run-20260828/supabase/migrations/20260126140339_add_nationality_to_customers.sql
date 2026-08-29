-- إضافة عمود الجنسية لجدول العملاء
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nationality TEXT;

-- إضافة تعليق
COMMENT ON COLUMN customers.nationality IS 'جنسية العميل';;
