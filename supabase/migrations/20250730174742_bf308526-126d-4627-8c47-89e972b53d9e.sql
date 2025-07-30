-- حذف الدالة الموجودة وإعادة إنشاؤها بالتوقيع الصحيح
DROP FUNCTION IF EXISTS public.get_payment_analytics(uuid, date, date);

-- إنشاء دالة التحليلات المالية المحدثة
CREATE OR REPLACE FUNCTION public.get_payment_analytics(
    company_id_param uuid,
    start_date_param date DEFAULT NULL,
    end_date_param date DEFAULT NULL
)
RETURNS TABLE(
    total_receipts numeric,
    total_payments numeric,
    net_cash_flow numeric,
    by_cost_center jsonb,
    by_payment_type jsonb,
    by_bank jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    start_date date;
    end_date date;
BEGIN
    -- تحديد التواريخ الافتراضية
    IF start_date_param IS NULL THEN
        start_date := CURRENT_DATE - INTERVAL '30 days';
    ELSE
        start_date := start_date_param;
    END IF;
    
    IF end_date_param IS NULL THEN
        end_date := CURRENT_DATE;
    ELSE
        end_date := end_date_param;
    END IF;
    
    RETURN QUERY
    SELECT 
        -- إجمالي المقبوضات (received)
        COALESCE(
            (SELECT SUM(amount) FROM public.payments 
             WHERE company_id = company_id_param 
             AND payment_method = 'received'
             AND payment_date BETWEEN start_date AND end_date), 
            0
        ) as total_receipts,
        
        -- إجمالي المدفوعات (made)
        COALESCE(
            (SELECT SUM(amount) FROM public.payments 
             WHERE company_id = company_id_param 
             AND payment_method = 'made'
             AND payment_date BETWEEN start_date AND end_date), 
            0
        ) as total_payments,
        
        -- صافي التدفق النقدي
        COALESCE(
            (SELECT SUM(CASE WHEN payment_method = 'received' THEN amount ELSE -amount END) 
             FROM public.payments 
             WHERE company_id = company_id_param 
             AND payment_date BETWEEN start_date AND end_date), 
            0
        ) as net_cash_flow,
        
        -- تحليل حسب مركز التكلفة
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'cost_center_name', COALESCE(cc.center_name_ar, cc.center_name, 'غير محدد'),
                    'total_amount', cost_totals.total_amount,
                    'transaction_count', cost_totals.transaction_count
                ) ORDER BY cost_totals.total_amount DESC
            )
            FROM (
                SELECT 
                    cost_center_id,
                    SUM(amount) as total_amount,
                    COUNT(*) as transaction_count
                FROM public.payments 
                WHERE company_id = company_id_param 
                AND payment_date BETWEEN start_date AND end_date
                AND cost_center_id IS NOT NULL
                GROUP BY cost_center_id
            ) cost_totals
            LEFT JOIN public.cost_centers cc ON cost_totals.cost_center_id = cc.id),
            '[]'::jsonb
        ) as by_cost_center,
        
        -- تحليل حسب طريقة الدفع
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'payment_type', type_totals.payment_type,
                    'total_amount', type_totals.total_amount,
                    'transaction_count', type_totals.transaction_count
                ) ORDER BY type_totals.total_amount DESC
            )
            FROM (
                SELECT 
                    payment_type,
                    SUM(amount) as total_amount,
                    COUNT(*) as transaction_count
                FROM public.payments 
                WHERE company_id = company_id_param 
                AND payment_date BETWEEN start_date AND end_date
                AND payment_type IS NOT NULL
                GROUP BY payment_type
            ) type_totals),
            '[]'::jsonb
        ) as by_payment_type,
        
        -- تحليل حسب البنك
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'bank_name', COALESCE(b.bank_name_ar, b.bank_name, 'غير محدد'),
                    'total_amount', bank_totals.total_amount,
                    'transaction_count', bank_totals.transaction_count
                ) ORDER BY bank_totals.total_amount DESC
            )
            FROM (
                SELECT 
                    bank_id,
                    SUM(amount) as total_amount,
                    COUNT(*) as transaction_count
                FROM public.payments 
                WHERE company_id = company_id_param 
                AND payment_date BETWEEN start_date AND end_date
                AND bank_id IS NOT NULL
                GROUP BY bank_id
            ) bank_totals
            LEFT JOIN public.banks b ON bank_totals.bank_id = b.id),
            '[]'::jsonb
        ) as by_bank;
END;
$$;