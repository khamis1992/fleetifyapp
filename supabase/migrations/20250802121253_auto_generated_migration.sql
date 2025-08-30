-- إنشاء الدوال المفقودة وإكمال الحل الشامل

-- 1. إعادة إنشاء دالة معالجة تغيير حالة العقد
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

-- 2. إضافة محفزات للعقود
DROP TRIGGER IF EXISTS trigger_contract_operations_log ON public.contracts;
CREATE TRIGGER trigger_contract_operations_log
    AFTER INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_contract_operations();

DROP TRIGGER IF EXISTS trigger_handle_contract_status_change ON public.contracts;
CREATE TRIGGER trigger_handle_contract_status_change
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_contract_status_change();

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

-- 5. دالة الصيانة الدورية
CREATE OR REPLACE FUNCTION public.scheduled_contract_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    maintenance_result jsonb;
    health_issues record;
BEGIN
    -- تنظيف البيانات التالفة
    SELECT public.cleanup_contract_issues() INTO maintenance_result;
    
    -- تسجيل نتائج الصيانة
    INSERT INTO public.system_logs (
        company_id,
        category,
        action,
        message,
        level,
        user_id,
        metadata
    ) VALUES (
        NULL,
        'maintenance',
        'scheduled_contract_maintenance',
        'Scheduled contract maintenance completed',
        'info',
        NULL,
        maintenance_result
    );
    
    -- تحقق من المشاكل الصحية
    FOR health_issues IN 
        SELECT * FROM public.monitor_contract_health() 
        WHERE severity = 'high'
        LIMIT 10
    LOOP
        INSERT INTO public.system_logs (
            company_id,
            category,
            action,
            message,
            level,
            user_id,
            metadata
        ) VALUES (
            (SELECT company_id FROM contracts WHERE id = health_issues.contract_id),
            'alert',
            'contract_health_issue',
            health_issues.issue_description,
            'warning',
            NULL,
            jsonb_build_object(
                'contract_id', health_issues.contract_id,
                'issue_type', health_issues.issue_type,
                'recommended_action', health_issues.recommended_action
            )
        );
    END LOOP;
END;
$$;