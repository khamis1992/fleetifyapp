-- إنشاء دالة لإنشاء حركة بنكية تلقائية للمدفوعات
CREATE OR REPLACE FUNCTION public.create_payment_bank_transaction(payment_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    payment_record record;
    bank_transaction_id uuid;
    bank_record record;
    transaction_number_seq integer;
    new_balance numeric;
BEGIN
    -- الحصول على بيانات المدفوعة
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- التحقق من أن المدفوعة بنكية
    IF payment_record.payment_method NOT IN ('bank_transfer', 'check') OR payment_record.bank_account IS NULL THEN
        RETURN NULL; -- ليس مدفوعة بنكية
    END IF;
    
    -- البحث عن البنك المناسب
    SELECT * INTO bank_record
    FROM public.banks
    WHERE company_id = payment_record.company_id
    AND account_number = payment_record.bank_account
    AND is_active = true;
    
    -- إذا لم يتم العثور على البنك بالرقم المحدد، ابحث عن البنك الأساسي
    IF NOT FOUND THEN
        SELECT * INTO bank_record
        FROM public.banks
        WHERE company_id = payment_record.company_id
        AND is_primary = true
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- إذا لم يتم العثور على أي بنك، ابحث عن أول بنك نشط
    IF NOT FOUND THEN
        SELECT * INTO bank_record
        FROM public.banks
        WHERE company_id = payment_record.company_id
        AND is_active = true
        LIMIT 1;
    END IF;
    
    IF NOT FOUND THEN
        RAISE WARNING 'No active bank found for company %', payment_record.company_id;
        RETURN NULL;
    END IF;
    
    -- حساب الرصيد الجديد
    IF payment_record.payment_type = 'payment' THEN
        new_balance := bank_record.current_balance - payment_record.amount;
    ELSE
        new_balance := bank_record.current_balance + payment_record.amount;
    END IF;
    
    -- إنشاء رقم تسلسلي للحركة البنكية
    SELECT COUNT(*) + 1 INTO transaction_number_seq
    FROM public.bank_transactions
    WHERE company_id = payment_record.company_id
    AND bank_id = bank_record.id
    AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إنشاء الحركة البنكية
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
        check_number,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        payment_record.company_id,
        bank_record.id,
        'BT-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD(transaction_number_seq::TEXT, 4, '0'),
        payment_record.payment_date,
        CASE 
            WHEN payment_record.payment_type = 'payment' THEN 'withdrawal'
            ELSE 'deposit'
        END,
        payment_record.amount,
        new_balance,
        CASE 
            WHEN payment_record.payment_type = 'payment' THEN 'Payment: ' || COALESCE(payment_record.description, payment_record.payment_number)
            ELSE 'Receipt: ' || COALESCE(payment_record.description, payment_record.payment_number)
        END,
        payment_record.payment_number,
        payment_record.check_number,
        'completed',
        payment_record.created_by
    ) RETURNING id INTO bank_transaction_id;
    
    -- تحديث رصيد البنك
    UPDATE public.banks
    SET 
        current_balance = new_balance,
        updated_at = now()
    WHERE id = bank_record.id;
    
    RETURN bank_transaction_id;
END;
$function$;

-- دالة لتحديث رصيد البنك بناءً على جميع الحركات
CREATE OR REPLACE FUNCTION public.recalculate_bank_balance(bank_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    bank_record record;
    calculated_balance numeric;
BEGIN
    -- الحصول على بيانات البنك
    SELECT * INTO bank_record
    FROM public.banks
    WHERE id = bank_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bank not found';
    END IF;
    
    -- حساب الرصيد من الرصيد الافتتاحي + مجموع الحركات
    SELECT 
        bank_record.opening_balance + 
        COALESCE(SUM(
            CASE 
                WHEN transaction_type = 'deposit' THEN amount
                WHEN transaction_type = 'withdrawal' THEN -amount
                ELSE 0
            END
        ), 0)
    INTO calculated_balance
    FROM public.bank_transactions
    WHERE bank_id = bank_id_param
    AND status = 'completed';
    
    -- تحديث الرصيد الحالي
    UPDATE public.banks
    SET 
        current_balance = calculated_balance,
        updated_at = now()
    WHERE id = bank_id_param;
    
    RETURN calculated_balance;
END;
$function$;

-- دالة لإنشاء حركة عكسية عند إلغاء المدفوعة
CREATE OR REPLACE FUNCTION public.reverse_payment_bank_transaction(payment_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    payment_record record;
    bank_transaction_id uuid;
    original_transaction record;
    bank_record record;
    transaction_number_seq integer;
    new_balance numeric;
BEGIN
    -- الحصول على بيانات المدفوعة
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- البحث عن الحركة البنكية الأصلية
    SELECT * INTO original_transaction
    FROM public.bank_transactions
    WHERE reference_number = payment_record.payment_number
    AND company_id = payment_record.company_id
    AND status = 'completed'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN NULL; -- لا توجد حركة بنكية للعكس
    END IF;
    
    -- الحصول على بيانات البنك
    SELECT * INTO bank_record
    FROM public.banks
    WHERE id = original_transaction.bank_id;
    
    -- حساب الرصيد الجديد (عكس الحركة الأصلية)
    IF original_transaction.transaction_type = 'withdrawal' THEN
        new_balance := bank_record.current_balance + original_transaction.amount;
    ELSE
        new_balance := bank_record.current_balance - original_transaction.amount;
    END IF;
    
    -- إنشاء رقم تسلسلي للحركة العكسية
    SELECT COUNT(*) + 1 INTO transaction_number_seq
    FROM public.bank_transactions
    WHERE company_id = payment_record.company_id
    AND bank_id = bank_record.id
    AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إنشاء الحركة العكسية
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
        bank_record.id,
        'REV-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD(transaction_number_seq::TEXT, 4, '0'),
        CURRENT_DATE,
        CASE 
            WHEN original_transaction.transaction_type = 'withdrawal' THEN 'deposit'
            ELSE 'withdrawal'
        END,
        original_transaction.amount,
        new_balance,
        'Reversal: ' || original_transaction.description,
        'REV-' || payment_record.payment_number,
        'completed',
        payment_record.created_by
    ) RETURNING id INTO bank_transaction_id;
    
    -- تحديث رصيد البنك
    UPDATE public.banks
    SET 
        current_balance = new_balance,
        updated_at = now()
    WHERE id = bank_record.id;
    
    -- وضع علامة إلغاء على الحركة الأصلية
    UPDATE public.bank_transactions
    SET 
        status = 'cancelled',
        updated_at = now()
    WHERE id = original_transaction.id;
    
    RETURN bank_transaction_id;
END;
$function$;

-- تحديث trigger المدفوعات لإضافة إنشاء الحركات البنكية
CREATE OR REPLACE FUNCTION public.handle_payment_financial_integration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    journal_id UUID;
    bank_transaction_id UUID;
BEGIN
    -- إنشاء رقم المدفوعة إذا لم يكن موجود
    IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
        NEW.payment_number := generate_payment_number(NEW.company_id);
    END IF;
    
    -- إنشاء القيد المحاسبي والحركة البنكية للمدفوعات المكتملة
    IF TG_OP = 'INSERT' AND NEW.payment_status = 'completed' THEN
        BEGIN
            -- إنشاء القيد المحاسبي
            journal_id := public.create_payment_journal_entry(NEW.id);
            
            IF journal_id IS NOT NULL THEN
                NEW.journal_entry_id := journal_id;
            END IF;
            
            -- إنشاء الحركة البنكية للمدفوعات البنكية
            IF NEW.payment_method IN ('bank_transfer', 'check') THEN
                bank_transaction_id := public.create_payment_bank_transaction(NEW.id);
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- تسجيل الخطأ لكن عدم إيقاف إنشاء المدفوعة
                RAISE WARNING 'Failed to create financial entries for payment %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    -- تحديث القيد المحاسبي والحركة البنكية عند تغيير حالة المدفوعة
    IF TG_OP = 'UPDATE' AND OLD.payment_status != NEW.payment_status THEN
        IF NEW.payment_status = 'completed' AND NEW.journal_entry_id IS NULL THEN
            BEGIN
                -- إنشاء القيد المحاسبي
                journal_id := public.create_payment_journal_entry(NEW.id);
                
                IF journal_id IS NOT NULL THEN
                    NEW.journal_entry_id := journal_id;
                END IF;
                
                -- إنشاء الحركة البنكية للمدفوعات البنكية
                IF NEW.payment_method IN ('bank_transfer', 'check') THEN
                    bank_transaction_id := public.create_payment_bank_transaction(NEW.id);
                END IF;
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to create financial entries for payment %: %', NEW.id, SQLERRM;
            END;
        ELSIF NEW.payment_status = 'cancelled' THEN
            -- إلغاء القيد المحاسبي
            IF NEW.journal_entry_id IS NOT NULL THEN
                UPDATE public.journal_entries 
                SET status = 'cancelled'
                WHERE id = NEW.journal_entry_id;
            END IF;
            
            -- إنشاء حركة عكسية للمدفوعات البنكية
            IF NEW.payment_method IN ('bank_transfer', 'check') THEN
                BEGIN
                    bank_transaction_id := public.reverse_payment_bank_transaction(NEW.id);
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE WARNING 'Failed to reverse bank transaction for payment %: %', NEW.id, SQLERRM;
                END;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- trigger لإعادة حساب رصيد البنك عند تغيير الحركات البنكية
CREATE OR REPLACE FUNCTION public.handle_bank_transaction_balance_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- تحديث رصيد البنك عند إدراج أو تحديث أو حذف حركة
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_bank_balance(OLD.bank_id);
        RETURN OLD;
    ELSE
        PERFORM public.recalculate_bank_balance(NEW.bank_id);
        RETURN NEW;
    END IF;
END;
$function$;

-- إنشاء trigger لتحديث أرصدة البنوك
DROP TRIGGER IF EXISTS bank_transaction_balance_update_trigger ON public.bank_transactions;
CREATE TRIGGER bank_transaction_balance_update_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bank_transaction_balance_update();