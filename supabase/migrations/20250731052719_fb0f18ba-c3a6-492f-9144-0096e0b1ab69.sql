-- تحديث حالة القيود المحاسبية من draft إلى posted
UPDATE public.journal_entries 
SET status = 'posted' 
WHERE status = 'draft';

-- إنشاء دالة لحساب وتحديث الأرصدة الحالية للحسابات
CREATE OR REPLACE FUNCTION public.update_account_balances_from_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    calculated_balance NUMERIC;
BEGIN
    -- تحديث أرصدة جميع الحسابات بناءً على القيود المحاسبية المرحلة
    FOR account_record IN 
        SELECT id, balance_type FROM public.chart_of_accounts 
        WHERE is_active = true
    LOOP
        -- حساب الرصيد للحسابات المدينة
        IF account_record.balance_type = 'debit' THEN
            SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
            INTO calculated_balance
            FROM public.journal_entry_lines jel
            JOIN public.journal_entries je ON jel.journal_entry_id = je.id
            WHERE jel.account_id = account_record.id
            AND je.status = 'posted';
        ELSE
            -- حساب الرصيد للحسابات الدائنة
            SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
            INTO calculated_balance
            FROM public.journal_entry_lines jel
            JOIN public.journal_entries je ON jel.journal_entry_id = je.id
            WHERE jel.account_id = account_record.id
            AND je.status = 'posted';
        END IF;
        
        -- تحديث الرصيد الحالي
        UPDATE public.chart_of_accounts 
        SET current_balance = calculated_balance,
            updated_at = now()
        WHERE id = account_record.id;
    END LOOP;
    
    RAISE LOG 'تم تحديث أرصدة الحسابات بنجاح';
END;
$function$;

-- تشغيل دالة تحديث الأرصدة
SELECT public.update_account_balances_from_entries();