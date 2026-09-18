-- إصلاح المشكلة والمتابعة بدون تحديث البيانات الحالية
-- سيتم تطبيق الحالة الجديدة على العقود الجديدة فقط

-- 1. إنشاء عامل تشغيل آمن لإنشاء فواتير دورية
CREATE OR REPLACE FUNCTION public.create_periodic_invoice_safely(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record record;
    invoice_id uuid;
    last_invoice_date date;
    days_since_last_invoice integer;
BEGIN
    -- الحصول على بيانات العقد
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param
    AND status = 'active'
    AND contract_type IN ('monthly_rental', 'yearly_rental')
    AND monthly_amount > 0;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- التحقق من آخر فاتورة لهذا العقد
    SELECT MAX(invoice_date) INTO last_invoice_date
    FROM public.invoices
    WHERE contract_id = contract_record.id;
    
    -- حساب الأيام منذ آخر فاتورة
    IF last_invoice_date IS NULL THEN
        days_since_last_invoice := EXTRACT(DAY FROM (CURRENT_DATE - contract_record.start_date));
    ELSE
        days_since_last_invoice := EXTRACT(DAY FROM (CURRENT_DATE - last_invoice_date));
    END IF;
    
    -- إنشاء فاتورة شهرية إذا مر 30 يوم أو أكثر
    IF days_since_last_invoice >= 30 THEN
        invoice_id := public.create_contract_invoice(contract_record.id, 'monthly');
        RETURN invoice_id;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- 2. إنشاء وظيفة للحصول على العقود التي تحتاج موافقة
CREATE OR REPLACE FUNCTION public.get_contracts_pending_approval(company_id_param uuid)
RETURNS TABLE(
    contract_id uuid,
    contract_number text,
    contract_amount numeric,
    customer_name text,
    created_at timestamp with time zone,
    pending_steps integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as contract_id,
        c.contract_number,
        c.contract_amount,
        CASE 
            WHEN cu.customer_type = 'individual' 
            THEN CONCAT(cu.first_name, ' ', cu.last_name)
            ELSE cu.company_name
        END as customer_name,
        c.created_at,
        (
            SELECT COUNT(*)::integer
            FROM public.contract_approval_steps cas
            WHERE cas.contract_id = c.id 
            AND cas.status = 'pending'
        ) as pending_steps
    FROM public.contracts c
    LEFT JOIN public.customers cu ON c.customer_id = cu.id
    WHERE c.company_id = company_id_param
    AND c.status = 'pending_approval'
    ORDER BY c.created_at DESC;
END;
$function$;

-- 3. إنشاء وظيفة محسنة لتتبع العمليات مع تفاصيل أكثر
CREATE OR REPLACE FUNCTION public.get_contract_operations_history(contract_id_param uuid)
RETURNS TABLE(
    operation_id uuid,
    operation_type text,
    operation_details jsonb,
    performed_by_name text,
    performed_at timestamp with time zone,
    notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        col.id as operation_id,
        col.operation_type,
        col.operation_details,
        CONCAT(p.first_name, ' ', p.last_name) as performed_by_name,
        col.performed_at,
        col.notes
    FROM public.contract_operations_log col
    LEFT JOIN public.profiles p ON col.performed_by = p.user_id
    WHERE col.contract_id = contract_id_param
    ORDER BY col.performed_at DESC;
END;
$function$;

-- 4. إنشاء وظيفة لإنشاء تقرير شامل عن العقود
CREATE OR REPLACE FUNCTION public.generate_contracts_report(
    company_id_param uuid,
    start_date_param date DEFAULT NULL,
    end_date_param date DEFAULT NULL,
    status_filter text DEFAULT NULL
)
RETURNS TABLE(
    contract_id uuid,
    contract_number text,
    customer_name text,
    contract_type text,
    contract_amount numeric,
    monthly_amount numeric,
    start_date date,
    end_date date,
    status text,
    days_remaining integer,
    total_invoiced numeric,
    total_paid numeric,
    outstanding_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as contract_id,
        c.contract_number,
        CASE 
            WHEN cu.customer_type = 'individual' 
            THEN CONCAT(cu.first_name, ' ', cu.last_name)
            ELSE cu.company_name
        END as customer_name,
        c.contract_type,
        c.contract_amount,
        c.monthly_amount,
        c.start_date,
        c.end_date,
        c.status,
        CASE 
            WHEN c.end_date > CURRENT_DATE 
            THEN EXTRACT(DAY FROM (c.end_date - CURRENT_DATE))::integer
            ELSE 0
        END as days_remaining,
        COALESCE(inv_summary.total_invoiced, 0) as total_invoiced,
        COALESCE(pay_summary.total_paid, 0) as total_paid,
        COALESCE(inv_summary.total_invoiced, 0) - COALESCE(pay_summary.total_paid, 0) as outstanding_amount
    FROM public.contracts c
    LEFT JOIN public.customers cu ON c.customer_id = cu.id
    LEFT JOIN (
        SELECT 
            i.contract_id,
            SUM(i.total_amount) as total_invoiced
        FROM public.invoices i
        WHERE i.contract_id IS NOT NULL
        GROUP BY i.contract_id
    ) inv_summary ON c.id = inv_summary.contract_id
    LEFT JOIN (
        SELECT 
            i.contract_id,
            SUM(p.amount) as total_paid
        FROM public.invoices i
        LEFT JOIN public.payments p ON i.id = p.invoice_id AND p.payment_status = 'completed'
        WHERE i.contract_id IS NOT NULL
        GROUP BY i.contract_id
    ) pay_summary ON c.id = pay_summary.contract_id
    WHERE c.company_id = company_id_param
    AND (start_date_param IS NULL OR c.start_date >= start_date_param)
    AND (end_date_param IS NULL OR c.end_date <= end_date_param)
    AND (status_filter IS NULL OR c.status = status_filter)
    ORDER BY c.created_at DESC;
END;
$function$;;
