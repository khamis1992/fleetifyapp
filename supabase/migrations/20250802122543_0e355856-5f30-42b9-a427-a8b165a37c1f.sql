-- Phase 1: Database Improvements
-- Add improved contract validation functions and requirements checks

-- 1. Create enhanced contract validation function with better error handling
CREATE OR REPLACE FUNCTION public.validate_contract_realtime(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"valid": true, "alerts": [], "warnings": [], "errors": []}'::jsonb;
    customer_record RECORD;
    vehicle_record RECORD;
    conflicts_count INTEGER := 0;
    conflict_contracts RECORD;
    alerts_array jsonb := '[]'::jsonb;
    warnings_array jsonb := '[]'::jsonb;
    errors_array jsonb := '[]'::jsonb;
BEGIN
    -- Validate customer if provided
    IF contract_data->>'customer_id' IS NOT NULL AND contract_data->>'customer_id' != '' THEN
        BEGIN
            SELECT * INTO customer_record
            FROM public.customers
            WHERE id = (contract_data->>'customer_id')::uuid;
            
            IF NOT FOUND THEN
                errors_array := errors_array || jsonb_build_object(
                    'type', 'customer_not_found',
                    'severity', 'critical',
                    'message', 'العميل المحدد غير موجود'
                );
            ELSE
                -- Check customer status
                IF customer_record.is_blacklisted THEN
                    errors_array := errors_array || jsonb_build_object(
                        'type', 'customer_blacklisted',
                        'severity', 'critical',
                        'message', 'العميل محظور: ' || COALESCE(customer_record.blacklist_reason, 'غير محدد')
                    );
                END IF;
                
                IF NOT customer_record.is_active THEN
                    warnings_array := warnings_array || jsonb_build_object(
                        'type', 'customer_inactive',
                        'severity', 'high',
                        'message', 'العميل غير نشط'
                    );
                END IF;
                
                -- Check for outstanding payments
                SELECT COUNT(*) INTO conflicts_count
                FROM public.contracts c
                WHERE c.customer_id = customer_record.id
                AND c.status = 'active'
                AND EXISTS (
                    SELECT 1 FROM contract_payment_summary cps
                    WHERE cps.contract_id = c.id 
                    AND cps.has_outstanding_payments = true
                );
                
                IF conflicts_count > 0 THEN
                    warnings_array := warnings_array || jsonb_build_object(
                        'type', 'outstanding_payments',
                        'severity', 'medium',
                        'message', 'العميل لديه مدفوعات مستحقة في عقود أخرى',
                        'count', conflicts_count
                    );
                END IF;
            END IF;
        EXCEPTION WHEN others THEN
            errors_array := errors_array || jsonb_build_object(
                'type', 'customer_validation_error',
                'severity', 'high',
                'message', 'خطأ في التحقق من بيانات العميل: ' || SQLERRM
            );
        END;
    END IF;
    
    -- Validate vehicle if provided
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        BEGIN
            SELECT * INTO vehicle_record
            FROM public.vehicles
            WHERE id = (contract_data->>'vehicle_id')::uuid;
            
            IF NOT FOUND THEN
                errors_array := errors_array || jsonb_build_object(
                    'type', 'vehicle_not_found',
                    'severity', 'critical',
                    'message', 'المركبة المحددة غير موجودة'
                );
            ELSE
                -- Check vehicle availability
                IF vehicle_record.status NOT IN ('available', 'reserved') THEN
                    errors_array := errors_array || jsonb_build_object(
                        'type', 'vehicle_unavailable',
                        'severity', 'critical',
                        'message', 'المركبة غير متاحة: ' || vehicle_record.status
                    );
                END IF;
                
                -- Check for date conflicts if dates are provided
                IF contract_data->>'start_date' IS NOT NULL AND contract_data->>'end_date' IS NOT NULL THEN
                    conflicts_count := 0;
                    FOR conflict_contracts IN 
                        SELECT c.contract_number, c.start_date, c.end_date
                        FROM public.contracts c
                        WHERE c.vehicle_id = vehicle_record.id
                        AND c.status IN ('active', 'draft')
                        AND (
                            (c.start_date <= (contract_data->>'end_date')::date AND c.end_date >= (contract_data->>'start_date')::date)
                        )
                    LOOP
                        conflicts_count := conflicts_count + 1;
                        warnings_array := warnings_array || jsonb_build_object(
                            'type', 'schedule_conflict',
                            'severity', 'high',
                            'message', 'تضارب في المواعيد مع العقد: ' || conflict_contracts.contract_number,
                            'conflicts', jsonb_build_array(
                                jsonb_build_object(
                                    'contract_number', conflict_contracts.contract_number,
                                    'start_date', conflict_contracts.start_date,
                                    'end_date', conflict_contracts.end_date
                                )
                            )
                        );
                    END LOOP;
                END IF;
                
                -- Check vehicle maintenance status
                IF vehicle_record.maintenance_status = 'in_maintenance' THEN
                    warnings_array := warnings_array || jsonb_build_object(
                        'type', 'vehicle_maintenance',
                        'severity', 'medium',
                        'message', 'المركبة قيد الصيانة حالياً'
                    );
                END IF;
            END IF;
        EXCEPTION WHEN others THEN
            errors_array := errors_array || jsonb_build_object(
                'type', 'vehicle_validation_error',
                'severity', 'high',
                'message', 'خطأ في التحقق من بيانات المركبة: ' || SQLERRM
            );
        END;
    END IF;
    
    -- Validate contract amounts
    IF contract_data->>'contract_amount' IS NOT NULL THEN
        BEGIN
            IF (contract_data->>'contract_amount')::numeric <= 0 THEN
                errors_array := errors_array || jsonb_build_object(
                    'type', 'invalid_contract_amount',
                    'severity', 'high',
                    'message', 'مبلغ العقد يجب أن يكون أكبر من صفر'
                );
            END IF;
            
            IF contract_data->>'monthly_amount' IS NOT NULL THEN
                IF (contract_data->>'monthly_amount')::numeric <= 0 THEN
                    errors_array := errors_array || jsonb_build_object(
                        'type', 'invalid_monthly_amount',
                        'severity', 'high',
                        'message', 'المبلغ الشهري يجب أن يكون أكبر من صفر'
                    );
                ELSIF (contract_data->>'monthly_amount')::numeric > (contract_data->>'contract_amount')::numeric THEN
                    warnings_array := warnings_array || jsonb_build_object(
                        'type', 'monthly_exceeds_total',
                        'severity', 'medium',
                        'message', 'المبلغ الشهري أكبر من إجمالي العقد'
                    );
                END IF;
            END IF;
        EXCEPTION WHEN others THEN
            errors_array := errors_array || jsonb_build_object(
                'type', 'amount_validation_error',
                'severity', 'medium',
                'message', 'خطأ في التحقق من مبالغ العقد'
            );
        END;
    END IF;
    
    -- Validate dates
    IF contract_data->>'start_date' IS NOT NULL AND contract_data->>'end_date' IS NOT NULL THEN
        BEGIN
            IF (contract_data->>'start_date')::date > (contract_data->>'end_date')::date THEN
                errors_array := errors_array || jsonb_build_object(
                    'type', 'invalid_date_range',
                    'severity', 'high',
                    'message', 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية'
                );
            ELSIF (contract_data->>'start_date')::date < CURRENT_DATE THEN
                warnings_array := warnings_array || jsonb_build_object(
                    'type', 'past_start_date',
                    'severity', 'low',
                    'message', 'تاريخ البداية في الماضي'
                );
            END IF;
        EXCEPTION WHEN others THEN
            errors_array := errors_array || jsonb_build_object(
                'type', 'date_validation_error',
                'severity', 'medium',
                'message', 'خطأ في التحقق من التواريخ'
            );
        END;
    END IF;
    
    -- Build final result
    result := jsonb_set(result, '{alerts}', alerts_array);
    result := jsonb_set(result, '{warnings}', warnings_array);
    result := jsonb_set(result, '{errors}', errors_array);
    
    -- Set overall validity
    IF jsonb_array_length(errors_array) > 0 THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
    END IF;
    
    RETURN result;
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'valid', false,
        'alerts', '[]'::jsonb,
        'warnings', '[]'::jsonb,
        'errors', jsonb_build_array(
            jsonb_build_object(
                'type', 'validation_system_error',
                'severity', 'critical',
                'message', 'خطأ في نظام التحقق: ' || SQLERRM
            )
        )
    );
END;
$$;

-- 2. Create vehicle availability check function
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
AS $$
DECLARE
    vehicle_status text;
    conflict_count integer := 0;
    conflicts jsonb := '[]'::jsonb;
    conflict_record RECORD;
BEGIN
    -- Check if vehicle exists and get status
    SELECT status INTO vehicle_status
    FROM public.vehicles
    WHERE id = vehicle_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_not_found',
            'message', 'المركبة غير موجودة'
        );
    END IF;
    
    -- Check vehicle status
    IF vehicle_status NOT IN ('available', 'reserved') THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_status',
            'message', 'المركبة غير متاحة: ' || vehicle_status,
            'current_status', vehicle_status
        );
    END IF;
    
    -- Check for date conflicts
    FOR conflict_record IN
        SELECT c.id, c.contract_number, c.start_date, c.end_date, c.status
        FROM public.contracts c
        WHERE c.vehicle_id = vehicle_id_param
        AND c.status IN ('active', 'draft')
        AND (exclude_contract_id_param IS NULL OR c.id != exclude_contract_id_param)
        AND (
            (c.start_date <= end_date_param AND c.end_date >= start_date_param)
        )
    LOOP
        conflict_count := conflict_count + 1;
        conflicts := conflicts || jsonb_build_object(
            'contract_id', conflict_record.id,
            'contract_number', conflict_record.contract_number,
            'start_date', conflict_record.start_date,
            'end_date', conflict_record.end_date,
            'status', conflict_record.status
        );
    END LOOP;
    
    IF conflict_count > 0 THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'schedule_conflict',
            'message', 'يوجد تضارب في المواعيد مع ' || conflict_count || ' عقد آخر',
            'conflicts', conflicts,
            'conflict_count', conflict_count
        );
    END IF;
    
    RETURN jsonb_build_object(
        'available', true,
        'reason', 'available',
        'message', 'المركبة متاحة للحجز'
    );
    
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'available', false,
        'reason', 'check_failed',
        'message', 'فشل في التحقق من توفر المركبة: ' || SQLERRM
    );
END;
$$;

-- 3. Create customer eligibility check function
CREATE OR REPLACE FUNCTION public.check_customer_eligibility_realtime(customer_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    customer_record RECORD;
    outstanding_contracts integer := 0;
    total_outstanding_amount numeric := 0;
BEGIN
    -- Get customer details
    SELECT * INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'customer_not_found',
            'message', 'العميل غير موجود'
        );
    END IF;
    
    -- Check if customer is blacklisted
    IF customer_record.is_blacklisted THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'blacklisted',
            'message', 'العميل محظور: ' || COALESCE(customer_record.blacklist_reason, 'غير محدد'),
            'blacklist_reason', customer_record.blacklist_reason
        );
    END IF;
    
    -- Check if customer is active
    IF NOT customer_record.is_active THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'inactive',
            'message', 'العميل غير نشط'
        );
    END IF;
    
    -- Check for outstanding payments
    SELECT 
        COUNT(*),
        COALESCE(SUM(cps.outstanding_amount), 0)
    INTO outstanding_contracts, total_outstanding_amount
    FROM public.contracts c
    JOIN public.contract_payment_summary cps ON c.id = cps.contract_id
    WHERE c.customer_id = customer_id_param
    AND c.status = 'active'
    AND cps.has_outstanding_payments = true;
    
    IF outstanding_contracts > 0 THEN
        RETURN jsonb_build_object(
            'eligible', true,
            'reason', 'eligible_with_warnings',
            'message', 'العميل مؤهل مع وجود مدفوعات مستحقة',
            'warnings', jsonb_build_array(
                jsonb_build_object(
                    'type', 'outstanding_payments',
                    'message', 'العميل لديه ' || outstanding_contracts || ' عقد بمدفوعات مستحقة',
                    'outstanding_contracts', outstanding_contracts,
                    'total_outstanding_amount', total_outstanding_amount
                )
            )
        );
    END IF;
    
    RETURN jsonb_build_object(
        'eligible', true,
        'reason', 'eligible',
        'message', 'العميل مؤهل لعقد جديد'
    );
    
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'eligible', false,
        'reason', 'check_failed',
        'message', 'فشل في التحقق من أهلية العميل: ' || SQLERRM
    );
END;
$$;

-- 4. Create contract health monitoring function
CREATE OR REPLACE FUNCTION public.monitor_contract_health(company_id_param uuid)
RETURNS TABLE(
    id uuid,
    issue_type text,
    severity text,
    description text,
    contract_id uuid,
    recommended_action text,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Check for contracts without journal entries
    RETURN QUERY
    SELECT 
        gen_random_uuid() as id,
        'missing_journal_entry'::text as issue_type,
        'critical'::text as severity,
        'Contract is active but missing journal entry'::text as description,
        c.id as contract_id,
        'Create journal entry for contract'::text as recommended_action,
        jsonb_build_object(
            'contract_number', c.contract_number,
            'status', c.status,
            'created_at', c.created_at
        ) as metadata
    FROM public.contracts c
    WHERE c.company_id = company_id_param
    AND c.status = 'active'
    AND c.journal_entry_id IS NULL;
    
    -- Check for expired contracts still marked as active
    RETURN QUERY
    SELECT 
        gen_random_uuid() as id,
        'expired_active_contract'::text as issue_type,
        'high'::text as severity,
        'Contract has expired but still marked as active'::text as description,
        c.id as contract_id,
        'Update contract status to expired'::text as recommended_action,
        jsonb_build_object(
            'contract_number', c.contract_number,
            'end_date', c.end_date,
            'days_overdue', CURRENT_DATE - c.end_date
        ) as metadata
    FROM public.contracts c
    WHERE c.company_id = company_id_param
    AND c.status = 'active'
    AND c.end_date < CURRENT_DATE;
    
    -- Check for contracts with invalid account mappings
    RETURN QUERY
    SELECT 
        gen_random_uuid() as id,
        'invalid_account_mapping'::text as issue_type,
        'high'::text as severity,
        'Contract references non-existent or inactive account'::text as description,
        c.id as contract_id,
        'Update account mapping or reactivate account'::text as recommended_action,
        jsonb_build_object(
            'contract_number', c.contract_number,
            'account_id', c.account_id
        ) as metadata
    FROM public.contracts c
    WHERE c.company_id = company_id_param
    AND c.account_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts coa
        WHERE coa.id = c.account_id
        AND coa.is_active = true
    );
    
    -- Check for duplicate active contracts for same vehicle
    RETURN QUERY
    SELECT 
        gen_random_uuid() as id,
        'duplicate_vehicle_contracts'::text as issue_type,
        'medium'::text as severity,
        'Multiple active contracts for same vehicle with overlapping dates'::text as description,
        c1.id as contract_id,
        'Review and resolve date conflicts'::text as recommended_action,
        jsonb_build_object(
            'contract_number', c1.contract_number,
            'vehicle_id', c1.vehicle_id,
            'conflicting_contracts', (
                SELECT jsonb_agg(c2.contract_number)
                FROM public.contracts c2
                WHERE c2.vehicle_id = c1.vehicle_id
                AND c2.status = 'active'
                AND c2.id != c1.id
                AND c2.start_date <= c1.end_date
                AND c2.end_date >= c1.start_date
            )
        ) as metadata
    FROM public.contracts c1
    WHERE c1.company_id = company_id_param
    AND c1.status = 'active'
    AND c1.vehicle_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.contracts c2
        WHERE c2.vehicle_id = c1.vehicle_id
        AND c2.status = 'active'
        AND c2.id != c1.id
        AND c2.start_date <= c1.end_date
        AND c2.end_date >= c1.start_date
    );
    
    RETURN;
END;
$$;

-- 5. Create contract creation requirements check
CREATE OR REPLACE FUNCTION public.check_contract_creation_requirements(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"valid": true, "missing_requirements": [], "recommendations": []}'::jsonb;
    missing_requirements jsonb := '[]'::jsonb;
    recommendations jsonb := '[]'::jsonb;
    essential_account_types text[] := ARRAY['RECEIVABLES', 'SALES_REVENUE', 'RENTAL_REVENUE'];
    account_type text;
    mapping_exists boolean;
BEGIN
    -- Check for essential account mappings
    FOREACH account_type IN ARRAY essential_account_types
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM public.account_mappings am
            JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
            WHERE am.company_id = company_id_param
            AND dat.type_code = account_type
            AND am.is_active = true
        ) INTO mapping_exists;
        
        IF NOT mapping_exists THEN
            missing_requirements := missing_requirements || jsonb_build_object(
                'type', 'account_mapping',
                'code', account_type,
                'message', 'Missing account mapping for: ' || account_type,
                'severity', 'critical'
            );
        END IF;
    END LOOP;
    
    -- Check for active chart of accounts
    IF NOT EXISTS(
        SELECT 1 FROM public.chart_of_accounts
        WHERE company_id = company_id_param
        AND is_active = true
        LIMIT 1
    ) THEN
        missing_requirements := missing_requirements || jsonb_build_object(
            'type', 'chart_of_accounts',
            'message', 'No active chart of accounts found',
            'severity', 'critical'
        );
    END IF;
    
    -- Check for contract templates
    IF NOT EXISTS(
        SELECT 1 FROM public.contract_templates
        WHERE company_id = company_id_param
        AND is_active = true
        LIMIT 1
    ) THEN
        recommendations := recommendations || jsonb_build_object(
            'type', 'contract_templates',
            'message', 'Consider creating contract templates for faster contract creation',
            'severity', 'medium'
        );
    END IF;
    
    -- Check for approval workflows
    IF NOT EXISTS(
        SELECT 1 FROM public.approval_workflows
        WHERE company_id = company_id_param
        AND source_type = 'contract'
        AND is_active = true
        LIMIT 1
    ) THEN
        recommendations := recommendations || jsonb_build_object(
            'type', 'approval_workflows',
            'message', 'Consider setting up approval workflows for contract management',
            'severity', 'low'
        );
    END IF;
    
    -- Build result
    result := jsonb_set(result, '{missing_requirements}', missing_requirements);
    result := jsonb_set(result, '{recommendations}', recommendations);
    
    IF jsonb_array_length(missing_requirements) > 0 THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
    END IF;
    
    RETURN result;
END;
$$;

-- 6. Create cleanup function for contract issues
CREATE OR REPLACE FUNCTION public.cleanup_contract_issues(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"cleaned": [], "errors": [], "summary": {}}'::jsonb;
    cleaned_items jsonb := '[]'::jsonb;
    error_items jsonb := '[]'::jsonb;
    expired_count integer := 0;
    cleanup_count integer := 0;
BEGIN
    -- Update expired contracts
    UPDATE public.contracts
    SET status = 'expired', updated_at = now()
    WHERE company_id = company_id_param
    AND status = 'active'
    AND end_date < CURRENT_DATE;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    IF expired_count > 0 THEN
        cleaned_items := cleaned_items || jsonb_build_object(
            'type', 'expired_contracts',
            'count', expired_count,
            'message', 'Updated ' || expired_count || ' expired contracts'
        );
        cleanup_count := cleanup_count + expired_count;
    END IF;
    
    -- Add more cleanup operations as needed
    
    result := jsonb_set(result, '{cleaned}', cleaned_items);
    result := jsonb_set(result, '{errors}', error_items);
    result := jsonb_set(result, '{summary}', jsonb_build_object(
        'total_cleaned', cleanup_count,
        'total_errors', jsonb_array_length(error_items)
    ));
    
    RETURN result;
    
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'cleaned', '[]'::jsonb,
        'errors', jsonb_build_array(
            jsonb_build_object(
                'type', 'cleanup_failed',
                'message', 'Cleanup failed: ' || SQLERRM
            )
        ),
        'summary', jsonb_build_object('total_cleaned', 0, 'total_errors', 1)
    );
END;
$$;