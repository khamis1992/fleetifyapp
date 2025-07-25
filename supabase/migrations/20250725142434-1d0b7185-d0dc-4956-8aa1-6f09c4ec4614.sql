-- إنشاء دالة لحساب المبالغ الفعلية للموازنة من الفواتير والمدفوعات
CREATE OR REPLACE FUNCTION public.update_budget_actual_amounts(budget_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    budget_record record;
    item_record record;
    actual_amount numeric;
BEGIN
    -- الحصول على تفاصيل الموازنة
    SELECT * INTO budget_record
    FROM public.budgets
    WHERE id = budget_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Budget not found';
    END IF;
    
    -- تحديث المبالغ الفعلية لكل بند في الموازنة
    FOR item_record IN 
        SELECT bi.*, coa.account_type 
        FROM public.budget_items bi
        JOIN public.chart_of_accounts coa ON bi.account_id = coa.id
        WHERE bi.budget_id = budget_id_param
    LOOP
        actual_amount := 0;
        
        -- حساب المبلغ الفعلي من الفواتير
        IF item_record.account_type = 'revenue' THEN
            -- للإيرادات: جمع فواتير المبيعات
            SELECT COALESCE(SUM(i.total_amount), 0) INTO actual_amount
            FROM public.invoices i
            JOIN public.invoice_items ii ON i.id = ii.invoice_id
            WHERE ii.account_id = item_record.account_id
            AND i.company_id = budget_record.company_id
            AND i.invoice_type = 'sales'
            AND i.status IN ('sent', 'paid')
            AND EXTRACT(year FROM i.invoice_date) = budget_record.budget_year;
            
        ELSIF item_record.account_type = 'expenses' THEN
            -- للمصروفات: جمع فواتير المشتريات والمدفوعات
            SELECT COALESCE(SUM(i.total_amount), 0) INTO actual_amount
            FROM public.invoices i
            JOIN public.invoice_items ii ON i.id = ii.invoice_id
            WHERE ii.account_id = item_record.account_id
            AND i.company_id = budget_record.company_id
            AND i.invoice_type = 'purchase'
            AND i.status IN ('sent', 'paid')
            AND EXTRACT(year FROM i.invoice_date) = budget_record.budget_year;
            
            -- إضافة المدفوعات المباشرة
            SELECT actual_amount + COALESCE(SUM(jel.debit_amount), 0) INTO actual_amount
            FROM public.journal_entry_lines jel
            JOIN public.journal_entries je ON jel.journal_entry_id = je.id
            WHERE jel.account_id = item_record.account_id
            AND je.company_id = budget_record.company_id
            AND je.status = 'posted'
            AND EXTRACT(year FROM je.entry_date) = budget_record.budget_year
            AND je.reference_type IN ('payment', 'manual');
        END IF;
        
        -- تحديث بند الموازنة بالمبلغ الفعلي وحساب التباين
        UPDATE public.budget_items
        SET 
            actual_amount = actual_amount,
            variance_amount = budgeted_amount - actual_amount,
            variance_percentage = CASE 
                WHEN budgeted_amount > 0 THEN 
                    ((budgeted_amount - actual_amount) / budgeted_amount) * 100
                ELSE 0 
            END,
            updated_at = now()
        WHERE id = item_record.id;
    END LOOP;
    
    -- تحديث إجماليات الموازنة
    UPDATE public.budgets
    SET 
        total_revenue = (
            SELECT COALESCE(SUM(
                CASE WHEN coa.account_type = 'revenue' THEN bi.actual_amount ELSE 0 END
            ), 0)
            FROM public.budget_items bi
            JOIN public.chart_of_accounts coa ON bi.account_id = coa.id
            WHERE bi.budget_id = budget_id_param
        ),
        total_expenses = (
            SELECT COALESCE(SUM(
                CASE WHEN coa.account_type = 'expenses' THEN bi.actual_amount ELSE 0 END
            ), 0)
            FROM public.budget_items bi
            JOIN public.chart_of_accounts coa ON bi.account_id = coa.id
            WHERE bi.budget_id = budget_id_param
        ),
        updated_at = now()
    WHERE id = budget_id_param;
    
    -- تحديث صافي الدخل
    UPDATE public.budgets
    SET net_income = total_revenue - total_expenses
    WHERE id = budget_id_param;
END;
$function$;

-- إنشاء دالة لتحديث جميع الموازنات في الشركة
CREATE OR REPLACE FUNCTION public.update_all_company_budgets(company_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    budget_record record;
    updated_count integer := 0;
BEGIN
    -- تحديث جميع الموازنات النشطة في الشركة
    FOR budget_record IN 
        SELECT id FROM public.budgets 
        WHERE company_id = company_id_param 
        AND status IN ('approved', 'active')
    LOOP
        PERFORM update_budget_actual_amounts(budget_record.id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$function$;

-- إنشاء trigger لتحديث الموازنات عند تغيير الفواتير
CREATE OR REPLACE FUNCTION public.handle_invoice_budget_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    budget_ids uuid[];
BEGIN
    -- العثور على الموازنات المتأثرة بهذه الفاتورة
    SELECT ARRAY_AGG(DISTINCT b.id) INTO budget_ids
    FROM public.budgets b
    JOIN public.budget_items bi ON b.id = bi.budget_id
    JOIN public.invoice_items ii ON bi.account_id = ii.account_id
    WHERE ii.invoice_id = COALESCE(NEW.id, OLD.id)
    AND b.company_id = COALESCE(NEW.company_id, OLD.company_id)
    AND b.budget_year = EXTRACT(year FROM COALESCE(NEW.invoice_date, OLD.invoice_date))
    AND b.status IN ('approved', 'active');
    
    -- تحديث الموازنات المتأثرة
    IF budget_ids IS NOT NULL THEN
        FOR i IN 1..array_length(budget_ids, 1) LOOP
            PERFORM update_budget_actual_amounts(budget_ids[i]);
        END LOOP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- إنشاء trigger لتحديث الموازنات عند تغيير المدفوعات
CREATE OR REPLACE FUNCTION public.handle_payment_budget_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    budget_ids uuid[];
BEGIN
    -- العثور على الموازنات المتأثرة بهذه الدفعة
    SELECT ARRAY_AGG(DISTINCT b.id) INTO budget_ids
    FROM public.budgets b
    WHERE b.company_id = COALESCE(NEW.company_id, OLD.company_id)
    AND b.budget_year = EXTRACT(year FROM COALESCE(NEW.payment_date, OLD.payment_date))
    AND b.status IN ('approved', 'active');
    
    -- تحديث الموازنات المتأثرة
    IF budget_ids IS NOT NULL THEN
        FOR i IN 1..array_length(budget_ids, 1) LOOP
            PERFORM update_budget_actual_amounts(budget_ids[i]);
        END LOOP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- إنشاء الـ triggers
DROP TRIGGER IF EXISTS invoice_budget_update_trigger ON public.invoices;
CREATE TRIGGER invoice_budget_update_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_invoice_budget_update();

DROP TRIGGER IF EXISTS payment_budget_update_trigger ON public.payments;
CREATE TRIGGER payment_budget_update_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_budget_update();

-- إنشاء جدول لتتبع تنبيهات تجاوز الموازنة
CREATE TABLE IF NOT EXISTS public.budget_alerts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    budget_id uuid NOT NULL,
    budget_item_id uuid,
    alert_type text NOT NULL DEFAULT 'budget_exceeded',
    threshold_percentage numeric NOT NULL DEFAULT 100,
    current_percentage numeric NOT NULL DEFAULT 0,
    amount_exceeded numeric NOT NULL DEFAULT 0,
    message text NOT NULL,
    message_ar text,
    is_acknowledged boolean DEFAULT false,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- تمكين RLS على جدول التنبيهات
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS للتنبيهات
CREATE POLICY "Users can view budget alerts in their company" 
ON public.budget_alerts 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage budget alerts in their company" 
ON public.budget_alerts 
FOR ALL 
USING (
    company_id = get_user_company(auth.uid()) 
    AND (
        has_role(auth.uid(), 'company_admin'::user_role) 
        OR has_role(auth.uid(), 'manager'::user_role)
    )
);

-- إنشاء دالة لفحص تجاوز الموازنة وإنشاء التنبيهات
CREATE OR REPLACE FUNCTION public.check_budget_overruns(budget_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    budget_record record;
    item_record record;
    alert_count integer := 0;
    overrun_percentage numeric;
    exceeded_amount numeric;
BEGIN
    -- الحصول على تفاصيل الموازنة
    SELECT * INTO budget_record
    FROM public.budgets
    WHERE id = budget_id_param;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- فحص كل بند في الموازنة
    FOR item_record IN 
        SELECT bi.*, coa.account_name, coa.account_name_ar
        FROM public.budget_items bi
        JOIN public.chart_of_accounts coa ON bi.account_id = coa.id
        WHERE bi.budget_id = budget_id_param
        AND bi.budgeted_amount > 0
    LOOP
        -- حساب نسبة التجاوز
        overrun_percentage := (item_record.actual_amount / item_record.budgeted_amount) * 100;
        exceeded_amount := item_record.actual_amount - item_record.budgeted_amount;
        
        -- إنشاء تنبيه إذا تم تجاوز 90% من الموازنة
        IF overrun_percentage >= 90 AND exceeded_amount > 0 THEN
            -- التحقق من وجود تنبيه مماثل غير مؤكد
            IF NOT EXISTS (
                SELECT 1 FROM public.budget_alerts
                WHERE budget_id = budget_id_param
                AND budget_item_id = item_record.id
                AND alert_type = 'budget_exceeded'
                AND is_acknowledged = false
            ) THEN
                INSERT INTO public.budget_alerts (
                    company_id,
                    budget_id,
                    budget_item_id,
                    alert_type,
                    threshold_percentage,
                    current_percentage,
                    amount_exceeded,
                    message,
                    message_ar
                ) VALUES (
                    budget_record.company_id,
                    budget_id_param,
                    item_record.id,
                    'budget_exceeded',
                    90,
                    overrun_percentage,
                    exceeded_amount,
                    'Budget exceeded for account: ' || item_record.account_name,
                    'تم تجاوز الموازنة للحساب: ' || COALESCE(item_record.account_name_ar, item_record.account_name)
                );
                
                alert_count := alert_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN alert_count;
END;
$function$;