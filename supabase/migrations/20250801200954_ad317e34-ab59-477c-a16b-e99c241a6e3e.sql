-- Fix the check_customer_eligibility_realtime function to use correct column name
CREATE OR REPLACE FUNCTION public.check_customer_eligibility_realtime(customer_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    total_outstanding numeric := 0;
    overdue_invoices integer := 0;
    result jsonb;
BEGIN
    -- Get customer information
    SELECT * INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'customer_not_found',
            'message', 'العميل غير موجود'
        );
    END IF;
    
    -- Check if customer is blacklisted
    IF customer_record.is_blacklisted = true THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'blacklisted',
            'message', 'العميل محظور: ' || COALESCE(customer_record.blacklist_reason, 'غير محدد')
        );
    END IF;
    
    -- Check if customer is active
    IF customer_record.is_active = false THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'inactive',
            'message', 'العميل غير نشط'
        );
    END IF;
    
    -- Calculate outstanding invoices using correct column name 'paid_amount'
    SELECT 
        COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0),
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND (total_amount - COALESCE(paid_amount, 0)) > 0)
    INTO total_outstanding, overdue_invoices
    FROM public.invoices
    WHERE customer_id = customer_id_param
    AND status IN ('sent', 'overdue')
    AND (total_amount - COALESCE(paid_amount, 0)) > 0;
    
    -- Check credit limit if set
    IF customer_record.credit_limit IS NOT NULL AND customer_record.credit_limit > 0 THEN
        IF total_outstanding > customer_record.credit_limit THEN
            RETURN jsonb_build_object(
                'eligible', false,
                'reason', 'credit_limit_exceeded',
                'message', 'تم تجاوز الحد الائتماني المسموح',
                'outstanding_amount', total_outstanding,
                'credit_limit', customer_record.credit_limit
            );
        END IF;
    END IF;
    
    -- Check for overdue invoices
    IF overdue_invoices > 0 THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'overdue_invoices',
            'message', 'يوجد فواتير متأخرة السداد',
            'overdue_count', overdue_invoices,
            'outstanding_amount', total_outstanding
        );
    END IF;
    
    -- Customer is eligible
    RETURN jsonb_build_object(
        'eligible', true,
        'reason', 'eligible',
        'message', 'العميل مؤهل لإنشاء عقد جديد',
        'outstanding_amount', total_outstanding
    );
END;
$function$;