-- Drop all existing versions of create_contract_with_journal_entry with specific signatures
DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry(
    company_id_param uuid, 
    customer_id_param uuid, 
    vehicle_id_param uuid,
    contract_number_param text,
    contract_type_param text,
    contract_date_param date,
    start_date_param date,
    end_date_param date,
    contract_amount_param numeric,
    monthly_amount_param numeric,
    description_param text,
    terms_param text,
    cost_center_id_param uuid,
    created_by_param uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry(
    p_company_id uuid, 
    p_customer_id uuid, 
    p_vehicle_id uuid,
    p_contract_type text,
    p_contract_date date,
    p_start_date date,
    p_end_date date,
    p_contract_amount numeric,
    p_monthly_amount numeric,
    p_description text,
    p_terms text,
    p_cost_center_id uuid,
    p_created_by uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry(
    p_customer_id uuid,
    p_vehicle_id uuid,
    p_contract_number character varying,
    p_contract_type text,
    p_contract_date date,
    p_start_date date,
    p_end_date date,
    p_contract_amount numeric,
    p_monthly_amount numeric,
    p_description text,
    p_terms text,
    p_cost_center_id uuid,
    p_created_by uuid
) CASCADE;

-- Now create the unified function
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    p_customer_id uuid,
    p_vehicle_id uuid DEFAULT NULL,
    p_contract_number text DEFAULT NULL,
    p_contract_type text DEFAULT 'rental',
    p_contract_date date DEFAULT CURRENT_DATE,
    p_start_date date DEFAULT CURRENT_DATE,
    p_end_date date DEFAULT CURRENT_DATE + INTERVAL '30 days',
    p_contract_amount numeric DEFAULT 0,
    p_monthly_amount numeric DEFAULT 0,
    p_description text DEFAULT NULL,
    p_terms text DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL,
    p_created_by uuid DEFAULT auth.uid()
)
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
    v_company_id uuid;
    v_customer_exists boolean;
    v_vehicle_available boolean;
    v_result jsonb;
BEGIN
    -- Get company ID from user profile
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE user_id = COALESCE(p_created_by, auth.uid());
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User company not found',
            'error_code', 'COMPANY_NOT_FOUND'
        );
    END IF;
    
    -- Validate customer exists and is active
    SELECT EXISTS(
        SELECT 1 FROM public.customers 
        WHERE id = p_customer_id 
        AND company_id = v_company_id 
        AND is_active = true
        AND is_blacklisted = false
    ) INTO v_customer_exists;
    
    IF NOT v_customer_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Customer not found or inactive',
            'error_code', 'CUSTOMER_INVALID'
        );
    END IF;
    
    -- Validate vehicle availability if specified
    IF p_vehicle_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.vehicles 
            WHERE id = p_vehicle_id 
            AND company_id = v_company_id 
            AND status IN ('available', 'reserved')
        ) INTO v_vehicle_available;
        
        IF NOT v_vehicle_available THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Vehicle not available',
                'error_code', 'VEHICLE_UNAVAILABLE'
            );
        END IF;
    END IF;
    
    -- Generate contract number if not provided
    IF p_contract_number IS NULL OR p_contract_number = '' THEN
        v_contract_number := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.contracts 
            WHERE company_id = v_company_id 
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::text, 4, '0');
    ELSE
        v_contract_number := p_contract_number;
    END IF;
    
    -- Check for duplicate contract number
    IF EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE contract_number = v_contract_number 
        AND company_id = v_company_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract number already exists',
            'error_code', 'DUPLICATE_CONTRACT_NUMBER'
        );
    END IF;
    
    -- Generate new contract ID
    v_contract_id := gen_random_uuid();
    
    -- Create the contract
    BEGIN
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
            v_contract_id,
            v_company_id,
            p_customer_id,
            p_vehicle_id,
            v_contract_number,
            p_contract_type,
            p_contract_date,
            p_start_date,
            p_end_date,
            p_contract_amount,
            p_monthly_amount,
            p_description,
            p_terms,
            p_cost_center_id,
            COALESCE(p_created_by, auth.uid()),
            'draft'
        );
        
        -- Mark vehicle as reserved if specified
        IF p_vehicle_id IS NOT NULL THEN
            UPDATE public.vehicles 
            SET status = 'reserved'
            WHERE id = p_vehicle_id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to create contract: ' || SQLERRM,
                'error_code', 'CONTRACT_CREATION_FAILED'
            );
    END;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unexpected error: ' || SQLERRM,
            'error_code', 'UNEXPECTED_ERROR'
        );
END;
$function$;