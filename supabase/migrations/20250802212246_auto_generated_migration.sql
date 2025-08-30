-- تحسين دالة التحقق من صحة العقود
-- Improve contract validation function

CREATE OR REPLACE FUNCTION public.validate_contract_realtime(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    validation_result jsonb := '{"valid": true, "errors": [], "warnings": [], "alerts": []}'::jsonb;
    customer_status text;
    vehicle_availability text;
    conflicts_count integer;
    customer_name text;
    vehicle_info text;
    company_id_val uuid;
BEGIN
    -- التحقق من البيانات الأساسية
    IF contract_data IS NULL OR contract_data = '{}'::jsonb THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["بيانات العقد مطلوبة"]'::jsonb
        );
        RETURN validation_result;
    END IF;

    -- الحصول على معرف الشركة من المستخدم الحالي
    SELECT company_id INTO company_id_val
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF company_id_val IS NULL THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["لا يمكن تحديد الشركة"]'::jsonb
        );
        RETURN validation_result;
    END IF;

    -- التحقق من وجود العميل وحالته
    IF contract_data->>'customer_id' IS NOT NULL AND contract_data->>'customer_id' != '' THEN
        SELECT 
            CASE 
                WHEN is_blacklisted = true THEN 'blacklisted'
                WHEN is_active = false THEN 'inactive'
                ELSE 'active'
            END,
            CASE 
                WHEN customer_type = 'individual' THEN 
                    COALESCE(first_name_ar, first_name, '') || ' ' || COALESCE(last_name_ar, last_name, '')
                ELSE 
                    COALESCE(company_name_ar, company_name, '')
            END
        INTO customer_status, customer_name
        FROM public.customers
        WHERE id = (contract_data->>'customer_id')::uuid
        AND company_id = company_id_val;
        
        IF customer_status IS NULL THEN
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
        ELSIF customer_status = 'blacklisted' THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || jsonb_build_array('العميل ' || customer_name || ' محظور ولا يمكن إنشاء عقود معه')
            );
        ELSIF customer_status = 'inactive' THEN
            validation_result := jsonb_set(
                validation_result,
                '{warnings}',
                validation_result->'warnings' || jsonb_build_array('العميل ' || customer_name || ' غير نشط')
            );
        END IF;
    END IF;
    
    -- التحقق من توفر المركبة (إذا تم تحديدها)
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        SELECT 
            status,
            make || ' ' || model || ' (' || plate_number || ')'
        INTO vehicle_availability, vehicle_info
        FROM public.vehicles
        WHERE id = (contract_data->>'vehicle_id')::uuid
        AND company_id = company_id_val;
        
        IF vehicle_availability IS NULL THEN
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
        ELSIF vehicle_availability NOT IN ('available', 'reserved') THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || jsonb_build_array('المركبة ' || vehicle_info || ' غير متاحة حالياً (الحالة: ' || vehicle_availability || ')')
            );
        ELSE
            -- التحقق من تضارب المواعيد
            SELECT COUNT(*) INTO conflicts_count
            FROM public.contracts
            WHERE vehicle_id = (contract_data->>'vehicle_id')::uuid
            AND company_id = company_id_val
            AND status IN ('active', 'draft')
            AND (contract_data->>'start_date' IS NOT NULL AND contract_data->>'end_date' IS NOT NULL)
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
                    validation_result->'errors' || jsonb_build_array('يوجد تضارب في مواعيد استخدام المركبة ' || vehicle_info || ' (' || conflicts_count || ' عقود متضاربة)')
                );
            END IF;
        END IF;
    END IF;
    
    -- التحقق من صحة التواريخ
    IF contract_data->>'start_date' IS NOT NULL AND contract_data->>'end_date' IS NOT NULL THEN
        IF (contract_data->>'start_date')::date >= (contract_data->>'end_date')::date THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || '["تاريخ النهاية يجب أن يكون بعد تاريخ البداية"]'::jsonb
            );
        END IF;
    END IF;
    
    -- التحقق من صحة المبالغ
    IF contract_data->>'contract_amount' IS NOT NULL THEN
        IF (contract_data->>'contract_amount')::numeric <= 0 THEN
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
    END IF;
    
    IF contract_data->>'monthly_amount' IS NOT NULL THEN
        IF (contract_data->>'monthly_amount')::numeric <= 0 THEN
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
    END IF;
    
    -- إضافة معلومات إضافية للنتيجة
    validation_result := jsonb_set(
        validation_result,
        '{metadata}',
        jsonb_build_object(
            'customer_name', customer_name,
            'vehicle_info', vehicle_info,
            'validated_at', now(),
            'company_id', company_id_val
        )
    );
    
    RETURN validation_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'valid', false,
            'errors', jsonb_build_array('خطأ في التحقق من البيانات: ' || SQLERRM),
            'warnings', '[]'::jsonb,
            'alerts', '[]'::jsonb,
            'error_code', SQLSTATE
        );
END;
$function$;