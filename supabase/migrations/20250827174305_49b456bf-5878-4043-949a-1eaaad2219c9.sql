-- إضافة الحقول المحاسبية الجديدة لجدول العملاء
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS accounting_classification TEXT DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'KWD',
ADD COLUMN IF NOT EXISTS initial_credit_limit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'net_30',
ADD COLUMN IF NOT EXISTS discount_group TEXT,
ADD COLUMN IF NOT EXISTS default_discount_percentage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_exempt TEXT DEFAULT 'no',
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS accounting_settings JSONB DEFAULT '{}';

-- إنشاء جدول أنواع الحسابات المحاسبية للعملاء (بدون قيود)
CREATE TABLE IF NOT EXISTS public.customer_account_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name TEXT NOT NULL,
    type_name_ar TEXT NOT NULL,
    account_category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء جدول إعدادات الحسابات المحاسبية للعملاء
CREATE TABLE IF NOT EXISTS public.customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
    account_type_id UUID REFERENCES public.customer_account_types(id),
    is_default BOOLEAN DEFAULT false,
    currency TEXT DEFAULT 'KWD',
    credit_limit NUMERIC DEFAULT 0,
    account_purpose TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- إدراج أنواع الحسابات الافتراضية
INSERT INTO public.customer_account_types (type_name, type_name_ar, account_category) VALUES
('receivables', 'ذمم مدينة - عملاء', 'receivables'),
('advances', 'سلف وعهد عملاء', 'advances'),
('deposits', 'أمانات عملاء', 'deposits'),
('discounts', 'خصومات مسموحة', 'discounts')
ON CONFLICT DO NOTHING;

-- تمكين RLS للجداول الجديدة
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_account_types ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view customer accounts in their company" ON public.customer_accounts
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage customer accounts in their company" ON public.customer_accounts
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR 
          has_role(auth.uid(), 'manager'::user_role)))
    );

CREATE POLICY "Users can view customer account types" ON public.customer_account_types
    FOR SELECT USING (true);

CREATE POLICY "System can manage customer account types" ON public.customer_account_types
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));