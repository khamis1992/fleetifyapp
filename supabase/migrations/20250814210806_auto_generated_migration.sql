-- إضافة حقل الحساب المحاسبي إلى جدول قوالب العقود
ALTER TABLE public.contract_templates 
ADD COLUMN IF NOT EXISTS account_id uuid;

-- إضافة مرجع خارجي للحساب المحاسبي
ALTER TABLE public.contract_templates 
ADD CONSTRAINT fk_contract_templates_account 
FOREIGN KEY (account_id) 
REFERENCES public.chart_of_accounts(id) 
ON DELETE SET NULL;

-- إضافة تعليق للحقل الجديد
COMMENT ON COLUMN public.contract_templates.account_id IS 'الحساب المحاسبي المرتبط بهذا القالب - سيتم اختياره تلقائياً عند استخدام القالب';

-- تحديث الدالة get_contract_template_by_type لتشمل الحساب المحاسبي
CREATE OR REPLACE FUNCTION public.get_contract_template_by_type(
    p_company_id uuid,
    p_contract_type text
)
RETURNS TABLE(
    id uuid,
    template_name text,
    template_name_ar text,
    contract_type text,
    duration_days integer,
    terms text,
    account_mappings jsonb,
    approval_required boolean,
    approval_workflow_id uuid,
    account_id uuid,
    is_active boolean,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.template_name,
        ct.template_name_ar,
        ct.contract_type,
        ct.duration_days,
        ct.terms,
        ct.account_mappings,
        ct.approval_required,
        ct.approval_workflow_id,
        ct.account_id,
        ct.is_active,
        ct.created_at
    FROM public.contract_templates ct
    WHERE ct.company_id = p_company_id
    AND ct.contract_type = p_contract_type
    AND ct.is_active = true
    ORDER BY ct.created_at DESC
    LIMIT 1;
END;
$function$;