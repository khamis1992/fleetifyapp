-- المرحلة الأولى: إنشاء جدول الالتزامات المالية الموحد
CREATE TABLE IF NOT EXISTS public.customer_financial_obligations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    contract_id UUID,
    obligation_type TEXT NOT NULL DEFAULT 'contract_payment', -- contract_payment, late_fee, penalty, adjustment
    obligation_number TEXT NOT NULL,
    due_date DATE NOT NULL,
    original_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, partial, paid, overdue, cancelled
    priority INTEGER NOT NULL DEFAULT 1, -- 1=high, 2=medium, 3=low
    description TEXT,
    description_ar TEXT,
    installment_number INTEGER,
    late_fee_amount NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_notification_sent BOOLEAN DEFAULT false,
    overdue_notification_sent BOOLEAN DEFAULT false,
    last_reminder_date DATE
);

-- إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_financial_obligations_customer ON public.customer_financial_obligations(customer_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_contract ON public.customer_financial_obligations(contract_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_company ON public.customer_financial_obligations(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_due_date ON public.customer_financial_obligations(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_status ON public.customer_financial_obligations(status);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_composite ON public.customer_financial_obligations(company_id, customer_id, status);

-- إنشاء جدول أرصدة العملاء الموحد
CREATE TABLE IF NOT EXISTS public.customer_financial_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    contract_id UUID, -- NULL للرصيد الإجمالي، UUID محدد لرصيد العقد
    total_obligations NUMERIC NOT NULL DEFAULT 0,
    total_paid NUMERIC NOT NULL DEFAULT 0,
    remaining_balance NUMERIC NOT NULL DEFAULT 0,
    overdue_amount NUMERIC NOT NULL DEFAULT 0,
    current_amount NUMERIC NOT NULL DEFAULT 0, -- المستحق حالياً
    future_amount NUMERIC NOT NULL DEFAULT 0, -- المستحق مستقبلاً
    last_payment_date DATE,
    last_payment_amount NUMERIC DEFAULT 0,
    credit_limit NUMERIC DEFAULT 0,
    days_overdue INTEGER DEFAULT 0,
    aging_30_days NUMERIC DEFAULT 0,
    aging_60_days NUMERIC DEFAULT 0,
    aging_90_days NUMERIC DEFAULT 0,
    aging_over_90_days NUMERIC DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, customer_id, contract_id)
);

-- إنشاء فهارس لجدول الأرصدة
CREATE INDEX IF NOT EXISTS idx_financial_balances_customer ON public.customer_financial_balances(customer_id);
CREATE INDEX IF NOT EXISTS idx_financial_balances_contract ON public.customer_financial_balances(contract_id);
CREATE INDEX IF NOT EXISTS idx_financial_balances_company ON public.customer_financial_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_balances_overdue ON public.customer_financial_balances(overdue_amount) WHERE overdue_amount > 0;

-- إضافة حقول جديدة لجدول المدفوعات الموجود لتحسين التتبع
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS obligation_id UUID,
ADD COLUMN IF NOT EXISTS auto_allocated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allocation_method TEXT DEFAULT 'manual', -- manual, auto_oldest, auto_contract
ADD COLUMN IF NOT EXISTS allocation_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'manual'; -- manual, bank_transfer, online, cash

-- إضافة فهرس للربط مع الالتزامات
CREATE INDEX IF NOT EXISTS idx_payments_obligation ON public.payments(obligation_id);

-- تفعيل RLS للجداول الجديدة
ALTER TABLE public.customer_financial_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_financial_balances ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للالتزامات المالية
CREATE POLICY "Users can view obligations in their company" 
ON public.customer_financial_obligations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage obligations in their company" 
ON public.customer_financial_obligations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    ))
);

-- سياسات الأمان للأرصدة المالية
CREATE POLICY "Users can view balances in their company" 
ON public.customer_financial_balances 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage balances in their company" 
ON public.customer_financial_balances 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    ))
);

-- دالة تحديث حالة الالتزامات بناءً على تاريخ الاستحقاق
CREATE OR REPLACE FUNCTION update_obligations_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    updated_count INTEGER;
BEGIN
    -- تحديث الالتزامات المتأخرة
    UPDATE public.customer_financial_obligations
    SET 
        status = 'overdue',
        updated_at = now()
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE
    AND remaining_amount > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$function$;

-- دالة حساب وتحديث أرصدة العملاء
CREATE OR REPLACE FUNCTION calculate_customer_financial_balance(
    customer_id_param UUID,
    contract_id_param UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    company_id_val UUID;
    total_obligations_val NUMERIC := 0;
    total_paid_val NUMERIC := 0;
    remaining_balance_val NUMERIC := 0;
    overdue_amount_val NUMERIC := 0;
    current_amount_val NUMERIC := 0;
    future_amount_val NUMERIC := 0;
    aging_30_val NUMERIC := 0;
    aging_60_val NUMERIC := 0;
    aging_90_val NUMERIC := 0;
    aging_over_90_val NUMERIC := 0;
    days_overdue_val INTEGER := 0;
    last_payment_date_val DATE;
    last_payment_amount_val NUMERIC := 0;
BEGIN
    -- الحصول على معرف الشركة
    SELECT company_id INTO company_id_val
    FROM customers
    WHERE id = customer_id_param;
    
    IF company_id_val IS NULL THEN
        RETURN;
    END IF;
    
    -- حساب إجمالي الالتزامات
    SELECT 
        COALESCE(SUM(original_amount), 0),
        COALESCE(SUM(paid_amount), 0),
        COALESCE(SUM(remaining_amount), 0)
    INTO total_obligations_val, total_paid_val, remaining_balance_val
    FROM customer_financial_obligations
    WHERE customer_id = customer_id_param
    AND (contract_id_param IS NULL OR contract_id = contract_id_param)
    AND status != 'cancelled';
    
    -- حساب المبالغ المتأخرة والحالية والمستقبلية
    SELECT 
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND remaining_amount > 0 THEN remaining_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN due_date = CURRENT_DATE AND remaining_amount > 0 THEN remaining_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN due_date > CURRENT_DATE AND remaining_amount > 0 THEN remaining_amount ELSE 0 END), 0)
    INTO overdue_amount_val, current_amount_val, future_amount_val
    FROM customer_financial_obligations
    WHERE customer_id = customer_id_param
    AND (contract_id_param IS NULL OR contract_id = contract_id_param)
    AND status != 'cancelled';
    
    -- حساب الشيخوخة (Aging)
    SELECT 
        COALESCE(SUM(CASE 
            WHEN due_date < CURRENT_DATE - INTERVAL '90 days' AND remaining_amount > 0 
            THEN remaining_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE 
            WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' 
            AND due_date < CURRENT_DATE - INTERVAL '60 days' AND remaining_amount > 0 
            THEN remaining_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE 
            WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' 
            AND due_date < CURRENT_DATE - INTERVAL '30 days' AND remaining_amount > 0 
            THEN remaining_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE 
            WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' 
            AND due_date < CURRENT_DATE AND remaining_amount > 0 
            THEN remaining_amount ELSE 0 END), 0)
    INTO aging_over_90_val, aging_90_val, aging_60_val, aging_30_val
    FROM customer_financial_obligations
    WHERE customer_id = customer_id_param
    AND (contract_id_param IS NULL OR contract_id = contract_id_param)
    AND status != 'cancelled';
    
    -- حساب أقدم تاريخ متأخر
    SELECT COALESCE(CURRENT_DATE - MIN(due_date), 0)
    INTO days_overdue_val
    FROM customer_financial_obligations
    WHERE customer_id = customer_id_param
    AND (contract_id_param IS NULL OR contract_id = contract_id_param)
    AND due_date < CURRENT_DATE
    AND remaining_amount > 0
    AND status != 'cancelled';
    
    -- الحصول على آخر دفعة
    SELECT MAX(payment_date), COALESCE(SUM(amount), 0)
    INTO last_payment_date_val, last_payment_amount_val
    FROM payments
    WHERE customer_id = customer_id_param
    AND (contract_id_param IS NULL OR contract_id = contract_id_param)
    AND status = 'completed';
    
    -- إدراج أو تحديث الرصيد
    INSERT INTO customer_financial_balances (
        company_id,
        customer_id,
        contract_id,
        total_obligations,
        total_paid,
        remaining_balance,
        overdue_amount,
        current_amount,
        future_amount,
        aging_30_days,
        aging_60_days,
        aging_90_days,
        aging_over_90_days,
        days_overdue,
        last_payment_date,
        last_payment_amount,
        last_updated
    ) VALUES (
        company_id_val,
        customer_id_param,
        contract_id_param,
        total_obligations_val,
        total_paid_val,
        remaining_balance_val,
        overdue_amount_val,
        current_amount_val,
        future_amount_val,
        aging_30_val,
        aging_60_val,
        aging_90_val,
        aging_over_90_val,
        days_overdue_val,
        last_payment_date_val,
        last_payment_amount_val,
        now()
    )
    ON CONFLICT (company_id, customer_id, contract_id)
    DO UPDATE SET
        total_obligations = EXCLUDED.total_obligations,
        total_paid = EXCLUDED.total_paid,
        remaining_balance = EXCLUDED.remaining_balance,
        overdue_amount = EXCLUDED.overdue_amount,
        current_amount = EXCLUDED.current_amount,
        future_amount = EXCLUDED.future_amount,
        aging_30_days = EXCLUDED.aging_30_days,
        aging_60_days = EXCLUDED.aging_60_days,
        aging_90_days = EXCLUDED.aging_90_days,
        aging_over_90_days = EXCLUDED.aging_over_90_days,
        days_overdue = EXCLUDED.days_overdue,
        last_payment_date = EXCLUDED.last_payment_date,
        last_payment_amount = EXCLUDED.last_payment_amount,
        last_updated = EXCLUDED.last_updated,
        updated_at = now();
END;
$function$;