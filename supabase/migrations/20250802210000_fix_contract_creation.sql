-- ==========================================
-- إصلاح مشكلة إنشاء العقود الجديدة
-- ==========================================

-- إصلاح دالة create_contract_with_journal_entry مع آلية fallback محسنة
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    contract_data jsonb,
    user_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"success": false, "contract_id": null, "journal_entry_id": null, "errors": [], "warnings": []}'::jsonb;
    new_contract_id uuid;
    journal_result jsonb;
    current_user_id uuid;
    company_id_val uuid;
    contract_number_val text;
    error_details text;
    account_mappings_check jsonb;
    customer_check jsonb;
    vehicle_check jsonb;
    contract_amount_val numeric;
BEGIN
    -- الحصول على المستخدم الحالي والشركة
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- التحقق من وجود المستخدم والحصول على الشركة
    SELECT company_id INTO company_id_val
    FROM public.profiles 
    WHERE user_id = current_user_id;
    
    IF company_id_val IS NULL THEN
        RETURN jsonb_set(result, '{errors}', '["المستخدم غير موجود أو غير مرتبط بشركة"]'::jsonb);
    END IF;
    
    -- التحقق من الحقول المطلوبة
    IF NOT (contract_data ? 'customer_id') OR 
       NOT (contract_data ? 'contract_type') OR 
       NOT (contract_data ? 'start_date') OR 
       NOT (contract_data ? 'end_date') OR 
       NOT (contract_data ? 'contract_amount') THEN
        RETURN jsonb_set(result, '{errors}', '["الحقول المطلوبة مفقودة: customer_id, contract_type, start_date, end_date, contract_amount"]'::jsonb);
    END IF;
    
    -- التحقق من صحة العميل
    customer_check := public.check_customer_eligibility_realtime((contract_data->>'customer_id')::uuid);
    IF NOT (customer_check->>'eligible')::boolean THEN
        RETURN jsonb_set(result, '{errors}', jsonb_build_array('مشكلة في العميل: ' || (customer_check->>'reason')));
    END IF;
    
    -- التحقق من توفر المركبة (إذا تم تحديدها)
    IF contract_data ? 'vehicle_id' AND (contract_data->>'vehicle_id') IS NOT NULL AND (contract_data->>'vehicle_id') != '' THEN
        vehicle_check := public.check_vehicle_availability_realtime(
            (contract_data->>'vehicle_id')::uuid,
            (contract_data->>'start_date')::date,
            (contract_data->>'end_date')::date
        );
        IF NOT (vehicle_check->>'available')::boolean THEN
            RETURN jsonb_set(result, '{errors}', jsonb_build_array('مشكلة في المركبة: ' || (vehicle_check->>'reason')));
        END IF;
    END IF;
    
    -- فحص ربط الحسابات المحاسبية
    account_mappings_check := public.ensure_essential_account_mappings(company_id_val);
    IF jsonb_array_length(account_mappings_check->'errors') > 0 THEN
        result := jsonb_set(result, '{warnings}', 
            (result->'warnings') || jsonb_build_array('بعض ربط الحسابات المحاسبية مفقودة - قد تفشل القيود المحاسبية'));
    END IF;
    
    -- توليد رقم العقد
    SELECT 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
           LPAD((COUNT(*) + 1)::TEXT, 4, '0')
    INTO contract_number_val
    FROM public.contracts 
    WHERE company_id = company_id_val 
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- استخدام رقم العقد المرسل أو المولد
    contract_number_val := COALESCE(contract_data->>'contract_number', contract_number_val);
    
    -- التحقق من عدم تكرار رقم العقد
    IF EXISTS(SELECT 1 FROM public.contracts WHERE contract_number = contract_number_val AND company_id = company_id_val) THEN
        -- توليد رقم جديد إذا كان مكرر
        contract_number_val := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
        result := jsonb_set(result, '{warnings}', 
            (result->'warnings') || jsonb_build_array('تم تغيير رقم العقد لتجنب التكرار'));
    END IF;
    
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
        status,
        created_by,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        company_id_val,
        (contract_data->>'customer_id')::uuid,
        CASE 
            WHEN contract_data ? 'vehicle_id' AND (contract_data->>'vehicle_id') IS NOT NULL AND (contract_data->>'vehicle_id') != '' 
            THEN (contract_data->>'vehicle_id')::uuid 
            ELSE NULL 
        END,
        contract_number_val,
        contract_data->>'contract_type',
        COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        COALESCE((contract_data->>'monthly_amount')::numeric, (contract_data->>'contract_amount')::numeric),
        contract_data->>'description',
        contract_data->>'terms',
        COALESCE(contract_data->>'status', 'draft'),
        current_user_id,
        CASE 
            WHEN contract_data ? 'cost_center_id' AND (contract_data->>'cost_center_id') IS NOT NULL 
            THEN (contract_data->>'cost_center_id')::uuid 
            ELSE public.get_customer_default_cost_center((contract_data->>'customer_id')::uuid)
        END
    ) RETURNING id INTO new_contract_id;
    
    -- تحديث النتيجة مع معلومات العقد
    result := jsonb_set(result, '{success}', 'true'::jsonb);
    result := jsonb_set(result, '{contract_id}', to_jsonb(new_contract_id));
    result := jsonb_set(result, '{contract_number}', to_jsonb(contract_number_val));
    
    -- الحصول على مبلغ العقد
    contract_amount_val := (contract_data->>'contract_amount')::numeric;
    
    -- محاولة إنشاء القيد المحاسبي إذا كان المبلغ أكبر من صفر
    IF contract_amount_val > 0 THEN
        BEGIN
            SELECT public.create_contract_journal_entry_enhanced(
                new_contract_id,
                current_user_id,
                'contract_creation',
                contract_amount_val
            ) INTO journal_result;
            
            -- التحقق من نجاح إنشاء القيد المحاسبي
            IF (journal_result->>'success')::boolean THEN
                result := jsonb_set(result, '{journal_entry_id}', journal_result->'journal_entry_id');
                result := jsonb_set(result, '{journal_entry_number}', journal_result->'journal_entry_number');
                
                -- تحديث حالة العقد إلى نشط إذا تم إنشاء القيد بنجاح
                UPDATE public.contracts 
                SET status = 'active', journal_entry_id = (journal_result->>'journal_entry_id')::uuid
                WHERE id = new_contract_id;
                
            ELSE
                -- فشل في إنشاء القيد المحاسبي - لكن العقد تم إنشاؤه
                result := jsonb_set(result, '{warnings}', 
                    (result->'warnings') || jsonb_build_array(
                        'تم إنشاء العقد بنجاح ولكن فشل في إنشاء القيد المحاسبي: ' || 
                        COALESCE(journal_result->>'error_message', 'خطأ غير معروف')
                    ));
                result := jsonb_set(result, '{requires_manual_entry}', 'true'::jsonb);
                
                -- الاحتفاظ بالعقد كمسودة حتى يتم إنشاء القيد يدوياً
                UPDATE public.contracts 
                SET status = 'draft'
                WHERE id = new_contract_id;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- خطأ في إنشاء القيد المحاسبي - لكن العقد تم إنشاؤه
            result := jsonb_set(result, '{warnings}', 
                (result->'warnings') || jsonb_build_array(
                    'تم إنشاء العقد بنجاح ولكن حدث خطأ في إنشاء القيد المحاسبي: ' || SQLERRM
                ));
            result := jsonb_set(result, '{requires_manual_entry}', 'true'::jsonb);
            
            -- الاحتفاظ بالعقد كمسودة
            UPDATE public.contracts 
            SET status = 'draft'
            WHERE id = new_contract_id;
        END;
    ELSE
        -- مبلغ العقد صفر - لا حاجة لقيد محاسبي
        result := jsonb_set(result, '{warnings}', 
            (result->'warnings') || jsonb_build_array('مبلغ العقد صفر - لم يتم إنشاء قيد محاسبي'));
    END IF;
    
    -- إنشاء حساب مالي للعميل إذا لم يكن موجوداً
    BEGIN
        PERFORM public.create_customer_financial_account_enhanced(
            (contract_data->>'customer_id')::uuid,
            current_user_id
        );
    EXCEPTION WHEN OTHERS THEN
        -- تجاهل الخطأ - ليس ضرورياً لإنشاء العقد
        result := jsonb_set(result, '{warnings}', 
            (result->'warnings') || jsonb_build_array('تحذير: لم يتم إنشاء الحساب المالي للعميل'));
    END;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_details = PG_EXCEPTION_DETAIL;
    RETURN jsonb_build_object(
        'success', false,
        'errors', jsonb_build_array('خطأ في قاعدة البيانات: ' || SQLERRM),
        'error_code', SQLSTATE,
        'error_details', error_details
    );
END;
$$;

-- إنشاء دالة للتأكد من وجود ربط الحسابات الأساسية
CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"success": true, "created": [], "existing": [], "errors": []}'::jsonb;
    receivables_account uuid;
    revenue_account uuid;
    cash_account uuid;
    essential_types text[] := ARRAY['RECEIVABLES', 'RENTAL_REVENUE', 'SALES_REVENUE', 'CASH'];
    account_type text;
    mapping_exists boolean;
    default_account_id uuid;
BEGIN
    -- فحص كل نوع حساب أساسي
    FOREACH account_type IN ARRAY essential_types
    LOOP
        -- فحص وجود الربط
        SELECT EXISTS(
            SELECT 1 FROM public.account_mappings am
            JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
            WHERE am.company_id = company_id_param
            AND dat.type_code = account_type
            AND am.is_active = true
        ) INTO mapping_exists;
        
        IF NOT mapping_exists THEN
            -- محاولة إنشاء ربط تلقائي
            BEGIN
                -- البحث عن حساب مناسب في دليل الحسابات
                SELECT id INTO default_account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND (
                    (account_type = 'RECEIVABLES' AND account_type = 'assets' AND account_name ILIKE '%مدين%')
                    OR (account_type = 'RENTAL_REVENUE' AND account_type = 'revenue' AND account_name ILIKE '%إيجار%')
                    OR (account_type = 'SALES_REVENUE' AND account_type = 'revenue' AND account_name ILIKE '%مبيعات%')
                    OR (account_type = 'CASH' AND account_type = 'assets' AND account_name ILIKE '%نقد%')
                )
                AND is_active = true
                LIMIT 1;
                
                IF default_account_id IS NOT NULL THEN
                    -- إنشاء الربط
                    INSERT INTO public.account_mappings (
                        company_id,
                        default_account_type_id,
                        chart_of_accounts_id,
                        is_active
                    )
                    SELECT 
                        company_id_param,
                        dat.id,
                        default_account_id,
                        true
                    FROM public.default_account_types dat
                    WHERE dat.type_code = account_type;
                    
                    result := jsonb_set(result, '{created}', 
                        (result->'created') || jsonb_build_array(account_type));
                ELSE
                    result := jsonb_set(result, '{errors}', 
                        (result->'errors') || jsonb_build_array('لم يتم العثور على حساب مناسب لـ ' || account_type));
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                result := jsonb_set(result, '{errors}', 
                    (result->'errors') || jsonb_build_array('خطأ في إنشاء ربط ' || account_type || ': ' || SQLERRM));
            END;
        ELSE
            result := jsonb_set(result, '{existing}', 
                (result->'existing') || jsonb_build_array(account_type));
        END IF;
    END LOOP;
    
    -- تحديد حالة النجاح
    IF jsonb_array_length(result->'errors') > 0 THEN
        result := jsonb_set(result, '{success}', 'false'::jsonb);
    END IF;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'errors', jsonb_build_array('خطأ في فحص ربط الحسابات: ' || SQLERRM)
    );
END;
$$;

-- إنشاء دالة للحصول على مركز التكلفة الافتراضي للعميل
CREATE OR REPLACE FUNCTION public.get_customer_default_cost_center(customer_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cost_center_id uuid;
    company_id_val uuid;
BEGIN
    -- الحصول على الشركة من العميل
    SELECT company_id INTO company_id_val
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF company_id_val IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- البحث عن مركز التكلفة الافتراضي
    SELECT id INTO cost_center_id
    FROM public.cost_centers
    WHERE company_id = company_id_val
    AND is_active = true
    AND (is_default = true OR name ILIKE '%عام%' OR name ILIKE '%افتراضي%')
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;
    
    RETURN cost_center_id;
    
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- تحسين دالة create_contract_journal_entry_enhanced مع معالجة أفضل للأخطاء
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry_enhanced(
    contract_id_param uuid,
    user_id_param uuid DEFAULT NULL::uuid,
    entry_type_param text DEFAULT 'contract_creation'::text,
    amount_param numeric DEFAULT NULL::numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_record RECORD;
    journal_entry_id UUID;
    receivables_account_id UUID;
    revenue_account_id UUID;
    entry_amount NUMERIC;
    entry_description TEXT;
    voucher_number TEXT;
    current_user_id UUID;
    result jsonb;
    customer_account_result jsonb;
BEGIN
    -- الحصول على المستخدم الحالي
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- التحقق من وجود العقد
    SELECT c.*, cu.first_name, cu.last_name, cu.company_name, cu.customer_type
    INTO contract_record
    FROM public.contracts c
    JOIN public.customers cu ON c.customer_id = cu.id
    WHERE c.id = contract_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_NOT_FOUND',
            'error_message', 'العقد غير موجود',
            'contract_id', contract_id_param
        );
    END IF;
    
    -- التحقق من صلاحية المستخدم
    IF NOT EXISTS(
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = current_user_id 
        AND p.company_id = contract_record.company_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ACCESS_DENIED',
            'error_message', 'ليس لديك صلاحية للوصول لهذا العقد'
        );
    END IF;
    
    -- تحديد المبلغ
    IF amount_param IS NOT NULL THEN
        entry_amount := amount_param;
    ELSE
        CASE entry_type_param
            WHEN 'contract_creation', 'contract_activation' THEN
                entry_amount := contract_record.contract_amount;
            WHEN 'monthly_billing' THEN
                entry_amount := contract_record.monthly_amount;
            ELSE
                entry_amount := contract_record.contract_amount;
        END CASE;
    END IF;
    
    -- التحقق من صحة المبلغ
    IF entry_amount IS NULL OR entry_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_AMOUNT',
            'error_message', 'المبلغ غير صحيح أو يساوي صفر',
            'amount', entry_amount
        );
    END IF;
    
    -- الحصول على ربط الحسابات
    receivables_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'RECEIVABLES');
    revenue_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'RENTAL_REVENUE');
    
    -- استخدام حساب المبيعات كبديل إذا لم يوجد حساب الإيجار
    IF revenue_account_id IS NULL THEN
        revenue_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'SALES_REVENUE');
    END IF;
    
    -- التحقق من وجود الحسابات
    IF receivables_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'RECEIVABLES_ACCOUNT_NOT_FOUND',
            'error_message', 'لم يتم العثور على ربط حساب المدينين'
        );
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'REVENUE_ACCOUNT_NOT_FOUND',
            'error_message', 'لم يتم العثور على ربط حساب الإيرادات'
        );
    END IF;
    
    -- التأكد من وجود حساب مالي للعميل
    customer_account_result := public.create_customer_financial_account_enhanced(
        contract_record.customer_id,
        current_user_id
    );
    
    IF NOT (customer_account_result->>'success')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CUSTOMER_ACCOUNT_ERROR',
            'error_message', 'فشل في إنشاء أو العثور على الحساب المالي للعميل: ' || 
                           COALESCE(customer_account_result->>'error_message', 'خطأ غير معروف')
        );
    END IF;
    
    -- توليد الوصف ورقم السند
    entry_description := CASE entry_type_param
        WHEN 'contract_creation' THEN 'إنشاء عقد - ' || contract_record.contract_number
        WHEN 'contract_activation' THEN 'تفعيل عقد - ' || contract_record.contract_number
        WHEN 'monthly_billing' THEN 'فاتورة شهرية - ' || contract_record.contract_number
        ELSE 'قيد عقد - ' || contract_record.contract_number
    END;
    
    voucher_number := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
        LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = contract_record.company_id 
            AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        )::TEXT, 4, '0');
    
    -- إنشاء القيد المحاسبي
    INSERT INTO public.journal_entries (
        id, company_id, entry_date, description, reference_number,
        total_amount, status, created_by, cost_center_id
    ) VALUES (
        gen_random_uuid(),
        contract_record.company_id,
        CURRENT_DATE,
        entry_description,
        voucher_number,
        entry_amount,
        'posted',
        current_user_id,
        contract_record.cost_center_id
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء سطور القيد المحاسبي
    INSERT INTO public.journal_entry_lines (
        id, journal_entry_id, account_id, description,
        debit_amount, credit_amount, line_number
    ) VALUES 
    (
        gen_random_uuid(),
        journal_entry_id,
        receivables_account_id,
        entry_description,
        entry_amount,
        0,
        1
    ),
    (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        entry_description,
        0,
        entry_amount,
        2
    );
    
    -- تحديث العقد مع معرف القيد المحاسبي
    UPDATE public.contracts 
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    -- إرجاع النتيجة الناجحة
    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', voucher_number,
        'amount', entry_amount,
        'entry_type', entry_type_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', 'خطأ غير متوقع: ' || SQLERRM,
        'error_state', SQLSTATE
    );
END;
$$;

