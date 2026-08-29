-- إضافة أعمدة اتجاه القضية ونتيجتها
-- 1. اتجاه القضية: هل القضية مرفوعة منا أو ضدنا
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS case_direction TEXT DEFAULT 'filed_by_us' 
CHECK (case_direction IN ('filed_by_us', 'filed_against_us'));

COMMENT ON COLUMN legal_cases.case_direction IS 'اتجاه القضية: filed_by_us = رفعناها نحن، filed_against_us = مرفوعة ضدنا';

-- 2. نوع النتيجة: ربح، خسارة، تسوية، رفض
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS outcome_type TEXT 
CHECK (outcome_type IN ('won', 'lost', 'settled', 'dismissed', 'pending') OR outcome_type IS NULL);

COMMENT ON COLUMN legal_cases.outcome_type IS 'نتيجة القضية: won=ربح، lost=خسارة، settled=تسوية، dismissed=رفض';

-- 3. المبلغ المحكوم به
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS outcome_amount NUMERIC(15,2) DEFAULT 0;

COMMENT ON COLUMN legal_cases.outcome_amount IS 'المبلغ المحكوم به أو قيمة التسوية';

-- 4. نوع المبلغ: غرامة، تعويض، تسوية، رسوم
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS outcome_amount_type TEXT 
CHECK (outcome_amount_type IN ('fine', 'compensation', 'settlement', 'court_fees', 'other') OR outcome_amount_type IS NULL);

COMMENT ON COLUMN legal_cases.outcome_amount_type IS 'نوع المبلغ: fine=غرامة، compensation=تعويض، settlement=تسوية، court_fees=رسوم قضائية';

-- 5. اتجاه الدفع: نستلم أو ندفع
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS payment_direction TEXT 
CHECK (payment_direction IN ('receive', 'pay') OR payment_direction IS NULL);

COMMENT ON COLUMN legal_cases.payment_direction IS 'اتجاه الدفع: receive=نستلم، pay=ندفع';

-- 6. تاريخ صدور الحكم
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS outcome_date DATE;

COMMENT ON COLUMN legal_cases.outcome_date IS 'تاريخ صدور الحكم أو التسوية';

-- 7. ربط بالقيد المحاسبي
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS outcome_journal_entry_id UUID REFERENCES journal_entries(id);

COMMENT ON COLUMN legal_cases.outcome_journal_entry_id IS 'معرف القيد المحاسبي المرتبط بنتيجة القضية';

-- 8. ملاحظات النتيجة
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

COMMENT ON COLUMN legal_cases.outcome_notes IS 'ملاحظات إضافية حول نتيجة القضية';

-- 9. حالة الدفع للنتيجة
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS outcome_payment_status TEXT DEFAULT 'pending'
CHECK (outcome_payment_status IN ('pending', 'partial', 'paid', 'received') OR outcome_payment_status IS NULL);

COMMENT ON COLUMN legal_cases.outcome_payment_status IS 'حالة دفع/استلام المبلغ المحكوم به';;
