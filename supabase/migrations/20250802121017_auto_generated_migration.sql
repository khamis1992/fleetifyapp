-- الحل الشامل لمشاكل إنشاء العقود
-- Phase 1: إصلاح المشاكل الحالية فوراً

-- 1. إصلاح دالة إنشاء القيود المحاسبية للعقود
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_record RECORD;
    journal_entry_id uuid;
    customer_account_id uuid;
    revenue_account_id uuid;
    entry_number text;
    current_user_id uuid;
    company_id_var uuid;
    step_start_time timestamp;
BEGIN
    step_start_time := clock_timestamp();
    current_user_id := auth.uid();
    
    -- تسجيل بداية العملية
    INSERT INTO public.contract_creation_log (
        company_id, contract_id, operation_step, status, metadata
    ) VALUES (
        NULL, contract_id_param, 'journal_entry_creation', 'started',
        jsonb_build_object('started_at', step_start_time, 'user_id', current_user_id)
    );
    
    -- التحقق من وجود العقد أولاً
    IF NOT public.validate_contract_exists(contract_id_param) THEN
        INSERT INTO public.contract_creation_log (
            company_id, contract_id, operation_step, status, error_message
        ) VALUES (
            NULL, contract_id_param, 'journal_entry_creation', 'failed',
            'Contract does not exist'
        );
        RAISE EXCEPTION 'Contract with ID % does not exist', contract_id_param
            USING ERRCODE = 'foreign_key_violation';
    END IF;
    
    -- الحصول على بيانات العقد مع التحقق من الحالة
    SELECT 
        c.*,
        cust.company_name,
        cust.first_name,
        cust.last_name,
        cust.customer_type
    INTO contract_record
    FROM public.contracts c
    LEFT JOIN public.customers cust ON c.customer_id = cust.id
    WHERE c.id = contract_id_param;
    
    -- التحقق من وجود بيانات العقد
    IF NOT FOUND OR contract_record.id IS NULL THEN
        INSERT INTO public.contract_creation_log (
            company_id, contract_id, operation_step, status, error_message
        ) VALUES (
            NULL, contract_id_param, 'journal_entry_creation', 'failed',
            'Contract record not found or incomplete'
        );
        RAISE EXCEPTION 'Contract record not found for ID %', contract_id_param
            USING ERRCODE = 'no_data_found';
    END IF;
    
    company_id_var := contract_record.company_id;
    
    -- التحقق من أهلية العقد لإنشاء القيد
    IF contract_record.status NOT IN ('active', 'pending') THEN
        INSERT INTO public.contract_creation_log (
            company_id, contract_id, operation_step, status, error_message
        ) VALUES (
            company_id_var, contract_id_param, 'journal_entry_creation', 'failed',
            'Contract status not eligible: ' || contract_record.status
        );
        RAISE EXCEPTION 'Contract % is not eligible for journal entry creation (status: %)', 
            contract_id_param, contract_record.status
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    
    -- التحقق من عدم وجود قيد محاسبي مسبق
    IF contract_record.journal_entry_id IS NOT NULL THEN
        INSERT INTO public.contract_creation_log (
            company_id, contract_id, operation_step, status, error_message
        ) VALUES (
            company_id_var, contract_id_param, 'journal_entry_creation', 'skipped',
            'Journal entry already exists: ' || contract_record.journal_entry_id
        );
        RETURN contract_record.journal_entry_id;
    END IF;
    
    -- الحصول على حساب العميل أو إنشاؤه
    SELECT ca.account_id INTO customer_account_id
    FROM public.customer_accounts ca
    WHERE ca.customer_id = contract_record.customer_id
    AND ca.company_id = company_id_var
    LIMIT 1;
    
    IF customer_account_id IS NULL THEN
        customer_account_id := public.create_customer_financial_account(
            contract_record.customer_id,
            company_id_var,
            jsonb_build_object(
                'customer_type', contract_record.customer_type,
                'first_name', contract_record.first_name,
                'last_name', contract_record.last_name,
                'company_name', contract_record.company_name
            )
        );
        
        IF customer_account_id IS NULL THEN
            INSERT INTO public.contract_creation_log (
                company_id, contract_id, operation_step, status, error_message
            ) VALUES (
                company_id_var, contract_id_param, 'journal_entry_creation', 'failed',
                'Failed to create customer account'
            );
            RAISE EXCEPTION 'Failed to create or find customer account for contract %', contract_id_param
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;
    
    -- الحصول على حساب الإيرادات
    SELECT am.chart_of_accounts_id INTO revenue_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_var
    AND dat.type_code = 'RENTAL_REVENUE'
    AND am.is_active = true
    LIMIT 1;
    
    -- البحث عن حساب إيرادات مناسب إذا لم توجد ربط
    IF revenue_account_id IS NULL THEN
        SELECT id INTO revenue_account_id
        FROM public.chart_of_accounts
        WHERE company_id = company_id_var
        AND account_type = 'revenue'
        AND (account_name ILIKE '%rental%' 
             OR account_name ILIKE '%rent%'
             OR account_name ILIKE '%إيجار%'
             OR account_name ILIKE '%تأجير%'
             OR account_code LIKE '41%')
        AND is_active = true
        AND is_header = false
        ORDER BY account_code
        LIMIT 1;
        
        IF revenue_account_id IS NULL THEN
            INSERT INTO public.contract_creation_log (
                company_id, contract_id, operation_step, status, error_message
            ) VALUES (
                company_id_var, contract_id_param, 'journal_entry_creation', 'failed',
                'No revenue account found'
            );
            RAISE EXCEPTION 'No suitable revenue account found for contract %', contract_id_param
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;
    
    -- توليد رقم القيد المحاسبي
    entry_number := 'JE-CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = company_id_var 
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- إنشاء القيد المحاسبي
    INSERT INTO public.journal_entries (
        id, company_id, entry_number, entry_date, description,
        reference_type, reference_id, status, created_by
    ) VALUES (
        gen_random_uuid(), company_id_var, entry_number, CURRENT_DATE,
        'Contract activation - ' || contract_record.contract_number,
        'contract', contract_record.id, 'posted',
        COALESCE(current_user_id, contract_record.created_by)
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء تفاصيل القيد
    INSERT INTO public.journal_entry_lines (
        id, journal_entry_id, account_id, description, debit_amount, credit_amount
    ) VALUES 
    (
        gen_random_uuid(), journal_entry_id, customer_account_id,
        'Contract receivable - ' || contract_record.contract_number,
        contract_record.contract_amount, 0
    ),
    (
        gen_random_uuid(), journal_entry_id, revenue_account_id,
        'Contract revenue - ' || contract_record.contract_number,
        0, contract_record.contract_amount
    );
    
    -- ربط القيد بالعقد
    UPDATE public.contracts
    SET journal_entry_id = journal_entry_id,
        updated_at = now()
    WHERE id = contract_id_param;
    
    -- تسجيل النجاح
    INSERT INTO public.contract_creation_log (
        company_id, contract_id, operation_step, status, metadata
    ) VALUES (
        company_id_var, contract_id_param, 'journal_entry_creation', 'completed',
        jsonb_build_object(
            'journal_entry_id', journal_entry_id,
            'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - step_start_time)) * 1000,
            'customer_account_id', customer_account_id,
            'revenue_account_id', revenue_account_id
        )
    );
    
    RETURN journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- تسجيل الخطأ مع معلومات مفصلة
        INSERT INTO public.contract_creation_log (
            company_id, contract_id, operation_step, status, error_message, metadata
        ) VALUES (
            COALESCE(company_id_var, (SELECT company_id FROM contracts WHERE id = contract_id_param)),
            contract_id_param, 'journal_entry_creation', 'function_error',
            SQLERRM,
            jsonb_build_object(
                'error_code', SQLSTATE,
                'function_name', 'create_contract_journal_entry',
                'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - COALESCE(step_start_time, clock_timestamp()))) * 1000,
                'contract_exists', public.validate_contract_exists(contract_id_param)
            )
        );
        RAISE;
END;
$$;

-- 2. تحسين دالة معالجة تغيير حالة العقد
CREATE OR REPLACE FUNCTION public.handle_contract_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    journal_entry_result uuid;
    step_start_time timestamp;
BEGIN
    step_start_time := clock_timestamp();
    
    -- إذا تم تغيير الحالة إلى نشط ولم يكن هناك قيد محاسبي
    IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.journal_entry_id IS NULL THEN
        
        -- تسجيل بداية عملية التفعيل
        INSERT INTO public.contract_creation_log (
            company_id, contract_id, operation_step, status, metadata
        ) VALUES (
            NEW.company_id, NEW.id, 'contract_activation', 'started',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'started_at', step_start_time
            )
        );
        
        -- محاولة إنشاء القيد المحاسبي
        BEGIN
            journal_entry_result := public.create_contract_journal_entry(NEW.id);
            
            -- تحديث العقد بمعرف القيد
            NEW.journal_entry_id := journal_entry_result;
            
            -- تسجيل نجاح التفعيل
            INSERT INTO public.contract_creation_log (
                company_id, contract_id, operation_step, status, metadata
            ) VALUES (
                NEW.company_id, NEW.id, 'contract_activation', 'completed',
                jsonb_build_object(
                    'journal_entry_id', journal_entry_result,
                    'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - step_start_time)) * 1000
                )
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                -- تسجيل فشل التفعيل
                INSERT INTO public.contract_creation_log (
                    company_id, contract_id, operation_step, status, error_message, metadata
                ) VALUES (
                    NEW.company_id, NEW.id, 'contract_activation', 'failed',
                    'Journal entry creation failed: ' || SQLERRM,
                    jsonb_build_object(
                        'error_code', SQLSTATE,
                        'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - step_start_time)) * 1000
                    )
                );
                
                -- إعادة الحالة إلى pending في حالة الفشل
                NEW.status := 'pending';
                RAISE NOTICE 'Contract activation failed, reverting to pending status: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. إضافة دالة مراقبة صحة العقود
CREATE OR REPLACE FUNCTION public.monitor_contract_health()
RETURNS TABLE(
    contract_id uuid,
    issue_type text,
    issue_description text,
    severity text,
    recommended_action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    -- العقود النشطة بدون قيود محاسبية
    SELECT 
        c.id,
        'missing_journal_entry'::text,
        'Active contract without journal entry'::text,
        'high'::text,
        'Create journal entry immediately'::text
    FROM public.contracts c
    WHERE c.status = 'active' 
    AND c.journal_entry_id IS NULL
    
    UNION ALL
    
    -- العقود المعلقة لفترة طويلة
    SELECT 
        c.id,
        'pending_too_long'::text,
        'Contract pending for more than 1 hour'::text,
        'medium'::text,
        'Review and activate or cancel'::text
    FROM public.contracts c
    WHERE c.status = 'pending' 
    AND c.created_at < (now() - INTERVAL '1 hour')
    
    UNION ALL
    
    -- العقود بأخطاء في السجل
    SELECT DISTINCT
        ccl.contract_id,
        'creation_errors'::text,
        'Contract has creation errors in log'::text,
        'medium'::text,
        'Review error logs and retry failed operations'::text
    FROM public.contract_creation_log ccl
    WHERE ccl.status IN ('failed', 'function_error')
    AND ccl.created_at > (now() - INTERVAL '24 hours');
END;
$$;

-- 4. دالة تنظيف البيانات التالفة
CREATE OR REPLACE FUNCTION public.cleanup_contract_issues()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cleanup_result jsonb := '{"cleaned_logs": 0, "fixed_contracts": 0, "errors": []}'::jsonb;
    deleted_logs integer;
    fixed_contracts integer := 0;
    contract_rec record;
BEGIN
    -- تنظيف السجلات القديمة
    DELETE FROM public.contract_creation_log
    WHERE created_at < (now() - INTERVAL '30 days')
    AND status IN ('completed', 'skipped');
    
    GET DIAGNOSTICS deleted_logs = ROW_COUNT;
    cleanup_result := jsonb_set(cleanup_result, '{cleaned_logs}', deleted_logs::text::jsonb);
    
    -- إصلاح العقود النشطة بدون قيود محاسبية
    FOR contract_rec IN 
        SELECT id FROM public.contracts 
        WHERE status = 'active' AND journal_entry_id IS NULL
        LIMIT 50
    LOOP
        BEGIN
            PERFORM public.create_contract_journal_entry(contract_rec.id);
            fixed_contracts := fixed_contracts + 1;
        EXCEPTION
            WHEN OTHERS THEN
                cleanup_result := jsonb_set(
                    cleanup_result, 
                    '{errors}',
                    (cleanup_result->'errors') || jsonb_build_array(
                        'Contract ' || contract_rec.id || ': ' || SQLERRM
                    )
                );
        END;
    END LOOP;
    
    cleanup_result := jsonb_set(cleanup_result, '{fixed_contracts}', fixed_contracts::text::jsonb);
    
    RETURN cleanup_result;
END;
$$;

-- 5. إضافة فهارس لتحسين الأداء
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_status_journal_entry 
ON public.contracts(status, journal_entry_id) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_creation_log_status_date 
ON public.contract_creation_log(status, created_at, contract_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_accounts_lookup 
ON public.customer_accounts(customer_id, company_id);

-- 6. تحديث دالة معالجة سجلات العقود المفشلة
CREATE OR REPLACE FUNCTION public.process_failed_contract_journal_entries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"processed": 0, "successful": 0, "failed": 0, "details": []}'::jsonb;
    failed_record record;
    journal_entry_result uuid;
    processed_count integer := 0;
    success_count integer := 0;
    fail_count integer := 0;
BEGIN
    -- معالجة العقود التي فشل إنشاء القيود المحاسبية لها
    FOR failed_record IN
        SELECT DISTINCT ccl.contract_id, ccl.company_id
        FROM public.contract_creation_log ccl
        JOIN public.contracts c ON ccl.contract_id = c.id
        WHERE ccl.operation_step = 'journal_entry_creation'
        AND ccl.status IN ('failed', 'function_error')
        AND ccl.created_at > (now() - INTERVAL '24 hours')
        AND c.status = 'active'
        AND c.journal_entry_id IS NULL
        ORDER BY ccl.created_at DESC
        LIMIT 20
    LOOP
        processed_count := processed_count + 1;
        
        BEGIN
            -- محاولة إنشاء القيد المحاسبي
            journal_entry_result := public.create_contract_journal_entry(failed_record.contract_id);
            
            IF journal_entry_result IS NOT NULL THEN
                success_count := success_count + 1;
                
                result := jsonb_set(
                    result,
                    '{details}',
                    (result->'details') || jsonb_build_array(jsonb_build_object(
                        'contract_id', failed_record.contract_id,
                        'status', 'success',
                        'journal_entry_id', journal_entry_result
                    ))
                );
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                fail_count := fail_count + 1;
                
                result := jsonb_set(
                    result,
                    '{details}',
                    (result->'details') || jsonb_build_array(jsonb_build_object(
                        'contract_id', failed_record.contract_id,
                        'status', 'failed',
                        'error', SQLERRM
                    ))
                );
        END;
    END LOOP;
    
    result := jsonb_set(result, '{processed}', processed_count::text::jsonb);
    result := jsonb_set(result, '{successful}', success_count::text::jsonb);
    result := jsonb_set(result, '{failed}', fail_count::text::jsonb);
    
    RETURN result;
END;
$$;