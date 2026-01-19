-- Fix get_payments_without_invoices_stats function to return correct aggregated statistics
DROP FUNCTION IF EXISTS public.get_payments_without_invoices_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_payments_without_invoices_stats(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    stats_result jsonb;
BEGIN
    -- Use CTE for better performance and clarity
    WITH payments_without_invoices AS (
        SELECT 
            p.id as payment_id,
            p.amount,
            p.contract_id,
            c.contract_number,
            c.customer_id,
            cust.first_name_ar,
            cust.last_name_ar,
            cust.company_name_ar
        FROM payments p
        INNER JOIN contracts c ON p.contract_id = c.id
        LEFT JOIN customers cust ON c.customer_id = cust.id
        WHERE p.company_id = target_company_id
        AND p.payment_status = 'completed'
        AND p.contract_id IS NOT NULL
        AND p.invoice_id IS NULL
    ),
    contract_summary AS (
        SELECT 
            contract_id,
            contract_number,
            COALESCE(first_name_ar || ' ' || last_name_ar, company_name_ar, 'غير محدد') as customer_name,
            COUNT(*) as payments_count,
            SUM(amount) as total_amount
        FROM payments_without_invoices
        GROUP BY contract_id, contract_number, first_name_ar, last_name_ar, company_name_ar
    )
    SELECT jsonb_build_object(
        'total_payments_without_invoices', (SELECT COUNT(*) FROM payments_without_invoices),
        'total_amount', COALESCE((SELECT SUM(amount) FROM payments_without_invoices), 0),
        'by_contract', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'contract_id', contract_id,
                    'contract_number', contract_number,
                    'customer_name', customer_name,
                    'payments_count', payments_count,
                    'total_amount', total_amount
                ) ORDER BY contract_number
            ) FROM contract_summary),
            '[]'::jsonb
        )
    ) INTO stats_result;
    
    RETURN COALESCE(stats_result, jsonb_build_object(
        'total_payments_without_invoices', 0,
        'total_amount', 0,
        'by_contract', '[]'::jsonb
    ));
END;
$function$;