-- المرحلة الثالثة: إصلاح المشاكل الأمنية المتبقية
-- تحديث باقي الدوال بـ search_path وإصلاح Security Definer Views

-- تحديث الدوال المتبقية مع إضافة search_path
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry_ultra_fast(p_company_id uuid, p_customer_id uuid, p_vehicle_id uuid DEFAULT NULL::uuid, p_contract_type text DEFAULT 'rental'::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_contract_amount numeric DEFAULT 0, p_monthly_amount numeric DEFAULT 0, p_description text DEFAULT NULL::text, p_terms text DEFAULT NULL::text, p_cost_center_id uuid DEFAULT NULL::uuid, p_created_by uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_contract_id uuid;
    v_contract_number text;
    v_journal_entry_id uuid;
    v_journal_entry_number text;
    v_receivables_account_id uuid;
    v_revenue_account_id uuid;
    v_start_time timestamp := clock_timestamp();
    v_execution_time_ms numeric;
    v_warnings text[] := ARRAY[]::text[];
    v_requires_manual_entry boolean := false;
BEGIN
    -- Input validation (minimal for speed)
    IF p_company_id IS NULL OR p_customer_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Company ID, Customer ID, start date, and end date are required'
        );
    END IF;

    -- Generate contract number with timestamp for uniqueness
    v_contract_number := 'CNT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::bigint::text, 10, '0');
    v_contract_id := gen_random_uuid();

    -- Create contract record immediately
    INSERT INTO contracts (
        id,
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_type,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        description,
        terms,
        cost_center_id,
        status,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_contract_id,
        p_company_id,
        p_customer_id,
        p_vehicle_id,
        v_contract_number,
        p_contract_type,
        p_start_date,
        p_end_date,
        p_contract_amount,
        p_monthly_amount,
        p_description,
        p_terms,
        p_cost_center_id,
        'draft',
        p_created_by,
        now(),
        now()
    );

    -- Only create journal entry if amount > 0
    IF p_contract_amount > 0 THEN
        -- Quick account lookup (use existing or default accounts)
        SELECT id INTO v_receivables_account_id
        FROM chart_of_accounts 
        WHERE company_id = p_company_id 
        AND account_type = 'assets'
        AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
        AND is_active = true
        LIMIT 1;

        SELECT id INTO v_revenue_account_id
        FROM chart_of_accounts 
        WHERE company_id = p_company_id 
        AND account_type = 'revenue'
        AND is_active = true
        LIMIT 1;

        -- Create minimal journal entry if accounts exist
        IF v_receivables_account_id IS NOT NULL AND v_revenue_account_id IS NOT NULL THEN
            v_journal_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::bigint::text, 10, '0');
            v_journal_entry_id := gen_random_uuid();

            -- Insert journal entry
            INSERT INTO journal_entries (
                id,
                company_id,
                journal_entry_number,
                entry_date,
                description,
                total_amount,
                status,
                created_by
            ) VALUES (
                v_journal_entry_id,
                p_company_id,
                v_journal_entry_number,
                p_start_date,
                'Journal entry for contract: ' || v_contract_number,
                p_contract_amount,
                'posted',
                p_created_by
            );

            -- Insert journal entry lines (batch insert)
            INSERT INTO journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                description,
                debit_amount,
                credit_amount
            ) VALUES 
            (
                gen_random_uuid(),
                v_journal_entry_id,
                v_receivables_account_id,
                'Contract receivable: ' || v_contract_number,
                p_contract_amount,
                0
            ),
            (
                gen_random_uuid(),
                v_journal_entry_id,
                v_revenue_account_id,
                'Contract revenue: ' || v_contract_number,
                0,
                p_contract_amount
            );

            -- Update contract status to active and link journal entry
            UPDATE contracts 
            SET status = 'active', 
                journal_entry_id = v_journal_entry_id,
                updated_at = now()
            WHERE id = v_contract_id;
        ELSE
            v_warnings := array_append(v_warnings, 'Journal entry not created - missing chart of accounts setup');
            v_requires_manual_entry := true;
        END IF;
    END IF;

    -- Calculate execution time
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

    -- Return success response immediately
    RETURN jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number,
        'journal_entry_id', v_journal_entry_id,
        'journal_entry_number', v_journal_entry_number,
        'warnings', v_warnings,
        'requires_manual_entry', v_requires_manual_entry,
        'execution_time_ms', v_execution_time_ms,
        'message', 'Contract created successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Return error but don't fail completely
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
        );
END;
$function$;

CREATE OR REPLACE FUNCTION public.enhanced_delete_customer_and_relations(target_customer_id uuid, target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_info RECORD;
    payment_schedules_count integer := 0;
    vehicle_reports_count integer := 0;
    invoice_items_count integer := 0;
    payments_count integer := 0;
    invoices_count integer := 0;
    quotations_count integer := 0;
    contracts_count integer := 0;
    notes_count integer := 0;
    customer_accounts_count integer := 0;
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
    SELECT count(*) INTO payment_schedules_count FROM deleted_payment_schedules;

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
    SELECT count(*) INTO vehicle_reports_count FROM deleted_vehicle_reports;

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
    SELECT count(*) INTO invoice_items_count FROM deleted_invoice_items;

    -- 4. حذف المدفوعات
    WITH deleted_payments AS (
        DELETE FROM payments
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO payments_count FROM deleted_payments;

    -- 5. حذف الفواتير
    WITH deleted_invoices AS (
        DELETE FROM invoices
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO invoices_count FROM deleted_invoices;

    -- 6. حذف عروض الأسعار
    WITH deleted_quotations AS (
        DELETE FROM quotations
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO quotations_count FROM deleted_quotations;

    -- 7. حذف العقود
    WITH deleted_contracts AS (
        DELETE FROM contracts
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO contracts_count FROM deleted_contracts;

    -- 8. حذف ملاحظات العميل
    WITH deleted_notes AS (
        DELETE FROM customer_notes
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO notes_count FROM deleted_notes;

    -- 9. حذف حسابات العميل المحاسبية
    WITH deleted_customer_accounts AS (
        DELETE FROM customer_accounts
        WHERE customer_id = target_customer_id 
        AND company_id = target_company_id
        RETURNING id
    )
    SELECT count(*) INTO customer_accounts_count FROM deleted_customer_accounts;

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
        'deleted_counts', jsonb_build_object(
            'payment_schedules', payment_schedules_count,
            'vehicle_reports', vehicle_reports_count,
            'invoice_items', invoice_items_count,
            'payments', payments_count,
            'invoices', invoices_count,
            'quotations', quotations_count,
            'contracts', contracts_count,
            'notes', notes_count,
            'customer_accounts', customer_accounts_count
        ),
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
$function$;

CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(company_id_param uuid, contract_start_date date DEFAULT NULL::date, contract_end_date date DEFAULT NULL::date)
RETURNS TABLE(id uuid, plate_number text, make text, model text, year integer, color text, status vehicle_status, daily_rate numeric, weekly_rate numeric, monthly_rate numeric, minimum_rental_price numeric, enforce_minimum_price boolean, company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.plate_number,
        v.make,
        v.model,
        v.year,
        v.color,
        v.status,
        v.daily_rate,
        v.weekly_rate,
        v.monthly_rate,
        v.minimum_rental_price,
        v.enforce_minimum_price,
        v.company_id
    FROM vehicles v
    WHERE v.company_id = company_id_param
    AND v.is_active = true
    AND v.status IN ('available', 'reserved')
    AND (
        -- إذا لم يتم تمرير تواريخ، إرجاع جميع المركبات المتاحة
        contract_start_date IS NULL 
        OR contract_end_date IS NULL
        OR NOT EXISTS (
            -- فحص التضارب مع العقود الموجودة
            SELECT 1 FROM contracts c
            WHERE c.vehicle_id = v.id
            AND c.company_id = company_id_param
            AND c.status IN ('active', 'draft')
            AND (
                (c.start_date <= contract_end_date AND c.end_date >= contract_start_date)
            )
        )
    )
    ORDER BY v.plate_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_customer_code(company_id_param uuid, customer_type_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    max_code integer;
    prefix text;
BEGIN
    -- تحديد البادئة بناء على نوع العميل
    prefix := CASE 
        WHEN customer_type_param = 'individual' THEN 'IND'
        WHEN customer_type_param = 'company' THEN 'COM'
        ELSE 'CUST'
    END;
    
    -- البحث عن أعلى رقم موجود
    SELECT COALESCE(MAX(
        CASE 
            WHEN customer_code ~ ('^' || prefix || '-[0-9]+$') 
            THEN CAST(SUBSTRING(customer_code FROM LENGTH(prefix) + 2) AS integer)
            ELSE 0
        END
    ), 0) INTO max_code
    FROM customers 
    WHERE company_id = company_id_param
    AND customer_code LIKE prefix || '-%';
    
    -- إرجاع الرقم التالي
    RETURN prefix || '-' || LPAD((max_code + 1)::text, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_smart_payment_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_analyzed', COALESCE(COUNT(*), 0),
        'high_confidence', COALESCE(COUNT(*) FILTER (WHERE confidence_score >= 0.8), 0),
        'medium_confidence', COALESCE(COUNT(*) FILTER (WHERE confidence_score >= 0.5 AND confidence_score < 0.8), 0),
        'low_confidence', COALESCE(COUNT(*) FILTER (WHERE confidence_score < 0.5), 0),
        'late_fees_detected', COALESCE(COUNT(*) FILTER (WHERE is_late_fee = TRUE), 0),
        'payment_types', COALESCE((
            SELECT jsonb_object_agg(payment_type, type_count)
            FROM (
                SELECT 
                    payment_type,
                    COUNT(*) as type_count
                FROM payment_ai_analysis 
                WHERE company_id = p_company_id
                GROUP BY payment_type
            ) subq
        ), '{}'::jsonb)
    ) INTO v_stats
    FROM payment_ai_analysis 
    WHERE company_id = p_company_id;
    
    RETURN COALESCE(v_stats, jsonb_build_object(
        'total_analyzed', 0,
        'high_confidence', 0,
        'medium_confidence', 0,
        'low_confidence', 0,
        'late_fees_detected', 0,
        'payment_types', '{}'::jsonb
    ));
END;
$function$;