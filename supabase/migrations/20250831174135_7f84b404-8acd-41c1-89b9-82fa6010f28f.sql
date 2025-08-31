-- إضافة قيمة 'contract_inspection' لقيد inspection_type
DO $$
BEGIN
    -- البحث عن القيد الحالي وتعديله
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'vehicle_condition_reports' 
        AND constraint_name LIKE '%inspection_type%'
        AND constraint_type = 'CHECK'
    ) THEN
        -- حذف القيد القديم
        ALTER TABLE vehicle_condition_reports 
        DROP CONSTRAINT IF EXISTS vehicle_condition_reports_inspection_type_check;
    END IF;
    
    -- إضافة القيد الجديد مع القيم الثلاث
    ALTER TABLE vehicle_condition_reports 
    ADD CONSTRAINT vehicle_condition_reports_inspection_type_check 
    CHECK (inspection_type IN ('pre_dispatch', 'post_dispatch', 'contract_inspection'));
    
END $$;