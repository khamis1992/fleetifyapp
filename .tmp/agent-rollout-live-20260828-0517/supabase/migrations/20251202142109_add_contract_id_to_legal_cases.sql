
-- إضافة عمود contract_id لجدول legal_cases لربط القضية بالعقد
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

-- إضافة index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_legal_cases_contract_id 
ON legal_cases(contract_id);

-- إضافة تعليق للعمود
COMMENT ON COLUMN legal_cases.contract_id IS 'معرف العقد المرتبط بالقضية القانونية';
;
