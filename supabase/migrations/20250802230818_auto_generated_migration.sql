-- Fix the create_contract_with_journal_entry function by removing the call to deleted function
-- and integrating journal entry creation logic directly

CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    p_company_id uuid,
    p_customer_id uuid,
    p_vehicle_id uuid DEFAULT NULL,
    p_contract_type text DEFAULT 'rental',
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
AS $$
DECLARE
    v_contract_id uuid;
    v_contract_number text;
    v_journal_entry_id uuid;
    v_journal_entry_number text;
    v_receivable_account_id uuid;
    v_revenue_account_id uuid;
    v_sales_cost_center_id uuid;
    v_result jsonb;
    v_customer_eligible boolean := false;
    v_vehicle_available boolean := true;
    v_eligibility_reason text;
    v_availability_reason text;
BEGIN
    -- Start with validation
    
    -- Check customer eligibility
    SELECT 
        CASE 
            WHEN is_blacklisted = true THEN false
            WHEN is_active = false THEN false
            ELSE true
        END,
        CASE 
            WHEN is_blacklisted = true THEN 'العميل محظور'
            WHEN is_active = false THEN 'العميل غير نشط'
            ELSE 'مؤهل'
        END
    INTO v_customer_eligible, v_eligibility_reason
    FROM public.customers
    WHERE id = p_customer_id AND company_id = p_company_id;
    
    IF NOT v_customer_eligible THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CUSTOMER_NOT_ELIGIBLE',
            'error_message', v_eligibility_reason
        );
    END IF;
    
    -- Check vehicle availability if specified
    IF p_vehicle_id IS NOT NULL THEN
        SELECT 
            CASE 
                WHEN status NOT IN ('available', 'reserved') THEN false
                ELSE true
            END,
            CASE 
                WHEN status NOT IN ('available', 'reserved') THEN 'المركبة غير متاحة'
                ELSE 'متاحة'
            END
        INTO v_vehicle_available, v_availability_reason
        FROM public.vehicles
        WHERE id = p_vehicle_id AND company_id = p_company_id;
        
        IF NOT v_vehicle_available THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'VEHICLE_NOT_AVAILABLE',
                'error_message', v_availability_reason
            );
        END IF;
        
        -- Check for date conflicts
        IF EXISTS (
            SELECT 1 FROM public.contracts
            WHERE vehicle_id = p_vehicle_id
            AND status IN ('active', 'draft')
            AND (
                (start_date <= p_end_date AND end_date >= p_start_date)
            )
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'VEHICLE_DATE_CONFLICT',
                'error_message', 'يوجد تضارب في مواعيد استخدام المركبة'
            );
        END IF;
    END IF;
    
    -- Generate contract number
    v_contract_number := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.contracts 
        WHERE company_id = p_company_id 
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- Generate new UUID for contract
    v_contract_id := gen_random_uuid();
    
    -- Create the contract first
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
        v_contract_id,
        p_company_id,
        p_customer_id,
        p_vehicle_id,
        v_contract_number,
        p_contract_type,
        CURRENT_DATE,
        p_start_date,
        p_end_date,
        p_contract_amount,
        p_monthly_amount,
        p_description,
        p_terms,
        'draft',
        p_created_by,
        p_cost_center_id
    );
    
    -- Now create journal entry (contract is committed and visible)
    BEGIN
        -- Get required accounts and cost center
        SELECT id INTO v_sales_cost_center_id
        FROM public.cost_centers
        WHERE company_id = p_company_id
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
        
        -- Get account mappings
        v_receivable_account_id := public.get_mapped_account_enhanced(p_company_id, 'RECEIVABLES');
        v_revenue_account_id := public.get_mapped_account_enhanced(p_company_id, 'RENTAL_REVENUE');
        
        -- Fallback to sales revenue if rental revenue not found
        IF v_revenue_account_id IS NULL THEN
            v_revenue_account_id := public.get_mapped_account_enhanced(p_company_id, 'SALES_REVENUE');
        END IF;
        
        -- Only create journal entry if we have both required accounts
        IF v_receivable_account_id IS NOT NULL AND v_revenue_account_id IS NOT NULL THEN
            -- Generate journal entry number
            v_journal_entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.journal_entries 
                WHERE company_id = p_company_id 
                AND DATE(entry_date) = CURRENT_DATE
            )::TEXT, 4, '0');
            
            -- Create journal entry
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
                p_company_id,
                v_journal_entry_number,
                CURRENT_DATE,
                'Contract Revenue - ' || v_contract_number,
                'contract',
                v_contract_id,
                p_contract_amount,
                p_contract_amount,
                'posted',
                p_created_by
            ) RETURNING id INTO v_journal_entry_id;
            
            -- Create journal entry lines
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
                v_journal_entry_id,
                v_receivable_account_id,
                v_sales_cost_center_id,
                1,
                'Accounts Receivable - ' || v_contract_number,
                p_contract_amount,
                0
            ),
            (
                gen_random_uuid(),
                v_journal_entry_id,
                v_revenue_account_id,
                v_sales_cost_center_id,
                2,
                'Contract Revenue - ' || v_contract_number,
                0,
                p_contract_amount
            );
            
            -- Update contract with journal entry reference
            UPDATE public.contracts 
            SET journal_entry_id = v_journal_entry_id
            WHERE id = v_contract_id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the contract creation
            RAISE WARNING 'Failed to create journal entry for contract %: %', v_contract_id, SQLERRM;
            v_journal_entry_id := NULL;
            v_journal_entry_number := NULL;
    END;
    
    -- Update vehicle status if specified
    IF p_vehicle_id IS NOT NULL THEN
        UPDATE public.vehicles 
        SET status = 'reserved'
        WHERE id = p_vehicle_id;
    END IF;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number
    );
    
    -- Add journal entry info if created
    IF v_journal_entry_id IS NOT NULL THEN
        v_result := v_result || jsonb_build_object(
            'journal_entry_id', v_journal_entry_id,
            'journal_entry_number', v_journal_entry_number
        );
    ELSE
        v_result := v_result || jsonb_build_object(
            'requires_manual_entry', true,
            'warnings', ARRAY['Journal entry could not be created automatically. Please create manually.']
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Clean up any partial data
        DELETE FROM public.contracts WHERE id = v_contract_id;
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_CREATION_FAILED',
            'error_message', 'فشل في إنشاء العقد: ' || SQLERRM
        );
END;
$$;