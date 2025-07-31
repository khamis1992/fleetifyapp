-- تحديث العقود المسودة إلى نشطة
UPDATE public.contracts 
SET status = 'active' 
WHERE status = 'draft';

-- إنشاء فهرس للبحث السريع بحالة العقد
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON public.contracts(company_id, status);