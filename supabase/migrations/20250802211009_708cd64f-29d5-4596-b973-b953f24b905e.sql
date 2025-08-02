-- إصلاح تعارض الدوال في إنشاء العقود
-- Fix function conflicts in contract creation

-- أولاً: حذف الدالة القديمة التي تحتوي على معامل user_id_param
DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry(contract_data jsonb, user_id_param uuid);

-- ثانياً: التأكد من وجود الدالة الصحيحة فقط
-- إعادة إنشاء الدالة الموحدة بدون معامل user_id_param
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_id uuid;
    journal_entry_id uuid;
    contract_number_val text;
    company_id_val uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    cost_center_id_val uuid;
    result jsonb;
    validation_result jsonb;
BEGIN
    -- التحقق من صحة البيانات أولاً
    validation_result := public.validate_contract_realtime(contract_data);
    
    IF (validation_result->>'valid')::boolean = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'validation_failed',
            'validation_result', validation_result
        );
    END IF;
    
    -- استخراج البيانات المطلوبة
    company_id_val := (contract_data->>'company_id')::uuid;
    cost_center_id_val := (contract_data->>'cost_center_id')::uuid;
    
    -- توليد رقم العقد إذا لم يكن موجوداً
    contract_number_val := COALESCE(
        contract_data->>'contract_number',
        'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
        LPAD((
            SELECT COUNT(*) + 1 
            FROM public.contracts 
            WHERE company_id = company_id_val 
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 4, '0')
    );
    
    -- إنشاء العقد
    INSERT INTO public.contracts (
        id,
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_type,
        contract_date,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        description,
        terms,
        cost_center_id,
        created_by,
        status
    ) VALUES (
        COALESCE((contract_data->>'id')::uuid, gen_random_uuid()),
        company_id_val,
        (contract_data->>'customer_id')::uuid,
        NULLIF((contract_data->>'vehicle_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
        contract_number_val,
        COALESCE(contract_data->>'contract_type', 'rental'),
        COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        (contract_data->>'monthly_amount')::numeric,
        contract_data->>'description',
        contract_data->>'terms',
        cost_center_id_val,
        COALESCE((contract_data->>'created_by')::uuid, auth.uid()),
        COALESCE(contract_data->>'status', 'draft')
    ) RETURNING id INTO contract_id;
    
    -- محاولة إنشاء القيد المحاسبي
    BEGIN
        -- البحث عن الحسابات المطلوبة
        SELECT id INTO receivable_account_id
        FROM public.chart_of_accounts
        WHERE company_id = company_id_val
        AND account_type = 'assets'
        AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
        AND is_active = true
        LIMIT 1;
        
        SELECT id INTO revenue_account_id
        FROM public.chart_of_accounts
        WHERE company_id = company_id_val
        AND account_type = 'revenue'
        AND (account_name ILIKE '%rental%' OR account_name ILIKE '%إيجار%' OR account_name ILIKE '%sales%')
        AND is_active = true
        LIMIT 1;
        
        -- إنشاء القيد المحاسبي إذا توفرت الحسابات
        IF receivable_account_id IS NOT NULL AND revenue_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entries (
                id,
                company_id,
                entry_number,
                entry_date,
                description,
                reference_type,
                reference_id,
                total_debit,
                total_credit,
                status,
                created_by
            ) VALUES (
                gen_random_uuid(),
                company_id_val,
                'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                LPAD((
                    SELECT COUNT(*) + 1 
                    FROM public.journal_entries 
                    WHERE company_id = company_id_val 
                    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                )::TEXT, 4, '0'),
                COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
                'عقد رقم ' || contract_number_val,
                'contract',
                contract_id,
                (contract_data->>'contract_amount')::numeric,
                (contract_data->>'contract_amount')::numeric,
                'draft',
                COALESCE((contract_data->>'created_by')::uuid, auth.uid())
            ) RETURNING id INTO journal_entry_id;
            
            -- إضافة سطور القيد
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES 
            (
                gen_random_uuid(),
                journal_entry_id,
                receivable_account_id,
                cost_center_id_val,
                1,
                'مدينون - عقد رقم ' || contract_number_val,
                (contract_data->>'contract_amount')::numeric,
                0
            ),
            (
                gen_random_uuid(),
                journal_entry_id,
                revenue_account_id,
                cost_center_id_val,
                2,
                'إيرادات الإيجار - عقد رقم ' || contract_number_val,
                0,
                (contract_data->>'contract_amount')::numeric
            );
            
            -- ربط القيد بالعقد
            UPDATE public.contracts 
            SET journal_entry_id = journal_entry_id
            WHERE id = contract_id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- تسجيل الخطأ لكن لا نفشل العقد
            RAISE WARNING 'فشل في إنشاء القيد المحاسبي للعقد %: %', contract_number_val, SQLERRM;
    END;
    
    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'contract_number', contract_number_val,
        'journal_entry_id', journal_entry_id,
        'validation_result', validation_result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'creation_failed',
            'error_message', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$function$;

-- التأكد من عدم وجود دوال مكررة أخرى
SELECT proname, prosrc FROM pg_proc 
WHERE proname = 'create_contract_with_journal_entry' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');