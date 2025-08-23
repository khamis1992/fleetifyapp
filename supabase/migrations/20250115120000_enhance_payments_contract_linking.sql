-- إضافة حقول جديدة لجدول المدفوعات لدعم ربط العقود المحسن
-- تاريخ الإنشاء: 2025-01-15 12:00:00

-- إضافة حقول جديدة لجدول المدفوعات
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS agreement_number VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_due_date DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS late_fine_days_overdue INTEGER DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS description_type VARCHAR(100);

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_payments_agreement_number ON public.payments(agreement_number);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_reconciliation_status ON public.payments(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_payments_description_type ON public.payments(description_type);

-- إنشاء جدول لتتبع محاولات الربط
CREATE TABLE IF NOT EXISTS public.payment_contract_linking_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
    attempted_contract_identifiers JSONB,
    matching_contracts JSONB,
    selected_contract_id UUID REFERENCES public.contracts(id),
    linking_confidence DECIMAL(3,2), -- 0.00 to 1.00
    linking_method VARCHAR(50), -- 'agreement_number', 'contract_number', 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    company_id UUID NOT NULL
);

-- تمكين Row Level Security للجدول الجديد
ALTER TABLE public.payment_contract_linking_attempts ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان للجدول الجديد
CREATE POLICY "Users can view linking attempts in their company" 
ON public.payment_contract_linking_attempts 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage linking attempts in their company" 
ON public.payment_contract_linking_attempts 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)))
);

-- إنشاء فهارس للجدول الجديد
CREATE INDEX IF NOT EXISTS idx_payment_linking_attempts_payment_id ON public.payment_contract_linking_attempts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_linking_attempts_contract_id ON public.payment_contract_linking_attempts(selected_contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_linking_attempts_company_id ON public.payment_contract_linking_attempts(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_linking_attempts_confidence ON public.payment_contract_linking_attempts(linking_confidence);

-- دالة للبحث الذكي عن العقود
CREATE OR REPLACE FUNCTION find_contract_by_identifiers(
    p_company_id UUID,
    p_agreement_number TEXT DEFAULT NULL,
    p_contract_number TEXT DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
) RETURNS TABLE (
    contract_id UUID,
    contract_number TEXT,
    confidence DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.contract_number,
        CASE 
            WHEN c.contract_number = p_agreement_number THEN 1.00
            WHEN c.contract_number = p_contract_number THEN 0.95
            WHEN c.description ILIKE '%' || p_agreement_number || '%' THEN 0.80
            WHEN c.customer_id = p_customer_id THEN 0.60
            ELSE 0.30
        END as confidence
    FROM contracts c
    WHERE c.company_id = p_company_id
    AND (
        c.contract_number = p_agreement_number OR
        c.contract_number = p_contract_number OR
        c.description ILIKE '%' || p_agreement_number || '%' OR
        c.customer_id = p_customer_id
    )
    ORDER BY confidence DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب إحصائيات ربط المدفوعات
CREATE OR REPLACE FUNCTION get_payment_linking_stats(p_company_id UUID)
RETURNS TABLE (
    total_payments BIGINT,
    linked_payments BIGINT,
    unlinked_payments BIGINT,
    linking_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_payments,
        COUNT(contract_id) as linked_payments,
        COUNT(*) - COUNT(contract_id) as unlinked_payments,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND((COUNT(contract_id)::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0.00
        END as linking_percentage
    FROM payments 
    WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليقات توضيحية
COMMENT ON COLUMN public.payments.agreement_number IS 'رقم الاتفاقية أو العقد كما يظهر في الوثائق الخارجية';
COMMENT ON COLUMN public.payments.due_date IS 'تاريخ استحقاق الدفعة';
COMMENT ON COLUMN public.payments.original_due_date IS 'تاريخ الاستحقاق الأصلي قبل أي تأجيل';
COMMENT ON COLUMN public.payments.late_fine_days_overdue IS 'عدد أيام التأخير في الدفع';
COMMENT ON COLUMN public.payments.reconciliation_status IS 'حالة تسوية الدفعة (pending, completed, failed)';
COMMENT ON COLUMN public.payments.description_type IS 'نوع أو تصنيف وصف الدفعة';

COMMENT ON TABLE public.payment_contract_linking_attempts IS 'جدول لتتبع محاولات ربط المدفوعات بالعقود';
COMMENT ON FUNCTION find_contract_by_identifiers IS 'دالة للبحث الذكي عن العقود باستخدام معرفات متعددة';
COMMENT ON FUNCTION get_payment_linking_stats IS 'دالة لحساب إحصائيات ربط المدفوعات بالعقود';
