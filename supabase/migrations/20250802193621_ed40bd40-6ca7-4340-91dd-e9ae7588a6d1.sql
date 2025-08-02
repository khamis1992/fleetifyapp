-- حذف الدوال الموجودة والتي تتعارض مع الإصدارات المحسنة
DROP FUNCTION IF EXISTS public.create_contract_journal_entry_enhanced(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.monitor_contract_health(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_contract_issues(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_contract_exists(uuid) CASCADE;

-- إضافة الدوال المحسنة والمفقودة
CREATE OR REPLACE FUNCTION public.validate_contract_exists(
    contract_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM public.contracts 
        WHERE id = contract_id_param
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.monitor_contract_health(
    company_id_param uuid
)
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
AS $function$
BEGIN
    RETURN QUERY
    -- فحص العقود بدون قيود محاسبية
    SELECT 
        c.id as contract_id,
        'missing_journal_entry'::text as issue_type,
        'Contract is active but missing journal entry'::text as issue_description,
        'high'::text as severity,
        'Create journal entry for this contract'::text as recommended_action
    FROM public.contracts c
    WHERE c.company_id = company_id_param
    AND c.status = 'active'
    AND c.journal_entry_id IS NULL
    
    UNION ALL
    
    -- فحص العقود منتهية الصلاحية
    SELECT 
        c.id as contract_id,
        'expired_contract'::text as issue_type,
        'Contract has expired but still active'::text as issue_description,
        'medium'::text as severity,
        'Review and update contract status'::text as recommended_action
    FROM public.contracts c
    WHERE c.company_id = company_id_param
    AND c.status = 'active'
    AND c.end_date < CURRENT_DATE
    
    UNION ALL
    
    -- فحص العقود بدون عملاء نشطين
    SELECT 
        c.id as contract_id,
        'inactive_customer'::text as issue_type,
        'Contract linked to inactive customer'::text as issue_description,
        'medium'::text as severity,
        'Activate customer or suspend contract'::text as recommended_action
    FROM public.contracts c
    JOIN public.customers cust ON c.customer_id = cust.id
    WHERE c.company_id = company_id_param
    AND c.status = 'active'
    AND cust.is_active = false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_contract_issues(
    company_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cleaned_logs integer;
    fixed_contracts integer;
BEGIN
    -- تنظيف السجلات القديمة
    DELETE FROM public.contract_creation_log
    WHERE company_id = company_id_param
    AND created_at < now() - INTERVAL '30 days'
    AND operation_step = 'journal_entry_creation'
    AND status IN ('failed', 'completed');
    
    GET DIAGNOSTICS cleaned_logs = ROW_COUNT;
    
    -- إعادة تعيين حالة العقود التي بقيت في draft
    UPDATE public.contracts
    SET status = 'cancelled',
        updated_at = now()
    WHERE company_id = company_id_param
    AND status = 'draft'
    AND created_at < now() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS fixed_contracts = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'cleaned_logs', cleaned_logs,
        'fixed_contracts', fixed_contracts,
        'message', 'Cleanup completed successfully'
    );
END;
$function$;