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

-- إنشاء جدول أنواع الحسابات المحاسبية للعملاء
CREATE TABLE IF NOT EXISTS public.customer_account_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name TEXT NOT NULL,
    type_name_ar TEXT NOT NULL,
    account_category TEXT NOT NULL,
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

-- دالة لإنشاء الحسابات المحاسبية للعميل تلقائياً
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    p_customer_id UUID,
    p_company_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    account_type_record RECORD;
    new_account_id UUID;
    account_code TEXT;
    account_name TEXT;
    customer_name TEXT;
    created_count INTEGER := 0;
BEGIN
    -- الحصول على اسم العميل
    SELECT 
        CASE 
            WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
            ELSE company_name 
        END 
    INTO customer_name
    FROM public.customers 
    WHERE id = p_customer_id;
    
    -- إنشاء حساب لكل نوع من أنواع الحسابات
    FOR account_type_record IN 
        SELECT * FROM public.customer_account_types WHERE is_active = true
    LOOP
        -- توليد كود الحساب
        account_code := CASE account_type_record.account_category
            WHEN 'receivables' THEN '1211' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.chart_of_accounts 
                WHERE company_id = p_company_id 
                AND account_code LIKE '1211%'
            )::TEXT, 3, '0')
            WHEN 'advances' THEN '1213' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.chart_of_accounts 
                WHERE company_id = p_company_id 
                AND account_code LIKE '1213%'
            )::TEXT, 3, '0')
            WHEN 'deposits' THEN '2111' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.chart_of_accounts 
                WHERE company_id = p_company_id 
                AND account_code LIKE '2111%'
            )::TEXT, 3, '0')
            WHEN 'discounts' THEN '5121' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.chart_of_accounts 
                WHERE company_id = p_company_id 
                AND account_code LIKE '5121%'
            )::TEXT, 3, '0')
            ELSE '1211001'
        END;
        
        -- توليد اسم الحساب
        account_name := customer_name || ' - ' || account_type_record.type_name_ar;
        
        -- إنشاء الحساب في دليل الحسابات
        INSERT INTO public.chart_of_accounts (
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type,
            account_level,
            is_header,
            is_active,
            can_link_customers
        ) VALUES (
            p_company_id,
            account_code,
            account_name,
            account_name,
            CASE account_type_record.account_category
                WHEN 'receivables' THEN 'asset'
                WHEN 'advances' THEN 'asset'
                WHEN 'deposits' THEN 'liability'
                WHEN 'discounts' THEN 'expense'
                ELSE 'asset'
            END,
            CASE account_type_record.account_category
                WHEN 'receivables' THEN 'debit'
                WHEN 'advances' THEN 'debit'
                WHEN 'deposits' THEN 'credit'
                WHEN 'discounts' THEN 'debit'
                ELSE 'debit'
            END,
            5,
            false,
            true,
            true
        ) RETURNING id INTO new_account_id;
        
        -- ربط الحساب بالعميل
        INSERT INTO public.customer_accounts (
            customer_id,
            company_id,
            account_id,
            account_type_id,
            is_default,
            currency,
            is_active
        ) VALUES (
            p_customer_id,
            p_company_id,
            new_account_id,
            account_type_record.id,
            account_type_record.account_category = 'receivables',
            'KWD',
            true
        );
        
        created_count := created_count + 1;
    END LOOP;
    
    RETURN created_count;
END;
$$;

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