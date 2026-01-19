-- Function to backfill invoices for all payments without invoices across all contracts
CREATE OR REPLACE FUNCTION public.backfill_all_contract_invoices(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    payment_record RECORD;
    result_record RECORD;
    created_count INTEGER := 0;
    skipped_count INTEGER := 0;
    error_count INTEGER := 0;
    total_processed INTEGER := 0;
    error_messages TEXT[] := ARRAY[]::TEXT[];
    processing_start TIMESTAMP := now();
BEGIN
    -- Loop through all completed payments linked to contracts without invoices
    FOR payment_record IN 
        SELECT DISTINCT p.id, p.contract_id, p.company_id
        FROM payments p
        INNER JOIN contracts c ON p.contract_id = c.id
        WHERE p.company_id = target_company_id
        AND p.payment_status = 'completed'
        AND p.contract_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM invoices i 
            WHERE i.payment_id = p.id
        )
        ORDER BY p.payment_date DESC
    LOOP
        total_processed := total_processed + 1;
        
        BEGIN
            -- Call the existing function to create invoice for this payment
            SELECT * INTO result_record
            FROM public.createInvoiceForPayment(payment_record.id::text, payment_record.company_id::text);
            
            IF result_record.success THEN
                created_count := created_count + 1;
            ELSE
                skipped_count := skipped_count + 1;
                IF result_record.error IS NOT NULL THEN
                    error_messages := array_append(error_messages, 
                        'Payment ' || payment_record.id || ': ' || result_record.error);
                END IF;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                error_messages := array_append(error_messages, 
                    'Payment ' || payment_record.id || ': ' || SQLERRM);
        END;
        
        -- Add a small delay every 50 records to prevent overload
        IF total_processed % 50 = 0 THEN
            PERFORM pg_sleep(0.1);
        END IF;
    END LOOP;
    
    -- Return comprehensive results
    RETURN jsonb_build_object(
        'success', true,
        'total_processed', total_processed,
        'created', created_count,
        'skipped', skipped_count,
        'errors', error_count,
        'error_messages', error_messages,
        'processing_time_seconds', EXTRACT(EPOCH FROM (now() - processing_start)),
        'message', 
        CASE 
            WHEN created_count > 0 THEN 'تم إنشاء ' || created_count || ' فاتورة من أصل ' || total_processed || ' مدفوعة'
            WHEN total_processed = 0 THEN 'لا توجد مدفوعات تحتاج فواتير'
            ELSE 'لم يتم إنشاء أي فواتير جديدة'
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'total_processed', total_processed,
            'created', created_count,
            'skipped', skipped_count,
            'errors', error_count + 1
        );
END;
$function$;

-- Function to get statistics about payments without invoices
CREATE OR REPLACE FUNCTION public.get_payments_without_invoices_stats(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    stats_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_payments_without_invoices', COUNT(*),
        'total_amount', COALESCE(SUM(p.amount), 0),
        'by_contract', jsonb_agg(
            jsonb_build_object(
                'contract_id', c.id,
                'contract_number', c.contract_number,
                'customer_name', COALESCE(cust.first_name_ar || ' ' || cust.last_name_ar, cust.company_name_ar),
                'payments_count', contract_stats.payments_count,
                'total_amount', contract_stats.total_amount
            )
        )
    ) INTO stats_result
    FROM payments p
    INNER JOIN contracts c ON p.contract_id = c.id
    LEFT JOIN customers cust ON c.customer_id = cust.id
    INNER JOIN (
        SELECT 
            p2.contract_id,
            COUNT(*) as payments_count,
            SUM(p2.amount) as total_amount
        FROM payments p2
        WHERE p2.company_id = target_company_id
        AND p2.payment_status = 'completed'
        AND p2.contract_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM invoices i 
            WHERE i.payment_id = p2.id
        )
        GROUP BY p2.contract_id
    ) contract_stats ON p.contract_id = contract_stats.contract_id
    WHERE p.company_id = target_company_id
    AND p.payment_status = 'completed'
    AND p.contract_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM invoices i 
        WHERE i.payment_id = p.id
    );
    
    RETURN COALESCE(stats_result, jsonb_build_object(
        'total_payments_without_invoices', 0,
        'total_amount', 0,
        'by_contract', '[]'::jsonb
    ));
END;
$function$;