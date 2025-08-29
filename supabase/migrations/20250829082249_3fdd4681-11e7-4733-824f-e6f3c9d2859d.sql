-- إصلاح أسماء معاملات دالة إنشاء حسابات العملاء التلقائي
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    company_id_param uuid,
    customer_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record customers%ROWTYPE;
    account_result jsonb;
    success_count integer := 0;
    error_count integer := 0;
    error_messages text[] := ARRAY[]::text[];
    result jsonb;
BEGIN
    -- التحقق من وجود الشركة والعميل
    SELECT * INTO customer_record
    FROM customers
    WHERE id = customer_id_param 
    AND company_id = company_id_param
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'العميل غير موجود أو غير نشط',
            'created_accounts', 0,
            'failed_accounts', 1
        );
    END IF;
    
    -- محاولة إنشاء الحساب المالي للعميل
    BEGIN
        SELECT create_customer_financial_account(
            company_id_param,
            customer_id_param
        ) INTO account_result;
        
        IF account_result->>'success' = 'true' THEN
            success_count := success_count + 1;
        ELSE
            error_count := error_count + 1;
            error_messages := array_append(error_messages, account_result->>'error');
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        error_messages := array_append(error_messages, 
            format('خطأ في إنشاء الحساب: %s', SQLERRM));
    END;
    
    -- إرجاع النتيجة
    result := jsonb_build_object(
        'success', success_count > 0,
        'created_accounts', success_count,
        'failed_accounts', error_count,
        'customer_name', CASE 
            WHEN customer_record.customer_type = 'individual' 
            THEN customer_record.first_name || ' ' || customer_record.last_name
            ELSE customer_record.company_name 
        END
    );
    
    IF error_count > 0 THEN
        result := result || jsonb_build_object('errors', error_messages);
    END IF;
    
    RETURN result;
END;
$function$;