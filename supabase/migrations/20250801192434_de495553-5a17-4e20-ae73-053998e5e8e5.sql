-- Create function for real-time vehicle availability check
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
    vehicle_status text;
    conflicts_count integer;
    conflict_details jsonb := '[]'::jsonb;
    result jsonb;
BEGIN
    -- Check vehicle status
    SELECT status INTO vehicle_status
    FROM public.vehicles
    WHERE id = vehicle_id_param AND is_active = true;
    
    IF vehicle_status IS NULL THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_not_found',
            'message', 'المركبة غير موجودة أو غير نشطة',
            'conflicts', '[]'::jsonb
        );
    END IF;
    
    IF vehicle_status NOT IN ('available', 'reserved') THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_status',
            'message', 'المركبة غير متاحة - الحالة: ' || vehicle_status,
            'conflicts', '[]'::jsonb
        );
    END IF;
    
    -- Check for date conflicts
    SELECT 
        COUNT(*),
        jsonb_agg(
            jsonb_build_object(
                'contract_id', c.id,
                'contract_number', c.contract_number,
                'start_date', c.start_date,
                'end_date', c.end_date,
                'customer_name', COALESCE(cu.company_name, cu.first_name || ' ' || cu.last_name),
                'status', c.status
            )
        )
    INTO conflicts_count, conflict_details
    FROM public.contracts c
    JOIN public.customers cu ON c.customer_id = cu.id
    WHERE c.vehicle_id = vehicle_id_param
    AND c.status IN ('active', 'draft')
    AND (exclude_contract_id_param IS NULL OR c.id != exclude_contract_id_param)
    AND (
        (c.start_date <= end_date_param AND c.end_date >= start_date_param)
    );
    
    result := jsonb_build_object(
        'available', conflicts_count = 0,
        'reason', CASE WHEN conflicts_count > 0 THEN 'date_conflict' ELSE 'available' END,
        'message', CASE 
            WHEN conflicts_count > 0 THEN 'يوجد تضارب في التواريخ - ' || conflicts_count || ' عقد متضارب'
            ELSE 'المركبة متاحة'
        END,
        'conflicts', COALESCE(conflict_details, '[]'::jsonb),
        'conflicts_count', conflicts_count
    );
    
    RETURN result;
END;
$function$;

-- Create function for customer eligibility check
CREATE OR REPLACE FUNCTION public.check_customer_eligibility_realtime(customer_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record record;
    outstanding_amount numeric := 0;
    active_contracts_count integer := 0;
    result jsonb;
    issues jsonb := '[]'::jsonb;
BEGIN
    -- Get customer details
    SELECT *
    INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'customer_not_found',
            'message', 'العميل غير موجود',
            'issues', '[]'::jsonb
        );
    END IF;
    
    -- Check if customer is blacklisted
    IF customer_record.is_blacklisted THEN
        issues := issues || jsonb_build_array(jsonb_build_object(
            'type', 'blacklisted',
            'severity', 'critical',
            'message', 'العميل محظور: ' || COALESCE(customer_record.blacklist_reason, 'غير محدد')
        ));
    END IF;
    
    -- Check if customer is active
    IF NOT customer_record.is_active THEN
        issues := issues || jsonb_build_array(jsonb_build_object(
            'type', 'inactive',
            'severity', 'high',
            'message', 'العميل غير نشط'
        ));
    END IF;
    
    -- Check outstanding payments
    SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0)
    INTO outstanding_amount
    FROM public.invoices
    WHERE customer_id = customer_id_param
    AND status IN ('pending', 'overdue');
    
    IF outstanding_amount > 0 THEN
        issues := issues || jsonb_build_array(jsonb_build_object(
            'type', 'outstanding_payments',
            'severity', 'medium',
            'message', 'يوجد مبالغ مستحقة: ' || outstanding_amount || ' د.ك',
            'amount', outstanding_amount
        ));
    END IF;
    
    -- Check active contracts count
    SELECT COUNT(*)
    INTO active_contracts_count
    FROM public.contracts
    WHERE customer_id = customer_id_param
    AND status = 'active';
    
    IF active_contracts_count >= 5 THEN
        issues := issues || jsonb_build_array(jsonb_build_object(
            'type', 'max_contracts',
            'severity', 'medium',
            'message', 'العميل لديه ' || active_contracts_count || ' عقود نشطة',
            'count', active_contracts_count
        ));
    END IF;
    
    result := jsonb_build_object(
        'eligible', NOT (customer_record.is_blacklisted OR NOT customer_record.is_active),
        'customer_name', COALESCE(customer_record.company_name, customer_record.first_name || ' ' || customer_record.last_name),
        'issues', issues,
        'outstanding_amount', outstanding_amount,
        'active_contracts_count', active_contracts_count
    );
    
    RETURN result;
END;
$function$;

-- Create function for comprehensive contract validation
CREATE OR REPLACE FUNCTION public.validate_contract_realtime(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    validation_result jsonb := '{"valid": true, "alerts": [], "warnings": [], "errors": []}'::jsonb;
    customer_check jsonb;
    vehicle_check jsonb;
    amount_check jsonb;
    date_check jsonb;
BEGIN
    -- Customer eligibility check
    IF contract_data->>'customer_id' IS NOT NULL THEN
        customer_check := public.check_customer_eligibility_realtime((contract_data->>'customer_id')::uuid);
        
        IF NOT (customer_check->>'eligible')::boolean THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
            validation_result := jsonb_set(validation_result, '{errors}', 
                (validation_result->'errors') || customer_check->'issues');
        ELSIF jsonb_array_length(customer_check->'issues') > 0 THEN
            validation_result := jsonb_set(validation_result, '{warnings}', 
                (validation_result->'warnings') || customer_check->'issues');
        END IF;
    END IF;
    
    -- Vehicle availability check
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != 'none' THEN
        vehicle_check := public.check_vehicle_availability_realtime(
            (contract_data->>'vehicle_id')::uuid,
            (contract_data->>'start_date')::date,
            (contract_data->>'end_date')::date
        );
        
        IF NOT (vehicle_check->>'available')::boolean THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
            validation_result := jsonb_set(validation_result, '{errors}', 
                (validation_result->'errors') || jsonb_build_array(jsonb_build_object(
                    'type', 'vehicle_unavailable',
                    'severity', 'critical',
                    'message', vehicle_check->>'message',
                    'conflicts', vehicle_check->'conflicts'
                )));
        END IF;
    END IF;
    
    -- Amount validation
    IF contract_data->>'contract_amount' IS NOT NULL THEN
        IF (contract_data->>'contract_amount')::numeric <= 0 THEN
            validation_result := jsonb_set(validation_result, '{errors}', 
                (validation_result->'errors') || jsonb_build_array(jsonb_build_object(
                    'type', 'invalid_amount',
                    'severity', 'high',
                    'message', 'مبلغ العقد يجب أن يكون أكبر من صفر'
                )));
        ELSIF (contract_data->>'contract_amount')::numeric > 50000 THEN
            validation_result := jsonb_set(validation_result, '{warnings}', 
                (validation_result->'warnings') || jsonb_build_array(jsonb_build_object(
                    'type', 'high_amount',
                    'severity', 'medium',
                    'message', 'مبلغ العقد مرتفع (' || (contract_data->>'contract_amount')::numeric || ' د.ك) - قد يتطلب موافقة إضافية'
                )));
        END IF;
    END IF;
    
    -- Date validation
    IF contract_data->>'start_date' IS NOT NULL AND contract_data->>'end_date' IS NOT NULL THEN
        IF (contract_data->>'start_date')::date >= (contract_data->>'end_date')::date THEN
            validation_result := jsonb_set(validation_result, '{errors}', 
                (validation_result->'errors') || jsonb_build_array(jsonb_build_object(
                    'type', 'invalid_dates',
                    'severity', 'high',
                    'message', 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'
                )));
        ELSIF (contract_data->>'start_date')::date < CURRENT_DATE THEN
            validation_result := jsonb_set(validation_result, '{warnings}', 
                (validation_result->'warnings') || jsonb_build_array(jsonb_build_object(
                    'type', 'past_date',
                    'severity', 'low',
                    'message', 'تاريخ البداية في الماضي'
                )));
        END IF;
    END IF;
    
    RETURN validation_result;
END;
$function$;