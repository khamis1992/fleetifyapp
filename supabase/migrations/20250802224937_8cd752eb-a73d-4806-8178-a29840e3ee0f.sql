-- Create the missing create_contract_journal_entry function
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
    journal_number text;
BEGIN
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', contract_id_param;
    END IF;
    
    -- Get sales cost center
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Get mapped accounts using existing function
    receivable_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'RECEIVABLES');
    revenue_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'RENTAL_REVENUE');
    
    -- If rental revenue not found, try sales revenue
    IF revenue_account_id IS NULL THEN
        revenue_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'SALES_REVENUE');
    END IF;
    
    -- Generate journal entry number
    SELECT 'JE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = contract_record.company_id 
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 6, '0') INTO journal_number;
    
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
        contract_record.company_id,
        journal_number,
        contract_record.contract_date,
        'Contract Revenue Recognition - ' || contract_record.contract_number,
        'contract',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'draft',
        contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create debit entry (Accounts Receivable)
    IF receivable_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            receivable_account_id,
            sales_cost_center_id,
            1,
            'Accounts Receivable - Contract ' || contract_record.contract_number,
            contract_record.contract_amount,
            0
        );
    END IF;
    
    -- Create credit entry (Revenue)
    IF revenue_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            revenue_account_id,
            sales_cost_center_id,
            2,
            'Revenue Recognition - Contract ' || contract_record.contract_number,
            0,
            contract_record.contract_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- Update the contract validation trigger to only check accounts on relevant changes
DROP TRIGGER IF EXISTS validate_contract_account_trigger ON public.contracts;

CREATE OR REPLACE FUNCTION public.validate_contract_account_improved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Skip validation if no account_id is being set
    IF NEW.account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- For UPDATE operations: Skip validation if only status is changing
    IF TG_OP = 'UPDATE' AND OLD.account_id IS NOT NULL THEN
        -- Allow status-only updates
        IF OLD.account_id = NEW.account_id AND 
           OLD.status != NEW.status AND
           OLD.contract_number = NEW.contract_number AND
           OLD.customer_id = NEW.customer_id AND
           COALESCE(OLD.vehicle_id::text, '') = COALESCE(NEW.vehicle_id::text, '') AND
           OLD.contract_amount = NEW.contract_amount AND
           OLD.monthly_amount = NEW.monthly_amount THEN
            RETURN NEW;
        END IF;
    END IF;
    
    -- Validate account for INSERT and significant UPDATE operations
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 3 أو أعلى)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create the improved trigger
CREATE TRIGGER validate_contract_account_trigger
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_contract_account_improved();

-- Improve the contract operations logging trigger
DROP TRIGGER IF EXISTS log_contract_operations_trigger ON public.contracts;

CREATE OR REPLACE FUNCTION public.log_contract_operations_improved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    operation_type text;
    operation_details jsonb := '{}'::jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        operation_type := 'created';
        operation_details := jsonb_build_object(
            'contract_number', NEW.contract_number,
            'contract_type', NEW.contract_type,
            'status', NEW.status,
            'amount', NEW.contract_amount,
            'monthly_amount', NEW.monthly_amount
        );
        
        -- Log the creation
        INSERT INTO public.contract_operations_log (
            contract_id,
            company_id,
            operation_type,
            operation_details,
            performed_by,
            new_values
        ) VALUES (
            NEW.id,
            NEW.company_id,
            operation_type,
            operation_details,
            NEW.created_by,
            to_jsonb(NEW)
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine operation type based on changes
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'active' THEN operation_type := 'activated';
                WHEN 'suspended' THEN operation_type := 'suspended';
                WHEN 'cancelled' THEN operation_type := 'cancelled';
                WHEN 'renewed' THEN operation_type := 'renewed';
                ELSE operation_type := 'status_changed';
            END CASE;
            
            operation_details := jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'contract_number', NEW.contract_number
            );
        ELSE
            operation_type := 'updated';
            operation_details := jsonb_build_object(
                'contract_number', NEW.contract_number,
                'update_type', 'data_modification'
            );
        END IF;
        
        -- Log the update
        INSERT INTO public.contract_operations_log (
            contract_id,
            company_id,
            operation_type,
            operation_details,
            performed_by,
            old_values,
            new_values
        ) VALUES (
            NEW.id,
            NEW.company_id,
            operation_type,
            operation_details,
            COALESCE(auth.uid(), NEW.created_by),
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the improved trigger
CREATE TRIGGER log_contract_operations_trigger
    AFTER INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_contract_operations_improved();

-- Update the create_contract_with_journal_entry function to use the new journal creation function
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb := '{"success": false}'::jsonb;
    contract_id uuid;
    journal_entry_id uuid;
    contract_number text;
    validation_result jsonb;
    customer_eligible boolean := true;
    vehicle_available boolean := true;
    company_id_value uuid;
    created_by_value uuid;
BEGIN
    -- Get company and user info
    company_id_value := get_user_company_secure_cached(auth.uid());
    created_by_value := auth.uid();
    
    -- Validate input data
    IF contract_data IS NULL OR contract_data = '{}'::jsonb THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No contract data provided',
            'error_code', 'INVALID_INPUT'
        );
    END IF;
    
    -- Validate contract data using existing function
    validation_result := public.validate_contract_data(
        contract_data || jsonb_build_object('company_id', company_id_value)
    );
    
    IF NOT (validation_result->>'valid')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'errors', validation_result->'errors',
            'error_code', 'VALIDATION_FAILED'
        );
    END IF;
    
    -- Generate contract number if not provided
    IF contract_data->>'contract_number' IS NULL OR contract_data->>'contract_number' = '' THEN
        SELECT 'CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.contracts 
            WHERE company_id = company_id_value 
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 6, '0') INTO contract_number;
    ELSE
        contract_number := contract_data->>'contract_number';
    END IF;
    
    -- Create the contract
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
        company_id_value,
        (contract_data->>'customer_id')::uuid,
        CASE 
            WHEN contract_data->>'vehicle_id' IN ('', 'none', 'null') THEN NULL
            ELSE (contract_data->>'vehicle_id')::uuid
        END,
        contract_number,
        COALESCE(contract_data->>'contract_type', 'rental'),
        COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        COALESCE((contract_data->>'monthly_amount')::numeric, (contract_data->>'contract_amount')::numeric),
        contract_data->>'description',
        contract_data->>'terms',
        'draft',
        created_by_value,
        (contract_data->>'cost_center_id')::uuid
    ) RETURNING id INTO contract_id;
    
    -- Create journal entry using the new function
    BEGIN
        journal_entry_id := public.create_contract_journal_entry(contract_id);
        
        -- Update contract with journal entry ID
        UPDATE public.contracts 
        SET journal_entry_id = journal_entry_id 
        WHERE id = contract_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the journal entry creation failure but don't fail the contract creation
            INSERT INTO public.contract_creation_log (
                company_id,
                contract_id,
                operation_step,
                status,
                error_message
            ) VALUES (
                company_id_value,
                contract_id,
                'journal_entry_creation',
                'failed',
                'Failed to create journal entry: ' || SQLERRM
            );
            
            journal_entry_id := NULL;
    END;
    
    -- Update vehicle status if vehicle is assigned
    IF contract_data->>'vehicle_id' IS NOT NULL 
       AND contract_data->>'vehicle_id' NOT IN ('', 'none', 'null') THEN
        UPDATE public.vehicles 
        SET status = 'rented'
        WHERE id = (contract_data->>'vehicle_id')::uuid;
    END IF;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'contract_number', contract_number,
        'journal_entry_id', journal_entry_id,
        'warnings', CASE 
            WHEN journal_entry_id IS NULL THEN jsonb_build_array('Journal entry creation failed - manual intervention required')
            ELSE jsonb_build_array()
        END
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        INSERT INTO public.contract_creation_log (
            company_id,
            contract_id,
            operation_step,
            status,
            error_message
        ) VALUES (
            COALESCE(company_id_value, '00000000-0000-0000-0000-000000000000'::uuid),
            contract_id,
            'contract_creation',
            'failed',
            'Contract creation failed: ' || SQLERRM
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to create contract: ' || SQLERRM,
            'error_code', 'CREATION_FAILED',
            'contract_id', contract_id
        );
END;
$function$;