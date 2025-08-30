-- إنشاء دالة لإنشاء القيود المحاسبية للمدفوعات
CREATE OR REPLACE FUNCTION public.create_payment_journal_entry(payment_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    payment_record record;
    journal_entry_id uuid;
    cash_account_id uuid;
    customer_account_id uuid;
    vendor_account_id uuid;
    bank_account_id uuid;
    expense_account_id uuid;
    revenue_account_id uuid;
    cost_center_id uuid;
BEGIN
    -- الحصول على بيانات المدفوعة
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- البحث عن مركز التكلفة المناسب
    SELECT id INTO cost_center_id
    FROM public.cost_centers
    WHERE company_id = payment_record.company_id
    AND center_code IN ('FINANCE', 'ADMIN')
    AND is_active = true
    LIMIT 1;
    
    -- البحث عن الحسابات المناسبة حسب طريقة الدفع
    IF payment_record.payment_method = 'bank_transfer' OR payment_record.payment_method = 'check' THEN
        -- البحث عن حساب البنك المحدد
        IF payment_record.bank_account IS NOT NULL THEN
            SELECT coa.id INTO bank_account_id
            FROM public.chart_of_accounts coa
            JOIN public.banks b ON b.account_number = payment_record.bank_account
            WHERE coa.company_id = payment_record.company_id
            AND b.company_id = payment_record.company_id
            AND coa.is_active = true
            LIMIT 1;
        END IF;
        
        -- إذا لم يتم العثور على حساب البنك المحدد، ابحث عن أي حساب بنكي
        IF bank_account_id IS NULL THEN
            SELECT id INTO bank_account_id
            FROM public.chart_of_accounts
            WHERE company_id = payment_record.company_id
            AND account_type = 'assets'
            AND (account_name ILIKE '%bank%' OR account_name ILIKE '%بنك%')
            AND is_active = true
            LIMIT 1;
        END IF;
    ELSE
        -- للدفع النقدي
        SELECT id INTO cash_account_id
        FROM public.chart_of_accounts
        WHERE company_id = payment_record.company_id
        AND account_type = 'assets'
        AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقد%' OR account_code LIKE '111%')
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- البحث عن حسابات العملاء والموردين والمصروفات
    SELECT id INTO customer_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_code LIKE '112%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO vendor_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%payable%' OR account_name ILIKE '%دائن%' OR account_code LIKE '211%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%general%expense%' OR account_name ILIKE '%مصروف%عام%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'revenue'
    AND (account_name ILIKE '%other%revenue%' OR account_name ILIKE '%إيراد%آخر%')
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء قيد اليومية
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        payment_record.company_id,
        generate_journal_entry_number(payment_record.company_id),
        payment_record.payment_date,
        CASE 
            WHEN payment_record.payment_type = 'payment' THEN 'Payment #' || payment_record.payment_number
            ELSE 'Receipt #' || payment_record.payment_number
        END,
        'payment',
        payment_record.id,
        payment_record.amount,
        payment_record.amount,
        'draft',
        payment_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء سطور القيد حسب نوع المعاملة
    IF payment_record.payment_type = 'payment' THEN
        -- مدفوعات (مصروفات أو دفع للموردين)
        IF payment_record.vendor_id IS NOT NULL AND vendor_account_id IS NOT NULL THEN
            -- دفع للمورد: مدين حساب الموردين، دائن حساب النقدية/البنك
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), journal_entry_id, vendor_account_id, cost_center_id, 1,
                'Payment to vendor - ' || payment_record.payment_number, payment_record.amount, 0
            );
        ELSE
            -- مصروف عام: مدين حساب المصروفات، دائن حساب النقدية/البنك
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), journal_entry_id, 
                COALESCE(payment_record.account_id, expense_account_id), cost_center_id, 1,
                'General expense - ' || payment_record.payment_number, payment_record.amount, 0
            );
        END IF;
        
        -- الطرف الدائن (النقدية أو البنك)
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, 
            COALESCE(bank_account_id, cash_account_id), cost_center_id, 2,
            CASE 
                WHEN bank_account_id IS NOT NULL THEN 'Bank payment - ' || payment_record.payment_number
                ELSE 'Cash payment - ' || payment_record.payment_number
            END, 0, payment_record.amount
        );
        
    ELSE
        -- مقبوضات (إيرادات أو تحصيل من العملاء)
        -- الطرف المدين (النقدية أو البنك)
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, 
            COALESCE(bank_account_id, cash_account_id), cost_center_id, 1,
            CASE 
                WHEN bank_account_id IS NOT NULL THEN 'Bank receipt - ' || payment_record.payment_number
                ELSE 'Cash receipt - ' || payment_record.payment_number
            END, payment_record.amount, 0
        );
        
        IF payment_record.customer_id IS NOT NULL AND customer_account_id IS NOT NULL THEN
            -- تحصيل من العميل: مدين حساب النقدية/البنك، دائن حساب العملاء
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), journal_entry_id, customer_account_id, cost_center_id, 2,
                'Receipt from customer - ' || payment_record.payment_number, 0, payment_record.amount
            );
        ELSE
            -- إيراد عام: مدين حساب النقدية/البنك، دائن حساب الإيرادات
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), journal_entry_id, 
                COALESCE(payment_record.account_id, revenue_account_id), cost_center_id, 2,
                'General revenue - ' || payment_record.payment_number, 0, payment_record.amount
            );
        END IF;
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- إنشاء دالة لإنشاء أرقام القيود اليومية
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    entry_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد القيود الموجودة للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO entry_count
    FROM public.journal_entries 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم القيد المنسق
    RETURN 'JE-' || year_suffix || '-' || LPAD(entry_count::TEXT, 4, '0');
END;
$function$;

-- إنشاء ترقيم المدفوعات إذا لم يكن موجود
CREATE OR REPLACE FUNCTION public.generate_payment_number(company_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    payment_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد المدفوعات الموجودة للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO payment_count
    FROM public.payments 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم المدفوعة المنسق
    RETURN 'PAY-' || year_suffix || '-' || LPAD(payment_count::TEXT, 4, '0');
END;
$function$;

-- إنشاء trigger لإنشاء القيود المحاسبية تلقائياً
CREATE OR REPLACE FUNCTION public.handle_payment_financial_integration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    journal_id UUID;
BEGIN
    -- إنشاء رقم المدفوعة إذا لم يكن موجود
    IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
        NEW.payment_number := generate_payment_number(NEW.company_id);
    END IF;
    
    -- إنشاء القيد المحاسبي للمدفوعات المكتملة
    IF TG_OP = 'INSERT' AND NEW.payment_status = 'completed' THEN
        BEGIN
            journal_id := public.create_payment_journal_entry(NEW.id);
            
            IF journal_id IS NOT NULL THEN
                NEW.journal_entry_id := journal_id;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- تسجيل الخطأ لكن عدم إيقاف إنشاء المدفوعة
                RAISE WARNING 'Failed to create journal entry for payment %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    -- تحديث القيد المحاسبي عند تغيير حالة المدفوعة
    IF TG_OP = 'UPDATE' AND OLD.payment_status != NEW.payment_status THEN
        IF NEW.payment_status = 'completed' AND NEW.journal_entry_id IS NULL THEN
            BEGIN
                journal_id := public.create_payment_journal_entry(NEW.id);
                
                IF journal_id IS NOT NULL THEN
                    NEW.journal_entry_id := journal_id;
                END IF;
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to create journal entry for payment %: %', NEW.id, SQLERRM;
            END;
        ELSIF NEW.payment_status = 'cancelled' AND NEW.journal_entry_id IS NOT NULL THEN
            -- إلغاء القيد المحاسبي للمدفوعات الملغاة
            UPDATE public.journal_entries 
            SET status = 'cancelled'
            WHERE id = NEW.journal_entry_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إنشاء trigger للمدفوعات
DROP TRIGGER IF EXISTS payment_financial_integration_trigger ON public.payments;
CREATE TRIGGER payment_financial_integration_trigger
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_financial_integration();