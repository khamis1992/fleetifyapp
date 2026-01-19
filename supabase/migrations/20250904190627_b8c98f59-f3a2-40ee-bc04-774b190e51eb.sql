-- دالة محسنة للحذف الشامل للعميل وجميع البيانات المرتبطة به
CREATE OR REPLACE FUNCTION public.enhanced_delete_customer_and_relations(
    target_customer_id uuid,
    target_company_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    customer_info RECORD;
    deleted_counts jsonb := '{}'::jsonb;
    start_time timestamp := now();
    execution_time_ms numeric;
BEGIN
    -- التحقق من وجود العميل
    SELECT * INTO customer_info
    FROM customers 
    WHERE id = target_customer_id 
    AND company_id = target_company_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'العميل غير موجود'
        );
    END IF;

    -- بدء عملية الحذف المنظمة
    
    -- 1. حذف جداول الدفع للعقود
    WITH deleted_payment_schedules AS (
        DELETE FROM contract_payment_schedules
        WHERE contract_id IN (
            SELECT id FROM contracts 
            WHERE customer_id = target_customer_id 
            AND company_id = target_company_id
        )
        RETURNING id
    )
    SELECT count(*) INTO deleted_counts FROM deleted_payment_schedules;
    deleted_counts := jsonb_set(deleted_counts, '{payment_schedules}', to_jsonb(deleted_counts));

    -- 2. حذف تقارير حالة المركبات
    WITH deleted_vehicle_reports AS (
        DELETE FROM vehicle_condition_reports
        WHERE contract_id IN (
            SELECT id FROM contracts 
            WHERE customer_id = target_customer_id 
            AND company_id = target_company_id
        )
        RETURNING id
    )
    SELECT count(*) INTO deleted_counts FROM deleted_vehicle_reports;
    deleted_counts := jsonb_set(deleted_counts, '{vehicle_reports}', to_jsonb(deleted_counts));

    -- 3. حذف عناصر الفواتير
    WITH deleted_invoice_items AS (
        DELETE FROM invoice_items
        WHERE invoice_id IN (
            SELECT id FROM invoices 
            WHERE customer_id = target_customer_id 
            AND company_id = target_company_id
        )
        RETURNING id
    )
    SELECT count(*) INTO deleted_counts FROM deleted_invoice_items;
    deleted_counts := jsonb_set(deleted_counts, '{invoice_items}', to_jsonb(deleted_counts));

    -- 4. حذف المدفوعات
    WITH deleted_payments AS (
        DELETE FROM payments
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO deleted_counts FROM deleted_payments;
    deleted_counts := jsonb_set(deleted_counts, '{payments}', to_jsonb(deleted_counts));

    -- 5. حذف الفواتير
    WITH deleted_invoices AS (
        DELETE FROM invoices
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO deleted_counts FROM deleted_invoices;
    deleted_counts := jsonb_set(deleted_counts, '{invoices}', to_jsonb(deleted_counts));

    -- 6. حذف عروض الأسعار
    WITH deleted_quotations AS (
        DELETE FROM quotations
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO deleted_counts FROM deleted_quotations;
    deleted_counts := jsonb_set(deleted_counts, '{quotations}', to_jsonb(deleted_counts));

    -- 7. حذف العقود
    WITH deleted_contracts AS (
        DELETE FROM contracts
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO deleted_counts FROM deleted_contracts;
    deleted_counts := jsonb_set(deleted_counts, '{contracts}', to_jsonb(deleted_counts));

    -- 8. حذف ملاحظات العميل
    WITH deleted_notes AS (
        DELETE FROM customer_notes
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO deleted_notes FROM deleted_notes;
    deleted_counts := jsonb_set(deleted_counts, '{notes}', to_jsonb(deleted_notes));

    -- 9. حذف حسابات العميل المحاسبية
    WITH deleted_customer_accounts AS (
        DELETE FROM customer_accounts
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO deleted_customer_accounts FROM deleted_customer_accounts;
    deleted_counts := jsonb_set(deleted_counts, '{customer_accounts}', to_jsonb(deleted_customer_accounts));

    -- 10. حذف العميل نفسه
    DELETE FROM customers
    WHERE id = target_customer_id 
    AND company_id = target_company_id;

    -- حساب وقت التنفيذ
    execution_time_ms := EXTRACT(EPOCH FROM (now() - start_time)) * 1000;

    -- إرجاع النتائج
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم حذف العميل وجميع البيانات المرتبطة به بنجاح',
        'customer_name', CASE 
            WHEN customer_info.customer_type = 'individual' 
            THEN COALESCE(customer_info.first_name || ' ' || customer_info.last_name, customer_info.first_name_ar || ' ' || customer_info.last_name_ar, 'عميل')
            ELSE COALESCE(customer_info.company_name, customer_info.company_name_ar, 'شركة')
        END,
        'deleted_counts', deleted_counts,
        'execution_time_ms', execution_time_ms
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في حذف العميل: ' || SQLERRM,
            'execution_time_ms', EXTRACT(EPOCH FROM (now() - start_time)) * 1000
        );
END;
$$;