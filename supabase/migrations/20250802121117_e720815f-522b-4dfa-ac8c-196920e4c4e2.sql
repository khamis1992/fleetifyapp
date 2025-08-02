-- الحل الشامل لمشاكل إنشاء العقود - إصلاح الفهارس
-- Phase 1 continued: إضافة الفهارس بدون CONCURRENTLY

-- 1. إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_contracts_status_journal_entry 
ON public.contracts(status, journal_entry_id) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_contract_creation_log_status_date 
ON public.contract_creation_log(status, created_at, contract_id);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_lookup 
ON public.customer_accounts(customer_id, company_id);

-- 2. إضافة جدولة دورية لمراقبة العقود
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

-- 3. تحسين دالة إنشاء العقود مع تتبع أفضل للأخطاء
CREATE OR REPLACE FUNCTION public.log_contract_creation_step(
    contract_id_param uuid,
    company_id_param uuid,
    step_name text,
    step_status text,
    step_data jsonb DEFAULT '{}'::jsonb,
    error_message_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.contract_creation_log (
        contract_id,
        company_id,
        operation_step,
        status,
        error_message,
        metadata,
        created_at
    ) VALUES (
        contract_id_param,
        company_id_param,
        step_name,
        step_status,
        error_message_param,
        step_data || jsonb_build_object(
            'timestamp', extract(epoch from now()),
            'user_id', auth.uid()
        ),
        now()
    );
END;
$$;

-- 4. إضافة دالة للتحقق من جاهزية إنشاء العقود
CREATE OR REPLACE FUNCTION public.validate_contract_creation_requirements(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"valid": true, "missing_requirements": [], "recommendations": []}'::jsonb;
    missing_mappings text[];
    essential_accounts_count integer;
BEGIN
    -- التحقق من وجود الحسابات الأساسية
    SELECT COUNT(*) INTO essential_accounts_count
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code IN ('RECEIVABLES', 'RENTAL_REVENUE', 'CASH')
    AND am.is_active = true;
    
    IF essential_accounts_count < 3 THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(
            result, 
            '{missing_requirements}',
            (result->'missing_requirements') || '["Essential account mappings incomplete"]'::jsonb
        );
        result := jsonb_set(
            result,
            '{recommendations}',
            (result->'recommendations') || '["Set up account mappings for RECEIVABLES, RENTAL_REVENUE, and CASH"]'::jsonb
        );
    END IF;
    
    -- التحقق من وجود دليل حسابات كافي
    IF NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts 
        WHERE company_id = company_id_param 
        AND account_type = 'revenue' 
        AND is_active = true 
        AND is_header = false
    ) THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(
            result,
            '{missing_requirements}',
            (result->'missing_requirements') || '["No active revenue accounts found"]'::jsonb
        );
        result := jsonb_set(
            result,
            '{recommendations}',
            (result->'recommendations') || '["Create revenue accounts in chart of accounts"]'::jsonb
        );
    END IF;
    
    -- التحقق من وجود حسابات للمدينين
    IF NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts 
        WHERE company_id = company_id_param 
        AND account_type = 'assets'
        AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
        AND is_active = true 
        AND is_header = false
    ) THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(
            result,
            '{missing_requirements}',
            (result->'missing_requirements') || '["No receivables accounts found"]'::jsonb
        );
        result := jsonb_set(
            result,
            '{recommendations}',
            (result->'recommendations') || '["Create receivables accounts in chart of accounts"]'::jsonb
        );
    END IF;
    
    RETURN result;
END;
$$;

-- 5. إضافة محفزات للعقود لضمان تسجيل العمليات
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

-- 6. إضافة دالة للعقود المعلقة
CREATE OR REPLACE FUNCTION public.process_pending_contracts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"processed": 0, "activated": 0, "failed": 0, "details": []}'::jsonb;
    pending_contract record;
    processed_count integer := 0;
    activated_count integer := 0;
    failed_count integer := 0;
    validation_result jsonb;
BEGIN
    -- معالجة العقود المعلقة
    FOR pending_contract IN
        SELECT c.* 
        FROM public.contracts c
        WHERE c.status = 'pending'
        AND c.created_at > (now() - INTERVAL '24 hours')
        ORDER BY c.created_at ASC
        LIMIT 20
    LOOP
        processed_count := processed_count + 1;
        
        -- التحقق من متطلبات إنشاء العقد
        SELECT public.validate_contract_creation_requirements(pending_contract.company_id) 
        INTO validation_result;
        
        IF (validation_result->>'valid')::boolean THEN
            BEGIN
                -- محاولة تفعيل العقد
                UPDATE public.contracts 
                SET status = 'active', updated_at = now()
                WHERE id = pending_contract.id;
                
                activated_count := activated_count + 1;
                
                result := jsonb_set(
                    result,
                    '{details}',
                    (result->'details') || jsonb_build_array(jsonb_build_object(
                        'contract_id', pending_contract.id,
                        'action', 'activated',
                        'status', 'success'
                    ))
                );
                
            EXCEPTION
                WHEN OTHERS THEN
                    failed_count := failed_count + 1;
                    
                    result := jsonb_set(
                        result,
                        '{details}',
                        (result->'details') || jsonb_build_array(jsonb_build_object(
                            'contract_id', pending_contract.id,
                            'action', 'activation_failed',
                            'error', SQLERRM
                        ))
                    );
            END;
        ELSE
            result := jsonb_set(
                result,
                '{details}',
                (result->'details') || jsonb_build_array(jsonb_build_object(
                    'contract_id', pending_contract.id,
                    'action', 'validation_failed',
                    'missing_requirements', validation_result->'missing_requirements'
                ))
            );
        END IF;
    END LOOP;
    
    result := jsonb_set(result, '{processed}', processed_count::text::jsonb);
    result := jsonb_set(result, '{activated}', activated_count::text::jsonb);
    result := jsonb_set(result, '{failed}', failed_count::text::jsonb);
    
    RETURN result;
END;
$$;