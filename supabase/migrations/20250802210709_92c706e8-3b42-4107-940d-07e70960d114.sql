-- إصلاح إنشاء العقود وتحسين الوظائف المرتبطة
-- Fix contract creation and enhance related functions

-- إضافة فهرس للبحث السريع عن العقود النشطة
CREATE INDEX IF NOT EXISTS idx_contracts_status_dates 
ON public.contracts(status, start_date, end_date) 
WHERE status IN ('active', 'draft');

-- إضافة فهرس للعقود حسب المركبة والتواريخ
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_dates 
ON public.contracts(vehicle_id, start_date, end_date) 
WHERE vehicle_id IS NOT NULL;

-- تحسين دالة التحقق من صحة بيانات العقد
CREATE OR REPLACE FUNCTION public.validate_contract_realtime(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    validation_result jsonb := '{"valid": true, "errors": [], "warnings": []}'::jsonb;
    customer_record record;
    vehicle_record record;
    conflicts_count integer := 0;
    company_id_val uuid;
BEGIN
    -- استخراج معرف الشركة من البيانات
    company_id_val := (contract_data->>'company_id')::uuid;
    
    -- التحقق من وجود العميل وحالته
    SELECT 
        id, is_blacklisted, is_active, customer_type,
        CASE 
            WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
            ELSE company_name 
        END as display_name
    INTO customer_record
    FROM public.customers
    WHERE id = (contract_data->>'customer_id')::uuid
    AND company_id = company_id_val;
    
    IF customer_record.id IS NULL THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["العميل غير موجود"]'::jsonb
        );
        RETURN validation_result;
    END IF;
    
    -- التحقق من حالة العميل
    IF customer_record.is_blacklisted = true THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || ('["العميل ' || customer_record.display_name || ' محظور ولا يمكن إنشاء عقود معه"]')::jsonb
        );
    END IF;
    
    IF customer_record.is_active = false THEN
        validation_result := jsonb_set(
            validation_result,
            '{warnings}',
            validation_result->'warnings' || ('["العميل ' || customer_record.display_name || ' غير نشط"]')::jsonb
        );
    END IF;
    
    -- التحقق من المركبة إذا تم تحديدها
    IF contract_data->>'vehicle_id' IS NOT NULL AND 
       contract_data->>'vehicle_id' != '' AND 
       contract_data->>'vehicle_id' != 'null' THEN
        
        SELECT 
            id, plate_number, status, is_active
        INTO vehicle_record
        FROM public.vehicles
        WHERE id = (contract_data->>'vehicle_id')::uuid
        AND company_id = company_id_val;
        
        IF vehicle_record.id IS NULL THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || '["المركبة غير موجودة"]'::jsonb
            );
        ELSE
            -- التحقق من حالة المركبة
            IF vehicle_record.is_active = false THEN
                validation_result := jsonb_set(
                    validation_result, 
                    '{valid}', 
                    'false'::jsonb
                );
                validation_result := jsonb_set(
                    validation_result,
                    '{errors}',
                    validation_result->'errors' || ('["المركبة ' || vehicle_record.plate_number || ' غير نشطة"]')::jsonb
                );
            END IF;
            
            IF vehicle_record.status NOT IN ('available', 'reserved') THEN
                validation_result := jsonb_set(
                    validation_result, 
                    '{valid}', 
                    'false'::jsonb
                );
                validation_result := jsonb_set(
                    validation_result,
                    '{errors}',
                    validation_result->'errors' || ('["المركبة ' || vehicle_record.plate_number || ' غير متاحة حالياً"]')::jsonb
                );
            END IF;
            
            -- التحقق من تضارب التواريخ
            SELECT COUNT(*) INTO conflicts_count
            FROM public.contracts
            WHERE vehicle_id = (contract_data->>'vehicle_id')::uuid
            AND company_id = company_id_val
            AND status IN ('active', 'draft')
            AND id != COALESCE((contract_data->>'id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
            AND (
                (start_date <= (contract_data->>'end_date')::date AND end_date >= (contract_data->>'start_date')::date)
            );
            
            IF conflicts_count > 0 THEN
                validation_result := jsonb_set(
                    validation_result, 
                    '{valid}', 
                    'false'::jsonb
                );
                validation_result := jsonb_set(
                    validation_result,
                    '{errors}',
                    validation_result->'errors' || ('["يوجد تضارب في مواعيد استخدام المركبة ' || vehicle_record.plate_number || '"]')::jsonb
                );
            END IF;
        END IF;
    END IF;
    
    -- التحقق من صحة التواريخ
    IF (contract_data->>'start_date')::date > (contract_data->>'end_date')::date THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["تاريخ البداية يجب أن يكون قبل تاريخ النهاية"]'::jsonb
        );
    END IF;
    
    -- التحقق من المبالغ
    IF COALESCE((contract_data->>'contract_amount')::numeric, 0) <= 0 THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["مبلغ العقد يجب أن يكون أكبر من صفر"]'::jsonb
        );
    END IF;
    
    IF COALESCE((contract_data->>'monthly_amount')::numeric, 0) <= 0 THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["المبلغ الشهري يجب أن يكون أكبر من صفر"]'::jsonb
        );
    END IF;
    
    RETURN validation_result;
END;
$function$;

-- دالة للتحقق من توفر المركبة في الوقت الفعلي
CREATE OR REPLACE FUNCTION public.check_vehicle_availability_realtime(
    vehicle_id_param uuid,
    start_date_param date,
    end_date_param date,
    exclude_contract_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    vehicle_record record;
    conflicts_count integer := 0;
    conflict_details jsonb := '[]'::jsonb;
    result jsonb;
BEGIN
    -- التحقق من وجود المركبة
    SELECT id, plate_number, status, is_active
    INTO vehicle_record
    FROM public.vehicles
    WHERE id = vehicle_id_param;
    
    IF vehicle_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_not_found',
            'message', 'المركبة غير موجودة'
        );
    END IF;
    
    -- التحقق من حالة المركبة
    IF vehicle_record.is_active = false THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_inactive',
            'message', 'المركبة غير نشطة'
        );
    END IF;
    
    IF vehicle_record.status NOT IN ('available', 'reserved') THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_unavailable',
            'message', 'المركبة غير متاحة حالياً',
            'current_status', vehicle_record.status
        );
    END IF;
    
    -- التحقق من التضارب مع العقود الأخرى
    SELECT 
        COUNT(*),
        jsonb_agg(
            jsonb_build_object(
                'contract_id', id,
                'contract_number', contract_number,
                'start_date', start_date,
                'end_date', end_date,
                'status', status
            )
        )
    INTO conflicts_count, conflict_details
    FROM public.contracts
    WHERE vehicle_id = vehicle_id_param
    AND status IN ('active', 'draft')
    AND id != COALESCE(exclude_contract_id_param, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
        (start_date <= end_date_param AND end_date >= start_date_param)
    );
    
    IF conflicts_count > 0 THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'schedule_conflict',
            'message', 'يوجد تضارب في مواعيد استخدام المركبة',
            'conflicts', conflict_details
        );
    END IF;
    
    RETURN jsonb_build_object(
        'available', true,
        'reason', 'available',
        'message', 'المركبة متاحة للحجز'
    );
END;
$function$;

-- دالة للتحقق من أهلية العميل
CREATE OR REPLACE FUNCTION public.check_customer_eligibility_realtime(customer_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record record;
    active_contracts_count integer := 0;
    outstanding_payments numeric := 0;
BEGIN
    -- التحقق من وجود العميل
    SELECT 
        id, is_blacklisted, is_active, customer_type,
        blacklist_reason,
        CASE 
            WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
            ELSE company_name 
        END as display_name
    INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF customer_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'customer_not_found',
            'message', 'العميل غير موجود'
        );
    END IF;
    
    -- التحقق من الحظر
    IF customer_record.is_blacklisted = true THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'customer_blacklisted',
            'message', 'العميل محظور',
            'blacklist_reason', COALESCE(customer_record.blacklist_reason, 'غير محدد')
        );
    END IF;
    
    -- التحقق من النشاط
    IF customer_record.is_active = false THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'customer_inactive',
            'message', 'العميل غير نشط'
        );
    END IF;
    
    -- التحقق من العقود النشطة
    SELECT COUNT(*)
    INTO active_contracts_count
    FROM public.contracts
    WHERE customer_id = customer_id_param
    AND status = 'active';
    
    -- التحقق من المدفوعات المستحقة
    SELECT COALESCE(SUM(
        CASE 
            WHEN payment_type = 'receipt' THEN -amount
            ELSE amount
        END
    ), 0)
    INTO outstanding_payments
    FROM public.payments
    WHERE customer_id = customer_id_param
    AND payment_status = 'pending';
    
    RETURN jsonb_build_object(
        'eligible', true,
        'reason', 'eligible',
        'message', 'العميل مؤهل لإنشاء عقود جديدة',
        'active_contracts_count', active_contracts_count,
        'outstanding_payments', outstanding_payments
    );
END;
$function$;

-- دالة إنشاء العقد مع القيد المحاسبي المحسنة
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
        receivable_account_id := public.get_mapped_account_id(company_id_val, 'RECEIVABLES');
        revenue_account_id := public.get_mapped_account_id(company_id_val, 'RENTAL_REVENUE');
        
        -- إذا لم نجد حساب الإيرادات، جرب حساب المبيعات
        IF revenue_account_id IS NULL THEN
            revenue_account_id := public.get_mapped_account_id(company_id_val, 'SALES_REVENUE');
        END IF;
        
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
                public.generate_journal_entry_number(company_id_val),
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

-- دالة لتحديث حالة المركبات تلقائياً
CREATE OR REPLACE FUNCTION public.update_vehicle_status_on_contract_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- عند إنشاء عقد جديد أو تحديث حالته
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        
        -- إذا أصبح العقد نشطاً وهناك مركبة مرتبطة
        IF NEW.status = 'active' AND NEW.vehicle_id IS NOT NULL THEN
            UPDATE public.vehicles 
            SET status = 'rented'
            WHERE id = NEW.vehicle_id 
            AND status IN ('available', 'reserved');
        END IF;
        
        -- إذا انتهى العقد أو تم إلغاؤه
        IF NEW.status IN ('expired', 'cancelled', 'suspended') AND NEW.vehicle_id IS NOT NULL THEN
            -- تحقق من عدم وجود عقود أخرى نشطة لنفس المركبة
            IF NOT EXISTS (
                SELECT 1 FROM public.contracts 
                WHERE vehicle_id = NEW.vehicle_id 
                AND status = 'active' 
                AND id != NEW.id
            ) THEN
                UPDATE public.vehicles 
                SET status = 'available'
                WHERE id = NEW.vehicle_id;
            END IF;
        END IF;
        
    END IF;
    
    -- عند حذف عقد
    IF TG_OP = 'DELETE' AND OLD.vehicle_id IS NOT NULL THEN
        -- تحقق من عدم وجود عقود أخرى نشطة لنفس المركبة
        IF NOT EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE vehicle_id = OLD.vehicle_id 
            AND status = 'active'
        ) THEN
            UPDATE public.vehicles 
            SET status = 'available'
            WHERE id = OLD.vehicle_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- إنشاء التريجر لتحديث حالة المركبات
DROP TRIGGER IF EXISTS update_vehicle_status_on_contract_change ON public.contracts;
CREATE TRIGGER update_vehicle_status_on_contract_change
    AFTER INSERT OR UPDATE OR DELETE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vehicle_status_on_contract_change();

-- تحسين أداء الاستعلامات
ANALYZE public.contracts;
ANALYZE public.vehicles;
ANALYZE public.customers;