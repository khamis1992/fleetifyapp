-- تعطيل المحفزات مؤقتاً لتحديث العقود
ALTER TABLE public.contracts DISABLE TRIGGER ALL;

-- تحديث العقود المسودة إلى نشطة
UPDATE public.contracts 
SET status = 'active', updated_at = now()
WHERE status = 'draft';

-- إعادة تفعيل المحفزات
ALTER TABLE public.contracts ENABLE TRIGGER ALL;

-- إنشاء فهرس للبحث السريع بحالة العقد
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON public.contracts(company_id, status);