-- Phase 1: تحسين تكامل وحدة المدفوعات
-- إضافة الحقول المفقودة لجدول المدفوعات

-- إضافة مركز التكلفة والبنك للمدفوعات
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS cost_center_id uuid,
ADD COLUMN IF NOT EXISTS bank_id uuid;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_payments_cost_center ON public.payments(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_payments_bank ON public.payments(bank_id);

-- التأكد من وجود الترقر للمدفوعات
DROP TRIGGER IF EXISTS handle_payment_changes_trigger ON public.payments;
CREATE TRIGGER handle_payment_changes_trigger
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_changes();

-- تحديث دالة إنشاء قيد المدفوعات لتحسين الربط مع البنوك
CREATE OR REPLACE FUNCTION public.create_payment_bank_transaction(payment_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    payment_record record;
    bank_transaction_id uuid;
    transaction_type text;
    new_balance numeric;
BEGIN
    -- الحصول على تفاصيل الدفع
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- تحديد نوع الحركة البنكية بناءً على نوع الدفع
    IF payment_record.payment_type = 'receipt' THEN
        transaction_type := 'deposit';
    ELSE
        transaction_type := 'withdrawal';
    END IF;
    
    -- حساب الرصيد الجديد للبنك
    IF payment_record.bank_id IS NOT NULL THEN
        SELECT current_balance INTO new_balance
        FROM public.banks
        WHERE id = payment_record.bank_id;
        
        IF transaction_type = 'deposit' THEN
            new_balance := new_balance + payment_record.amount;
        ELSE
            new_balance := new_balance - payment_record.amount;
        END IF;
        
        -- إنشاء حركة بنكية
        INSERT INTO public.bank_transactions (
            id,
            company_id,
            bank_id,
            transaction_number,
            transaction_date,
            transaction_type,
            amount,
            balance_after,
            description,
            reference_number,
            status,
            created_by
        ) VALUES (
            gen_random_uuid(),
            payment_record.company_id,
            payment_record.bank_id,
            'BT-PAY-' || payment_record.payment_number,
            payment_record.payment_date,
            transaction_type,
            payment_record.amount,
            new_balance,
            'Payment transaction - ' || payment_record.payment_number,
            payment_record.reference_number,
            'completed',
            payment_record.created_by
        ) RETURNING id INTO bank_transaction_id;
        
        -- تحديث رصيد البنك
        UPDATE public.banks
        SET current_balance = new_balance,
            updated_at = now()
        WHERE id = payment_record.bank_id;
    END IF;
    
    RETURN bank_transaction_id;
END;
$function$;

-- تحديث دالة معالجة تغييرات المدفوعات لتشمل الحركات البنكية
CREATE OR REPLACE FUNCTION public.handle_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    bank_transaction_id uuid;
BEGIN
    -- إنشاء قيد يومي عند اكتمال الدفع
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payment_journal_entry(NEW.id);
        -- إنشاء حركة بنكية
        IF NEW.bank_id IS NOT NULL THEN
            bank_transaction_id := create_payment_bank_transaction(NEW.id);
        END IF;
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payment_journal_entry(NEW.id);
        -- إنشاء حركة بنكية
        IF NEW.bank_id IS NOT NULL THEN
            bank_transaction_id := create_payment_bank_transaction(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إنشاء دالة لتقارير المدفوعات الشاملة
CREATE OR REPLACE FUNCTION public.get_payment_analytics(
    company_id_param uuid,
    start_date_param date DEFAULT NULL,
    end_date_param date DEFAULT NULL
)
RETURNS TABLE (
    total_receipts numeric,
    total_payments numeric,
    net_cash_flow numeric,
    by_cost_center jsonb,
    by_payment_method jsonb,
    by_bank jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    date_filter text := '';
BEGIN
    -- تحديد فلتر التاريخ
    IF start_date_param IS NOT NULL AND end_date_param IS NOT NULL THEN
        date_filter := ' AND payment_date BETWEEN ''' || start_date_param || ''' AND ''' || end_date_param || '''';
    END IF;
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'receipt' THEN amount ELSE 0 END), 0) as total_receipts,
        COALESCE(SUM(CASE WHEN payment_type = 'payment' THEN amount ELSE 0 END), 0) as total_payments,
        COALESCE(SUM(CASE WHEN payment_type = 'receipt' THEN amount ELSE -amount END), 0) as net_cash_flow,
        
        -- تحليل حسب مركز التكلفة
        (SELECT jsonb_agg(jsonb_build_object(
            'cost_center_name', cc.center_name,
            'total_amount', cc_totals.total_amount,
            'transaction_count', cc_totals.transaction_count
        ))
        FROM (
            SELECT 
                cost_center_id,
                SUM(amount) as total_amount,
                COUNT(*) as transaction_count
            FROM public.payments p
            WHERE p.company_id = company_id_param 
            AND p.status = 'completed'
            AND cost_center_id IS NOT NULL
            GROUP BY cost_center_id
        ) cc_totals
        JOIN public.cost_centers cc ON cc.id = cc_totals.cost_center_id
        ) as by_cost_center,
        
        -- تحليل حسب طريقة الدفع
        (SELECT jsonb_agg(jsonb_build_object(
            'payment_method', payment_method,
            'total_amount', total_amount,
            'transaction_count', transaction_count
        ))
        FROM (
            SELECT 
                payment_method,
                SUM(amount) as total_amount,
                COUNT(*) as transaction_count
            FROM public.payments p
            WHERE p.company_id = company_id_param 
            AND p.status = 'completed'
            GROUP BY payment_method
        ) method_totals
        ) as by_payment_method,
        
        -- تحليل حسب البنك
        (SELECT jsonb_agg(jsonb_build_object(
            'bank_name', b.bank_name,
            'total_amount', bank_totals.total_amount,
            'transaction_count', bank_totals.transaction_count
        ))
        FROM (
            SELECT 
                bank_id,
                SUM(amount) as total_amount,
                COUNT(*) as transaction_count
            FROM public.payments p
            WHERE p.company_id = company_id_param 
            AND p.status = 'completed'
            AND bank_id IS NOT NULL
            GROUP BY bank_id
        ) bank_totals
        JOIN public.banks b ON b.id = bank_totals.bank_id
        ) as by_bank
        
    FROM public.payments p
    WHERE p.company_id = company_id_param 
    AND p.status = 'completed';
END;
$function$;