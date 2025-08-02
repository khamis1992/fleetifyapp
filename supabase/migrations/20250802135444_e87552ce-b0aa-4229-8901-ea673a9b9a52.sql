-- Fix the validate_contract_realtime function to use correct column name
CREATE OR REPLACE FUNCTION public.validate_contract_realtime(contract_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    validation_result jsonb := '{"valid": true, "alerts": [], "warnings": [], "errors": []}'::jsonb;
    customer_status text;
    vehicle_availability text;
    conflicts_count integer;
    active_maintenance_count integer;
    customer_name text;
    vehicle_plate text;
    existing_contract_number text;
BEGIN
    -- التحقق من حالة العميل
    SELECT 
        CASE 
            WHEN is_blacklisted = true THEN 'blacklisted'
            WHEN is_active = false THEN 'inactive'
            ELSE 'active'
        END,
        CASE 
            WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
            ELSE company_name 
        END
    INTO customer_status, customer_name
    FROM public.customers
    WHERE id = (contract_data->>'customer_id')::uuid;
    
    IF customer_status = 'blacklisted' THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || jsonb_build_array(jsonb_build_object(
                'type', 'customer_blacklisted',
                'severity', 'error',
                'message', 'العميل ' || customer_name || ' محظور ولا يمكن إنشاء عقود معه',
                'field', 'customer_id'
            ))
        );
    END IF;
    
    IF customer_status = 'inactive' THEN
        validation_result := jsonb_set(
            validation_result,
            '{warnings}',
            validation_result->'warnings' || jsonb_build_array(jsonb_build_object(
                'type', 'customer_inactive',
                'severity', 'warning',
                'message', 'العميل ' || customer_name || ' غير نشط',
                'field', 'customer_id'
            ))
        );
    END IF;
    
    -- التحقق من توفر المركبة (إذا تم تحديدها)
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        SELECT status, plate_number INTO vehicle_availability, vehicle_plate
        FROM public.vehicles
        WHERE id = (contract_data->>'vehicle_id')::uuid;
        
        IF vehicle_availability NOT IN ('available', 'reserved') THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || jsonb_build_array(jsonb_build_object(
                    'type', 'vehicle_unavailable',
                    'severity', 'error',
                    'message', 'المركبة ' || vehicle_plate || ' غير متاحة حالياً (الحالة: ' || vehicle_availability || ')',
                    'field', 'vehicle_id'
                ))
            );
        END IF;
        
        -- التحقق من تضارب المواعيد
        SELECT COUNT(*), string_agg(contract_number, ', ') INTO conflicts_count, existing_contract_number
        FROM public.contracts
        WHERE vehicle_id = (contract_data->>'vehicle_id')::uuid
        AND status IN ('active', 'draft')
        AND (
            (start_date <= (contract_data->>'end_date')::date AND end_date >= (contract_data->>'start_date')::date)
        )
        AND (contract_data->>'id' IS NULL OR id != (contract_data->>'id')::uuid);
        
        IF conflicts_count > 0 THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || jsonb_build_array(jsonb_build_object(
                    'type', 'vehicle_schedule_conflict',
                    'severity', 'error',
                    'message', 'يوجد تضارب في مواعيد استخدام المركبة ' || vehicle_plate || ' مع العقود: ' || existing_contract_number,
                    'field', 'vehicle_id',
                    'conflicts', existing_contract_number
                ))
            );
        END IF;
        
        -- التحقق من الصيانة النشطة للمركبة - Fixed to use scheduled_date instead of maintenance_date
        SELECT COUNT(*) INTO active_maintenance_count
        FROM public.vehicle_maintenance
        WHERE vehicle_id = (contract_data->>'vehicle_id')::uuid
        AND status IN ('pending', 'in_progress')
        AND (
            scheduled_date BETWEEN (contract_data->>'start_date')::date AND (contract_data->>'end_date')::date
            OR expected_completion_date BETWEEN (contract_data->>'start_date')::date AND (contract_data->>'end_date')::date
        );
        
        IF active_maintenance_count > 0 THEN
            validation_result := jsonb_set(
                validation_result,
                '{warnings}',
                validation_result->'warnings' || jsonb_build_array(jsonb_build_object(
                    'type', 'vehicle_maintenance_scheduled',
                    'severity', 'warning',
                    'message', 'يوجد صيانة مجدولة للمركبة ' || vehicle_plate || ' خلال فترة العقد',
                    'field', 'vehicle_id'
                ))
            );
        END IF;
    END IF;
    
    -- التحقق من صحة التواريخ
    IF (contract_data->>'start_date')::date >= (contract_data->>'end_date')::date THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || jsonb_build_array(jsonb_build_object(
                'type', 'invalid_date_range',
                'severity', 'error',
                'message', 'تاريخ بداية العقد يجب أن يكون قبل تاريخ النهاية',
                'field', 'dates'
            ))
        );
    END IF;
    
    -- التحقق من المبالغ
    IF (contract_data->>'contract_amount')::numeric <= 0 THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || jsonb_build_array(jsonb_build_object(
                'type', 'invalid_amount',
                'severity', 'error',
                'message', 'مبلغ العقد يجب أن يكون أكبر من الصفر',
                'field', 'contract_amount'
            ))
        );
    END IF;
    
    RETURN validation_result;
END;
$function$;