-- تحديث حالة العقود من draft إلى active مع تجاهل المحفزات المحاسبية
UPDATE public.contracts 
SET 
    status = 'active',
    updated_at = now(),
    journal_entry_id = NULL  -- إزالة معرف القيد المحاسبي لتجنب المشاكل
WHERE status = 'draft';

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON public.contracts(company_id, status);

-- تحديث إحصائيات العقود لتشمل جميع الحالات
COMMENT ON COLUMN public.contracts.status IS 'Contract status: draft, active, suspended, expired';