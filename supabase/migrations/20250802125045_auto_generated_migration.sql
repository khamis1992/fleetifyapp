-- إنشاء دالة معالجة القيود المعلقة مع آلية إعادة المحاولة الذكية
CREATE OR REPLACE FUNCTION public.process_pending_journal_entries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    pending_entry RECORD;
    result jsonb := '{"processed": 0, "failed": 0, "details": []}'::jsonb;
    journal_entry_id uuid;
    processing_count int := 0;
    failed_count int := 0;
    entry_detail jsonb;
BEGIN
    -- معالجة القيود المعلقة التي حان وقت إعادة المحاولة
    FOR pending_entry IN 
        SELECT * FROM public.pending_journal_entries 
        WHERE status = 'pending' 
        AND next_retry_at <= now() 
        AND retry_count < max_retries
        ORDER BY priority, created_at
        LIMIT 10
    LOOP
        -- تحديث حالة الدخول إلى المعالجة
        UPDATE public.pending_journal_entries 
        SET status = 'processing', 
            retry_count = retry_count + 1,
            next_retry_at = now() + INTERVAL '5 minutes' * retry_count
        WHERE id = pending_entry.id;
        
        BEGIN
            -- محاولة إنشاء القيد المحاسبي
            SELECT public.create_contract_journal_entry(pending_entry.contract_id) INTO journal_entry_id;
            
            IF journal_entry_id IS NOT NULL THEN
                -- نجح إنشاء القيد
                UPDATE public.pending_journal_entries 
                SET status = 'completed', 
                    processed_at = now(),
                    metadata = metadata || jsonb_build_object('journal_entry_id', journal_entry_id)
                WHERE id = pending_entry.id;
                
                processing_count := processing_count + 1;
                entry_detail := jsonb_build_object(
                    'contract_id', pending_entry.contract_id,
                    'status', 'completed',
                    'journal_entry_id', journal_entry_id,
                    'retry_count', pending_entry.retry_count + 1
                );
            ELSE
                -- فشل إنشاء القيد
                UPDATE public.pending_journal_entries 
                SET status = 'failed',
                    last_error = 'Journal entry creation returned null'
                WHERE id = pending_entry.id;
                
                failed_count := failed_count + 1;
                entry_detail := jsonb_build_object(
                    'contract_id', pending_entry.contract_id,
                    'status', 'failed',
                    'error', 'Journal entry creation returned null',
                    'retry_count', pending_entry.retry_count + 1
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- فشل في إنشاء القيد - تحديث الخطأ
            UPDATE public.pending_journal_entries 
            SET status = CASE 
                WHEN retry_count + 1 >= max_retries THEN 'failed' 
                ELSE 'pending' 
            END,
            last_error = SQLERRM
            WHERE id = pending_entry.id;
            
            failed_count := failed_count + 1;
            entry_detail := jsonb_build_object(
                'contract_id', pending_entry.contract_id,
                'status', 'failed',
                'error', SQLERRM,
                'retry_count', pending_entry.retry_count + 1
            );
        END;
        
        -- إضافة تفاصيل المعالجة للنتيجة
        result := jsonb_set(result, '{details}', 
            (result->'details') || jsonb_build_array(entry_detail));
    END LOOP;
    
    -- تحديث عدادات النتيجة
    result := jsonb_set(result, '{processed}', processing_count::text::jsonb);
    result := jsonb_set(result, '{failed}', failed_count::text::jsonb);
    
    RETURN result;
END;
$function$;

-- إنشاء دالة إنشاء العقد المحسّنة مع فصل القيد المحاسبي
CREATE OR REPLACE FUNCTION public.create_contract_safe(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_contract_id uuid;
    journal_entry_id uuid;
    result jsonb := '{"success": false, "contract_id": null, "journal_entry_id": null, "warnings": []}'::jsonb;
    contract_number text;
    company_id_param uuid;
BEGIN
    -- استخراج معرف الشركة
    company_id_param := (contract_data->>'company_id')::uuid;
    
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID is required';
    END IF;
    
    -- توليد رقم العقد إذا لم يكن موجوداً
    contract_number := contract_data->>'contract_number';
    IF contract_number IS NULL OR contract_number = '' THEN
        contract_number := 'CNT-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(
            (SELECT COUNT(*) + 1 FROM public.contracts WHERE company_id = company_id_param)::text, 
            4, '0'
        );
    END IF;
    
    -- إنشاء العقد في حالة "مسودة" أولاً
    INSERT INTO public.contracts (
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_date,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        contract_type,
        description,
        terms,
        status,
        created_by
    ) VALUES (
        company_id_param,
        (contract_data->>'customer_id')::uuid,
        CASE WHEN contract_data->>'vehicle_id' = 'none' THEN NULL ELSE (contract_data->>'vehicle_id')::uuid END,
        contract_number,
        COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        (contract_data->>'monthly_amount')::numeric,
        COALESCE(contract_data->>'contract_type', 'rental'),
        contract_data->>'description',
        contract_data->>'terms',
        'draft', -- بدء في حالة مسودة
        COALESCE((contract_data->>'created_by')::uuid, auth.uid())
    ) RETURNING id INTO new_contract_id;
    
    -- تحديث النتيجة بمعرف العقد
    result := jsonb_set(result, '{contract_id}', to_jsonb(new_contract_id::text));
    result := jsonb_set(result, '{success}', 'true'::jsonb);
    
    -- محاولة إنشاء القيد المحاسبي مباشرة
    BEGIN
        SELECT public.create_contract_journal_entry(new_contract_id) INTO journal_entry_id;
        
        IF journal_entry_id IS NOT NULL THEN
            -- نجح إنشاء القيد - تفعيل العقد
            UPDATE public.contracts 
            SET status = 'active', journal_entry_id = journal_entry_id 
            WHERE id = new_contract_id;
            
            result := jsonb_set(result, '{journal_entry_id}', to_jsonb(journal_entry_id::text));
        ELSE
            -- فشل إنشاء القيد - إضافة للقائمة المعلقة
            INSERT INTO public.pending_journal_entries (
                company_id, contract_id, entry_type, status, priority, metadata
            ) VALUES (
                company_id_param, new_contract_id, 'contract_activation', 'pending', 1,
                jsonb_build_object('contract_number', contract_number, 'auto_created', true)
            );
            
            result := jsonb_set(result, '{warnings}', 
                (result->'warnings') || jsonb_build_array('Contract created but journal entry pending - will retry automatically'));
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- فشل في إنشاء القيد - إضافة للقائمة المعلقة
        INSERT INTO public.pending_journal_entries (
            company_id, contract_id, entry_type, status, priority, last_error, metadata
        ) VALUES (
            company_id_param, new_contract_id, 'contract_activation', 'pending', 1, SQLERRM,
            jsonb_build_object('contract_number', contract_number, 'auto_created', true, 'initial_error', SQLERRM)
        );
        
        result := jsonb_set(result, '{warnings}', 
            (result->'warnings') || jsonb_build_array('Contract created but journal entry failed - will retry automatically: ' || SQLERRM));
    END;
    
    RETURN result;
END;
$function$;

-- إنشاء دالة للحصول على ربط الحساب بناءً على نوع العملية
CREATE OR REPLACE FUNCTION public.get_account_by_type(company_id_param uuid, account_type_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_id uuid;
BEGIN
    -- البحث عن الحساب المربوط
    SELECT coa.id INTO account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    JOIN public.chart_of_accounts coa ON am.chart_of_accounts_id = coa.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = account_type_code
    AND am.is_active = true
    AND coa.is_active = true
    LIMIT 1;
    
    RETURN account_id;
END;
$function$;

-- تحديث دالة إنشاء القيد المحاسبي للعقد لتستخدم النظام المحسّن
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry_enhanced(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_rec RECORD;
    journal_entry_id uuid;
    receivables_account_id uuid;
    revenue_account_id uuid;
    entry_description text;
    debit_amount numeric;
    credit_amount numeric;
BEGIN
    -- الحصول على بيانات العقد
    SELECT c.*, cu.first_name, cu.last_name, cu.company_name, cu.customer_type
    INTO contract_rec
    FROM public.contracts c
    JOIN public.customers cu ON c.customer_id = cu.id
    WHERE c.id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', contract_id_param;
    END IF;
    
    -- البحث عن حساب المدينين
    SELECT public.get_account_by_type(contract_rec.company_id, 'RECEIVABLES') INTO receivables_account_id;
    
    IF receivables_account_id IS NULL THEN
        RAISE EXCEPTION 'No receivables account mapped for company. Please configure account mappings first.';
    END IF;
    
    -- البحث عن حساب الإيرادات حسب نوع العقد
    CASE contract_rec.contract_type
        WHEN 'rental' THEN
            SELECT public.get_account_by_type(contract_rec.company_id, 'RENTAL_REVENUE') INTO revenue_account_id;
        WHEN 'sales' THEN
            SELECT public.get_account_by_type(contract_rec.company_id, 'SALES_REVENUE') INTO revenue_account_id;
        ELSE
            SELECT public.get_account_by_type(contract_rec.company_id, 'SERVICE_REVENUE') INTO revenue_account_id;
    END CASE;
    
    IF revenue_account_id IS NULL THEN
        -- استخدام حساب الإيرادات العامة كحل بديل
        SELECT public.get_account_by_type(contract_rec.company_id, 'SALES_REVENUE') INTO revenue_account_id;
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No revenue account mapped for company. Please configure account mappings first.';
    END IF;
    
    -- تحديد المبلغ والوصف
    debit_amount := contract_rec.contract_amount;
    credit_amount := contract_rec.contract_amount;
    
    CASE contract_rec.customer_type
        WHEN 'individual' THEN
            entry_description := 'Contract activation - ' || COALESCE(contract_rec.first_name || ' ' || contract_rec.last_name, 'Individual Customer');
        ELSE
            entry_description := 'Contract activation - ' || COALESCE(contract_rec.company_name, 'Corporate Customer');
    END CASE;
    
    entry_description := entry_description || ' (Contract: ' || contract_rec.contract_number || ')';
    
    -- إنشاء قيد اليومية
    INSERT INTO public.journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_amount,
        status,
        created_by
    ) VALUES (
        contract_rec.company_id,
        'JE-CNT-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(
            (SELECT COUNT(*) + 1 FROM public.journal_entries WHERE company_id = contract_rec.company_id)::text, 
            4, '0'
        ),
        CURRENT_DATE,
        entry_description,
        'contract',
        contract_id_param,
        debit_amount,
        'posted',
        contract_rec.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء سطور القيد - الجانب المدين (حساب المدينين)
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        journal_entry_id,
        receivables_account_id,
        'Customer receivables - ' || contract_rec.contract_number,
        debit_amount,
        0
    );
    
    -- إنشاء سطور القيد - الجانب الدائن (حساب الإيرادات)
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        journal_entry_id,
        revenue_account_id,
        'Contract revenue - ' || contract_rec.contract_number,
        0,
        credit_amount
    );
    
    -- تحديث أرصدة الحسابات
    UPDATE public.chart_of_accounts 
    SET current_balance = current_balance + debit_amount 
    WHERE id = receivables_account_id;
    
    UPDATE public.chart_of_accounts 
    SET current_balance = current_balance + credit_amount 
    WHERE id = revenue_account_id;
    
    RETURN journal_entry_id;
END;
$function$;