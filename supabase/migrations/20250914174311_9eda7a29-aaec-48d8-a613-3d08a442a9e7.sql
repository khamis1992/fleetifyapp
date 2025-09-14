-- Professional Payment System Migration (Fixed)
-- إنشاء نظام المدفوعات الاحترافي

-- ===============================
-- جداول التوزيع فقط
-- ===============================

-- جدول توزيع المدفوعات
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    allocation_type TEXT NOT NULL CHECK (allocation_type IN ('contract', 'invoice', 'obligation', 'late_fee')),
    target_id UUID NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    allocated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    allocation_method TEXT NOT NULL DEFAULT 'manual' CHECK (allocation_method IN ('auto', 'manual', 'proportional')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT positive_allocation_amount CHECK (amount > 0)
);

-- قواعد التوزيع
CREATE TABLE IF NOT EXISTS public.payment_allocation_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 1,
    conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_rule_name_per_company UNIQUE (company_id, name)
);

-- قوالب المحاسبة
CREATE TABLE IF NOT EXISTS public.accounting_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT NOT NULL CHECK (template_type IN ('payment_receipt', 'payment_made', 'invoice_sales', 'invoice_purchase', 'contract_revenue')),
    conditions JSONB NOT NULL DEFAULT '[]',
    entries JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_template_name_per_company UNIQUE (company_id, name)
);

-- ===============================
-- تحديث جدول المدفوعات
-- ===============================

-- إضافة حقول جديدة لجدول المدفوعات
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS allocation_status TEXT DEFAULT 'unallocated' CHECK (allocation_status IN ('unallocated', 'partially_allocated', 'fully_allocated')),
ADD COLUMN IF NOT EXISTS linking_confidence NUMERIC DEFAULT 0 CHECK (linking_confidence >= 0 AND linking_confidence <= 1),
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_notes TEXT;

-- ===============================
-- الفهارس
-- ===============================

-- فهارس جدول توزيع المدفوعات
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_target_id ON public.payment_allocations(target_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_allocation_type ON public.payment_allocations(allocation_type);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_allocated_date ON public.payment_allocations(allocated_date);

-- ===============================
-- Row Level Security (RLS)
-- ===============================

-- تفعيل RLS
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_templates ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لتوزيع المدفوعات
DROP POLICY IF EXISTS "Users can view payment allocations in their company" ON public.payment_allocations;
CREATE POLICY "Users can view payment allocations in their company" 
ON public.payment_allocations 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.payments p 
    WHERE p.id = payment_id AND p.company_id = get_user_company(auth.uid())
));

DROP POLICY IF EXISTS "Staff can manage payment allocations in their company" ON public.payment_allocations;
CREATE POLICY "Staff can manage payment allocations in their company" 
ON public.payment_allocations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    EXISTS (
        SELECT 1 FROM public.payments p 
        WHERE p.id = payment_id 
        AND p.company_id = get_user_company(auth.uid())
        AND (
            has_role(auth.uid(), 'company_admin'::user_role) OR 
            has_role(auth.uid(), 'manager'::user_role) OR 
            has_role(auth.uid(), 'sales_agent'::user_role)
        )
    )
);

-- سياسات الأمان لقواعد التوزيع
DROP POLICY IF EXISTS "Users can view allocation rules in their company" ON public.payment_allocation_rules;
CREATE POLICY "Users can view allocation rules in their company" 
ON public.payment_allocation_rules 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage allocation rules in their company" ON public.payment_allocation_rules;
CREATE POLICY "Admins can manage allocation rules in their company" 
ON public.payment_allocation_rules 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role)
    ))
);

-- سياسات الأمان لقوالب المحاسبة
DROP POLICY IF EXISTS "Users can view accounting templates in their company" ON public.accounting_templates;
CREATE POLICY "Users can view accounting templates in their company" 
ON public.accounting_templates 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage accounting templates in their company" ON public.accounting_templates;
CREATE POLICY "Admins can manage accounting templates in their company" 
ON public.accounting_templates 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role)
    ))
);

-- ===============================
-- Functions
-- ===============================

-- دالة تحديث تاريخ التعديل
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق trigger على الجداول الجديدة
DROP TRIGGER IF EXISTS update_payment_allocations_updated_at ON public.payment_allocations;
CREATE TRIGGER update_payment_allocations_updated_at BEFORE UPDATE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_allocation_rules_updated_at ON public.payment_allocation_rules;
CREATE TRIGGER update_payment_allocation_rules_updated_at BEFORE UPDATE ON public.payment_allocation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounting_templates_updated_at ON public.accounting_templates;
CREATE TRIGGER update_accounting_templates_updated_at BEFORE UPDATE ON public.accounting_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- البيانات الافتراضية
-- ===============================

-- إدراج قواعد توزيع افتراضية
INSERT INTO public.payment_allocation_rules (company_id, name, description, priority, conditions, actions, enabled)
SELECT 
    c.id,
    'توزيع تلقائي للعقود',
    'توزيع المدفوعات تلقائياً على العقود المرتبطة',
    1,
    '[{"field": "contract_id", "operator": "equals", "value": null, "logicalOperator": "AND"}]'::jsonb,
    '[{"type": "allocate_to_contract", "target": "contract_id", "amount": "full", "notes": "توزيع تلقائي على العقد"}]'::jsonb,
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.payment_allocation_rules 
    WHERE company_id = c.id AND name = 'توزيع تلقائي للعقود'
);

-- إدراج قوالب محاسبية افتراضية
INSERT INTO public.accounting_templates (company_id, name, description, template_type, conditions, entries, enabled, priority)
SELECT 
    c.id,
    'قالب مدفوعات القبض',
    'قالب افتراضي لمدفوعات القبض',
    'payment_receipt',
    '[{"field": "payment_type", "operator": "equals", "value": "receipt"}]'::jsonb,
    '[
        {
            "account_type": "debit",
            "account_selector": {"type": "bank_account"},
            "amount_selector": {"type": "full_amount"},
            "description_template": "قبض نقدية - {payment_number}",
            "line_number": 1
        },
        {
            "account_type": "credit",
            "account_selector": {"type": "linked_account"},
            "amount_selector": {"type": "full_amount"},
            "description_template": "إيراد من {customer_name}",
            "line_number": 2
        }
    ]'::jsonb,
    true,
    1
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounting_templates 
    WHERE company_id = c.id AND name = 'قالب مدفوعات القبض'
);

-- ===============================
-- تعليقات الجداول
-- ===============================

COMMENT ON TABLE public.payment_allocations IS 'جدول توزيع المدفوعات على العقود والفواتير والالتزامات';
COMMENT ON TABLE public.payment_allocation_rules IS 'قواعد التوزيع التلقائي للمدفوعات';
COMMENT ON TABLE public.accounting_templates IS 'قوالب القيود المحاسبية التلقائية';

COMMENT ON COLUMN public.payments.allocation_status IS 'حالة توزيع المدفوعة';
COMMENT ON COLUMN public.payments.linking_confidence IS 'مستوى الثقة في ربط المدفوعة بالعقد';
COMMENT ON COLUMN public.payments.processing_status IS 'حالة معالجة المدفوعة في النظام الاحترافي';
COMMENT ON COLUMN public.payments.processing_notes IS 'ملاحظات المعالجة';