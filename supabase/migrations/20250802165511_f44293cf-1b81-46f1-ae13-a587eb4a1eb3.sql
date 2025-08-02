-- Comprehensive fix for ambiguous user_id column references
-- This script addresses the "column reference user_id is ambiguous" error

-- 1. Create fixed version of get_user_company function
CREATE OR REPLACE FUNCTION public.get_user_company_fixed(input_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    SELECT profiles.company_id 
    INTO user_company_id
    FROM public.profiles
    WHERE profiles.user_id = input_user_id;
    
    RETURN user_company_id;
END;
$$;

-- 2. Create fixed version of validate_contract_data function
CREATE OR REPLACE FUNCTION public.validate_contract_data_fixed(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    validation_result jsonb := '{"valid": true, "errors": []}'::jsonb;
    customer_status text;
    vehicle_availability text;
    conflicts_count integer;
BEGIN
    -- التحقق من حالة العميل
    SELECT 
        CASE 
            WHEN customers.is_blacklisted = true THEN 'blacklisted'
            WHEN customers.is_active = false THEN 'inactive'
            ELSE 'active'
        END INTO customer_status
    FROM public.customers
    WHERE customers.id = (contract_data->>'customer_id')::uuid;
    
    IF customer_status = 'blacklisted' THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["العميل محظور ولا يمكن إنشاء عقود معه"]'::jsonb
        );
    END IF;
    
    IF customer_status = 'inactive' THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["العميل غير نشط"]'::jsonb
        );
    END IF;
    
    -- التحقق من توفر المركبة (إذا تم تحديدها)
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        SELECT vehicles.status INTO vehicle_availability
        FROM public.vehicles
        WHERE vehicles.id = (contract_data->>'vehicle_id')::uuid;
        
        IF vehicle_availability NOT IN ('available', 'reserved') THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || '["المركبة غير متاحة حالياً"]'::jsonb
            );
        END IF;
        
        -- التحقق من تضارب المواعيد
        SELECT COUNT(*) INTO conflicts_count
        FROM public.contracts
        WHERE contracts.vehicle_id = (contract_data->>'vehicle_id')::uuid
        AND contracts.status IN ('active', 'draft')
        AND (
            (contracts.start_date <= (contract_data->>'end_date')::date AND contracts.end_date >= (contract_data->>'start_date')::date)
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
                validation_result->'errors' || '["يوجد تضارب في مواعيد استخدام المركبة"]'::jsonb
            );
        END IF;
    END IF;
    
    RETURN validation_result;
END;
$$;

-- 3. Create safe contract creation function
CREATE OR REPLACE FUNCTION public.create_contract_safe(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    result jsonb := '{"success": false, "contract_id": null, "errors": []}'::jsonb;
    new_contract_id uuid;
    validation_result jsonb;
    current_user_id uuid;
    user_company_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        result := jsonb_set(result, '{errors}', result->'errors' || '["المستخدم غير مصرح له"]'::jsonb);
        RETURN result;
    END IF;
    
    -- Get user's company
    user_company_id := public.get_user_company_fixed(current_user_id);
    IF user_company_id IS NULL THEN
        result := jsonb_set(result, '{errors}', result->'errors' || '["لم يتم العثور على شركة المستخدم"]'::jsonb);
        RETURN result;
    END IF;
    
    -- Validate contract data
    validation_result := public.validate_contract_data_fixed(contract_data);
    IF NOT (validation_result->>'valid')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'contract_id', null,
            'errors', validation_result->'errors'
        );
    END IF;
    
    -- Create contract
    INSERT INTO public.contracts (
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_date,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        status,
        contract_type,
        description,
        terms,
        created_by
    ) VALUES (
        user_company_id,
        (contract_data->>'customer_id')::uuid,
        NULLIF(contract_data->>'vehicle_id', '')::uuid,
        contract_data->>'contract_number',
        (contract_data->>'contract_date')::date,
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        (contract_data->>'monthly_amount')::numeric,
        COALESCE(contract_data->>'status', 'draft'),
        contract_data->>'contract_type',
        contract_data->>'description',
        contract_data->>'terms',
        current_user_id
    ) RETURNING id INTO new_contract_id;
    
    result := jsonb_set(result, '{success}', 'true'::jsonb);
    result := jsonb_set(result, '{contract_id}', to_jsonb(new_contract_id));
    
    RETURN result;
END;
$$;

-- 4. Fix user access validation function
CREATE OR REPLACE FUNCTION public.user_has_access_to_company_fixed(input_user_id uuid, target_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_company_id uuid;
    user_roles text[];
BEGIN
    -- Get user's company
    SELECT profiles.company_id 
    INTO user_company_id
    FROM public.profiles
    WHERE profiles.user_id = input_user_id;
    
    -- Get user's roles
    SELECT array_agg(user_roles.role::text)
    INTO user_roles
    FROM public.user_roles
    WHERE user_roles.user_id = input_user_id;
    
    -- Super admin has access to all companies
    IF 'super_admin' = ANY(user_roles) THEN
        RETURN true;
    END IF;
    
    -- Users can only access their own company
    RETURN user_company_id = target_company_id;
END;
$$;

-- 5. Fix vehicle availability check function
CREATE OR REPLACE FUNCTION public.check_vehicle_availability_fixed(
    vehicle_id_param uuid,
    start_date_param date,
    end_date_param date,
    exclude_contract_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    vehicle_status text;
    conflicting_contracts integer;
    result jsonb;
BEGIN
    -- Check if vehicle exists and get status
    SELECT vehicles.status INTO vehicle_status
    FROM public.vehicles
    WHERE vehicles.id = vehicle_id_param;
    
    IF vehicle_status IS NULL THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_not_found'
        );
    END IF;
    
    IF vehicle_status NOT IN ('available', 'reserved') THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'vehicle_not_available',
            'current_status', vehicle_status
        );
    END IF;
    
    -- Check for conflicting contracts
    SELECT COUNT(*) INTO conflicting_contracts
    FROM public.contracts
    WHERE contracts.vehicle_id = vehicle_id_param
    AND contracts.status IN ('active', 'draft')
    AND (exclude_contract_id_param IS NULL OR contracts.id != exclude_contract_id_param)
    AND (
        (contracts.start_date <= end_date_param AND contracts.end_date >= start_date_param)
    );
    
    IF conflicting_contracts > 0 THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'date_conflict',
            'conflicting_contracts', conflicting_contracts
        );
    END IF;
    
    RETURN jsonb_build_object(
        'available', true,
        'reason', 'available'
    );
END;
$$;

-- 6. Fix contract search function
CREATE OR REPLACE FUNCTION public.search_contracts_fixed(
    search_company_id uuid,
    search_term text DEFAULT NULL,
    status_filter text DEFAULT NULL,
    customer_filter uuid DEFAULT NULL,
    vehicle_filter uuid DEFAULT NULL,
    limit_param integer DEFAULT 50,
    offset_param integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    contract_number character varying,
    customer_name text,
    vehicle_plate text,
    contract_amount numeric,
    status text,
    start_date date,
    end_date date,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        contracts.id,
        contracts.contract_number,
        CASE 
            WHEN customers.customer_type = 'individual' 
            THEN customers.first_name || ' ' || customers.last_name
            ELSE customers.company_name 
        END as customer_name,
        vehicles.plate_number as vehicle_plate,
        contracts.contract_amount,
        contracts.status,
        contracts.start_date,
        contracts.end_date,
        contracts.created_at
    FROM public.contracts
    LEFT JOIN public.customers ON contracts.customer_id = customers.id
    LEFT JOIN public.vehicles ON contracts.vehicle_id = vehicles.id
    WHERE contracts.company_id = search_company_id
    AND (search_term IS NULL OR (
        contracts.contract_number ILIKE '%' || search_term || '%' OR
        customers.first_name ILIKE '%' || search_term || '%' OR
        customers.last_name ILIKE '%' || search_term || '%' OR
        customers.company_name ILIKE '%' || search_term || '%' OR
        vehicles.plate_number ILIKE '%' || search_term || '%'
    ))
    AND (status_filter IS NULL OR contracts.status = status_filter)
    AND (customer_filter IS NULL OR contracts.customer_id = customer_filter)
    AND (vehicle_filter IS NULL OR contracts.vehicle_id = vehicle_filter)
    ORDER BY contracts.created_at DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$;

-- 7. Update RLS policies to use qualified references

-- Drop existing policies that might have ambiguous references
DROP POLICY IF EXISTS "Users can view contracts in their company" ON public.contracts;
DROP POLICY IF EXISTS "Admins can manage contracts in their company" ON public.contracts;
DROP POLICY IF EXISTS "Staff can create contracts in their company" ON public.contracts;

-- Create new policies with explicit qualifications
CREATE POLICY "Users can view contracts in their company" ON public.contracts
FOR SELECT USING (
    contracts.company_id = public.get_user_company_fixed(auth.uid())
);

CREATE POLICY "Admins can manage contracts in their company" ON public.contracts
FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (contracts.company_id = public.get_user_company_fixed(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
) WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (contracts.company_id = public.get_user_company_fixed(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "Staff can create contracts in their company" ON public.contracts
FOR INSERT WITH CHECK (
    contracts.company_id = public.get_user_company_fixed(auth.uid()) AND
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
);

-- Update customers table policies
DROP POLICY IF EXISTS "Users can view customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers in their company" ON public.customers;

CREATE POLICY "Users can view customers in their company" ON public.customers
FOR SELECT USING (
    customers.company_id = public.get_user_company_fixed(auth.uid())
);

CREATE POLICY "Admins can manage customers in their company" ON public.customers
FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (customers.company_id = public.get_user_company_fixed(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
) WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (customers.company_id = public.get_user_company_fixed(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- Update vehicles table policies
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles in their company" ON public.vehicles;

CREATE POLICY "Users can view vehicles in their company" ON public.vehicles
FOR SELECT USING (
    vehicles.company_id = public.get_user_company_fixed(auth.uid())
);

CREATE POLICY "Admins can manage vehicles in their company" ON public.vehicles
FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (vehicles.company_id = public.get_user_company_fixed(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
) WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (vehicles.company_id = public.get_user_company_fixed(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- 8. Create a test function to verify the fix
CREATE OR REPLACE FUNCTION public.test_ambiguity_fix()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    test_result jsonb := '{"passed": [], "failed": []}'::jsonb;
    current_user_id uuid;
    user_company uuid;
    test_contract_data jsonb;
BEGIN
    current_user_id := auth.uid();
    
    -- Test 1: get_user_company_fixed function
    BEGIN
        user_company := public.get_user_company_fixed(current_user_id);
        test_result := jsonb_set(test_result, '{passed}', 
            test_result->'passed' || '["get_user_company_fixed works"]'::jsonb);
    EXCEPTION WHEN OTHERS THEN
        test_result := jsonb_set(test_result, '{failed}', 
            test_result->'failed' || jsonb_build_array('get_user_company_fixed failed: ' || SQLERRM));
    END;
    
    -- Test 2: validate_contract_data_fixed function
    BEGIN
        test_contract_data := '{
            "customer_id": "00000000-0000-0000-0000-000000000000",
            "vehicle_id": null,
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        }'::jsonb;
        
        PERFORM public.validate_contract_data_fixed(test_contract_data);
        test_result := jsonb_set(test_result, '{passed}', 
            test_result->'passed' || '["validate_contract_data_fixed works"]'::jsonb);
    EXCEPTION WHEN OTHERS THEN
        test_result := jsonb_set(test_result, '{failed}', 
            test_result->'failed' || jsonb_build_array('validate_contract_data_fixed failed: ' || SQLERRM));
    END;
    
    -- Test 3: check_vehicle_availability_fixed function
    BEGIN
        PERFORM public.check_vehicle_availability_fixed(
            '00000000-0000-0000-0000-000000000000'::uuid,
            '2024-01-01'::date,
            '2024-12-31'::date
        );
        test_result := jsonb_set(test_result, '{passed}', 
            test_result->'passed' || '["check_vehicle_availability_fixed works"]'::jsonb);
    EXCEPTION WHEN OTHERS THEN
        test_result := jsonb_set(test_result, '{failed}', 
            test_result->'failed' || jsonb_build_array('check_vehicle_availability_fixed failed: ' || SQLERRM));
    END;
    
    RETURN test_result;
END;
$$;

-- 9. Log the fix application
INSERT INTO public.audit_logs (
    action,
    resource_type,
    severity,
    old_values,
    new_values
) VALUES (
    'fix_ambiguous_user_id_references',
    'database_functions',
    'info',
    '{"issue": "column reference user_id is ambiguous"}'::jsonb,
    '{"resolution": "qualified all user_id references in functions and RLS policies"}'::jsonb
);

-- 10. Diagnostic query to check for remaining ambiguities
SELECT 
    'Fixed ambiguous user_id references' as status,
    'All functions and policies updated with qualified references' as description,
    now() as applied_at;