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
        -- إجمالي المقبوضات
        COALESCE(SUM(CASE WHEN p.payment_method = 'received' THEN p.amount ELSE 0 END), 0) as total_receipts,
        
        -- إجمالي المدفوعات
        COALESCE(SUM(CASE WHEN p.payment_method = 'made' THEN p.amount ELSE 0 END), 0) as total_payments,
        
        -- صافي التدفق النقدي
        COALESCE(SUM(CASE WHEN p.payment_method = 'received' THEN p.amount ELSE -p.amount END), 0) as net_cash_flow,
        
        -- تحليل حسب مركز التكلفة
        COALESCE(
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'cost_center_name', COALESCE(cc.center_name_ar, cc.center_name, 'غير محدد'),
                    'total_amount', cost_center_totals.total_amount,
                    'transaction_count', cost_center_totals.transaction_count
                ) ORDER BY cost_center_totals.total_amount DESC
            ) FILTER (WHERE cost_center_totals.total_amount IS NOT NULL),
            '[]'::jsonb
        ) as by_cost_center,
        
        -- تحليل حسب طريقة الدفع
        COALESCE(
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'payment_type', payment_type_totals.payment_type,
                    'total_amount', payment_type_totals.total_amount,
                    'transaction_count', payment_type_totals.transaction_count
                ) ORDER BY payment_type_totals.total_amount DESC
            ) FILTER (WHERE payment_type_totals.total_amount IS NOT NULL),
            '[]'::jsonb
        ) as by_payment_type,
        
        -- تحليل حسب البنك
        COALESCE(
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'bank_name', COALESCE(b.bank_name_ar, b.bank_name, 'غير محدد'),
                    'total_amount', bank_totals.total_amount,
                    'transaction_count', bank_totals.transaction_count
                ) ORDER BY bank_totals.total_amount DESC
            ) FILTER (WHERE bank_totals.total_amount IS NOT NULL),
            '[]'::jsonb
        ) as by_bank
        
    FROM public.payments p
    LEFT JOIN public.cost_centers cc ON p.cost_center_id = cc.id
    LEFT JOIN public.banks b ON p.bank_id = b.id
    
    -- التحليل حسب مركز التكلفة
    LEFT JOIN (
        SELECT 
            cost_center_id,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
        FROM public.payments 
        WHERE company_id = company_id_param 
        AND payment_date BETWEEN start_date AND end_date
        GROUP BY cost_center_id
    ) cost_center_totals ON p.cost_center_id = cost_center_totals.cost_center_id
    
    -- التحليل حسب طريقة الدفع
    LEFT JOIN (
        SELECT 
            payment_type,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
        FROM public.payments 
        WHERE company_id = company_id_param 
        AND payment_date BETWEEN start_date AND end_date
        GROUP BY payment_type
    ) payment_type_totals ON p.payment_type = payment_type_totals.payment_type
    
    -- التحليل حسب البنك
    LEFT JOIN (
        SELECT 
            bank_id,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
        FROM public.payments 
        WHERE company_id = company_id_param 
        AND payment_date BETWEEN start_date AND end_date
        GROUP BY bank_id
    ) bank_totals ON p.bank_id = bank_totals.bank_id
    
    WHERE p.company_id = company_id_param
    AND p.payment_date BETWEEN start_date AND end_date;
END;
$$;