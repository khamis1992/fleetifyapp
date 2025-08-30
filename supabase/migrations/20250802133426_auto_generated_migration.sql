-- Fix ambiguous column reference in validate_contract_realtime function
CREATE OR REPLACE FUNCTION public.validate_contract_realtime(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    validation_result jsonb := '{"valid": true, "alerts": [], "warnings": [], "errors": []}'::jsonb;
    customer_record RECORD;
    vehicle_record RECORD;
    conflicts_count integer;
    active_maintenance_count integer;
    scheduled_maintenance_count integer;
    start_date date;
    end_date date;
    vehicle_id uuid;
    customer_id uuid;
BEGIN
    -- التحقق من صحة البيانات الأساسية
    IF contract_data IS NULL THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["بيانات العقد مفقودة"]'::jsonb
        );
        RETURN validation_result;
    END IF;

    -- استخراج المعرفات والتواريخ
    customer_id := (contract_data->>'customer_id')::uuid;
    vehicle_id := (contract_data->>'vehicle_id')::uuid;
    start_date := (contract_data->>'start_date')::date;
    end_date := (contract_data->>'end_date')::date;

    -- التحقق من حالة العميل
    IF customer_id IS NOT NULL THEN
        SELECT * INTO customer_record
        FROM public.customers
        WHERE id = customer_id;
        
        IF FOUND THEN
            IF customer_record.is_blacklisted = true THEN
                validation_result := jsonb_set(
                    validation_result, 
                    '{valid}', 
                    'false'::jsonb
                );
                validation_result := jsonb_set(
                    validation_result,
                    '{errors}',
                    validation_result->'errors' || jsonb_build_array('العميل محظور: ' || COALESCE(customer_record.blacklist_reason, 'غير محدد'))
                );
            END IF;
            
            IF customer_record.is_active = false THEN
                validation_result := jsonb_set(
                    validation_result,
                    '{warnings}',
                    validation_result->'warnings' || '["العميل غير نشط"]'::jsonb
                );
            END IF;
        ELSE
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
        END IF;
    END IF;

    -- التحقق من توفر المركبة وحالتها (إذا تم تحديدها)
    IF vehicle_id IS NOT NULL AND vehicle_id != '00000000-0000-0000-0000-000000000000'::uuid THEN
        SELECT * INTO vehicle_record
        FROM public.vehicles
        WHERE id = vehicle_id;
        
        IF FOUND THEN
            -- التحقق من حالة المركبة العامة
            IF vehicle_record.status = 'maintenance' THEN
                validation_result := jsonb_set(
                    validation_result, 
                    '{valid}', 
                    'false'::jsonb
                );
                validation_result := jsonb_set(
                    validation_result,
                    '{errors}',
                    validation_result->'errors' || '["المركبة في الصيانة حالياً"]'::jsonb
                );
            ELSIF vehicle_record.status = 'out_of_service' THEN
                validation_result := jsonb_set(
                    validation_result, 
                    '{valid}', 
                    'false'::jsonb
                );
                validation_result := jsonb_set(
                    validation_result,
                    '{errors}',
                    validation_result->'errors' || '["المركبة خارج الخدمة"]'::jsonb
                );
            ELSIF vehicle_record.status NOT IN ('available', 'reserved') THEN
                validation_result := jsonb_set(
                    validation_result,
                    '{warnings}',
                    validation_result->'warnings' || jsonb_build_array('حالة المركبة: ' || vehicle_record.status)
                );
            END IF;

            -- التحقق من الصيانة النشطة (استخدام alias vm)
            IF start_date IS NOT NULL AND end_date IS NOT NULL THEN
                SELECT COUNT(*) INTO active_maintenance_count
                FROM public.vehicle_maintenance vm
                WHERE vm.vehicle_id = vehicle_record.id
                AND vm.status IN ('scheduled', 'in_progress')
                AND (
                    (vm.scheduled_date BETWEEN start_date AND end_date) OR
                    (vm.completion_date BETWEEN start_date AND end_date) OR
                    (vm.scheduled_date <= start_date AND (vm.completion_date IS NULL OR vm.completion_date >= end_date))
                );
                
                IF active_maintenance_count > 0 THEN
                    validation_result := jsonb_set(
                        validation_result,
                        '{warnings}',
                        validation_result->'warnings' || jsonb_build_array('يوجد ' || active_maintenance_count || ' صيانة مجدولة خلال فترة العقد')
                    );
                END IF;
            END IF;

            -- التحقق من تضارب المواعيد مع عقود أخرى (استخدام alias c)
            IF start_date IS NOT NULL AND end_date IS NOT NULL THEN
                SELECT COUNT(*) INTO conflicts_count
                FROM public.contracts c
                WHERE c.vehicle_id = vehicle_record.id
                AND c.status IN ('active', 'draft')
                AND c.id != COALESCE((contract_data->>'id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
                AND (
                    (c.start_date <= end_date AND c.end_date >= start_date)
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
                        validation_result->'errors' || jsonb_build_array('يوجد تضارب مع ' || conflicts_count || ' عقد آخر في نفس الفترة')
                    );
                END IF;
            END IF;
        ELSE
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
        END IF;
    END IF;

    -- التحقق من صحة التواريخ
    IF start_date IS NOT NULL AND end_date IS NOT NULL THEN
        IF start_date >= end_date THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || '["تاريخ بداية العقد يجب أن يكون قبل تاريخ النهاية"]'::jsonb
            );
        END IF;
        
        IF start_date < CURRENT_DATE THEN
            validation_result := jsonb_set(
                validation_result,
                '{warnings}',
                validation_result->'warnings' || '["تاريخ بداية العقد في الماضي"]'::jsonb
            );
        END IF;
    END IF;

    -- إضافة تنبيهات إضافية
    validation_result := jsonb_set(
        validation_result,
        '{alerts}',
        validation_result->'alerts' || '["تم التحقق من صحة بيانات العقد"]'::jsonb
    );

    RETURN validation_result;
END;
$function$;