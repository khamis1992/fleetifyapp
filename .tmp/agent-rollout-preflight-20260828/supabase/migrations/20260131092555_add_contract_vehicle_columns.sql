-- إضافة أعمدة بيانات العقد والمركبة
ALTER TABLE lawsuit_templates
ADD COLUMN IF NOT EXISTS contract_number TEXT,
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS monthly_rent DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_contract_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vehicle_plate_number TEXT,
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS vehicle_year INTEGER,
ADD COLUMN IF NOT EXISTS compensation_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN lawsuit_templates.contract_number IS 'رقم العقد';
COMMENT ON COLUMN lawsuit_templates.contract_start_date IS 'تاريخ بداية العقد';
COMMENT ON COLUMN lawsuit_templates.contract_end_date IS 'تاريخ نهاية العقد';
COMMENT ON COLUMN lawsuit_templates.monthly_rent IS 'مبلغ الإيجار الشهري';
COMMENT ON COLUMN lawsuit_templates.total_contract_amount IS 'إجمالي مبلغ العقد';
COMMENT ON COLUMN lawsuit_templates.vehicle_plate_number IS 'رقم اللوحة';
COMMENT ON COLUMN lawsuit_templates.vehicle_type IS 'نوع المركبة';
COMMENT ON COLUMN lawsuit_templates.vehicle_model IS 'موديل المركبة';
COMMENT ON COLUMN lawsuit_templates.vehicle_year IS 'سنة الصنع';
COMMENT ON COLUMN lawsuit_templates.compensation_amount IS 'مبلغ التعويض';;
