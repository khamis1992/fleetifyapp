-- إصلاح دالة check_budget_variances لحل مشكلة التضارب في أسماء المتغيرات
CREATE OR REPLACE FUNCTION public.check_budget_variances(company_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    budget_item_record RECORD;
    calc_variance_amount NUMERIC;
    calc_variance_percentage NUMERIC;
BEGIN
    -- فحص تباين الميزانية للشركة المحددة
    FOR budget_item_record IN
        SELECT bi.*, b.budget_name, coa.account_name, coa.current_balance
        FROM public.budget_items bi
        JOIN public.budgets b ON bi.budget_id = b.id
        JOIN public.chart_of_accounts coa ON bi.account_id = coa.id
        WHERE b.company_id = company_id_param
        AND b.status = 'approved'
        AND bi.budgeted_amount > 0
    LOOP
        -- حساب التباين
        calc_variance_amount := budget_item_record.actual_amount - budget_item_record.budgeted_amount;
        
        IF budget_item_record.budgeted_amount > 0 THEN
            calc_variance_percentage := (calc_variance_amount / budget_item_record.budgeted_amount) * 100;
        ELSE
            calc_variance_percentage := 0;
        END IF;
        
        -- تحديث عنصر الميزانية
        UPDATE public.budget_items
        SET 
            variance_amount = calc_variance_amount,
            variance_percentage = calc_variance_percentage,
            updated_at = now()
        WHERE id = budget_item_record.id;
        
        -- إنشاء تنبيه إذا تجاوز التباين 10%
        IF ABS(calc_variance_percentage) > 10 THEN
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
                company_id_param,
                budget_item_record.budget_id,
                budget_item_record.id,
                'budget_variance',
                10,
                ABS(calc_variance_percentage),
                ABS(calc_variance_amount),
                'Budget variance detected for ' || budget_item_record.account_name,
                'تم اكتشاف تباين في الميزانية لحساب ' || budget_item_record.account_name
            );
        END IF;
    END LOOP;
END;
$function$;