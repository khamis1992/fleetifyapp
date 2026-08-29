-- جعل حقول التأمين اختيارية
ALTER TABLE vehicle_insurance 
  ALTER COLUMN insurance_company DROP NOT NULL,
  ALTER COLUMN policy_number DROP NOT NULL,
  ALTER COLUMN coverage_type DROP NOT NULL,
  ALTER COLUMN premium_amount DROP NOT NULL,
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- جعل حقول وثائق المركبة اختيارية
ALTER TABLE vehicle_documents
  ALTER COLUMN document_name DROP NOT NULL,
  ALTER COLUMN document_url DROP NOT NULL;

-- إضافة قيم افتراضية
ALTER TABLE vehicle_insurance 
  ALTER COLUMN coverage_type SET DEFAULT 'comprehensive',
  ALTER COLUMN premium_amount SET DEFAULT 0;

ALTER TABLE vehicle_documents
  ALTER COLUMN document_name SET DEFAULT 'استمارة المركبة';;
