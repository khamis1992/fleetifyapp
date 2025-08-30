-- Remove conflicting triggers that cause timing issues
DROP TRIGGER IF EXISTS set_contract_default_status ON public.contracts;
DROP TRIGGER IF EXISTS trigger_contract_activation ON public.contracts;
DROP TRIGGER IF EXISTS contract_auto_journal_trigger ON public.contracts;

-- Keep only the main contract changes trigger but fix its timing and logic
DROP TRIGGER IF EXISTS handle_contract_changes ON public.contracts;

-- Create a new, properly timed trigger for contract operations
CREATE OR REPLACE FUNCTION public.handle_contract_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    journal_entry_id UUID;
BEGIN
    -- Only handle contract activation and journal entry creation for specific status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'active' THEN
        -- Create journal entry after contract is activated
        BEGIN
            SELECT public.create_contract_journal_entry(NEW.id) INTO journal_entry_id;
            
            -- Update contract with journal entry reference if successful
            IF journal_entry_id IS NOT NULL THEN
                UPDATE public.contracts 
                SET journal_entry_id = journal_entry_id 
                WHERE id = NEW.id;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the contract creation
            RAISE WARNING 'Failed to create journal entry for contract %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create the new trigger that runs AFTER the contract is committed
CREATE TRIGGER handle_contract_lifecycle_trigger
    AFTER INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_contract_lifecycle();

-- Update the create_contract_journal_entry function to handle errors gracefully
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
    entry_number text;
BEGIN
    -- Verify contract exists and is active
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param
    AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active contract with ID % not found', contract_id_param;
    END IF;
    
    -- Get required accounts and cost center
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Get mapped accounts
    receivable_account_id := public.get_mapped_account_id(contract_record.company_id, 'RECEIVABLES');
    revenue_account_id := public.get_mapped_account_id(contract_record.company_id, 'SALES_REVENUE');
    
    -- Fallback to rental revenue if sales revenue not found
    IF revenue_account_id IS NULL THEN
        revenue_account_id := public.get_mapped_account_id(contract_record.company_id, 'RENTAL_REVENUE');
    END IF;
    
    -- Ensure we have required accounts
    IF receivable_account_id IS NULL OR revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'Required accounts not found for contract journal entry. Receivable: %, Revenue: %', 
            receivable_account_id, revenue_account_id;
    END IF;
    
    -- Generate entry number
    entry_number := public.generate_journal_entry_number(contract_record.company_id);
    
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
        entry_number,
        contract_record.start_date,
        'Contract Activation - ' || contract_record.contract_number,
        'contract',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'posted',
        contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
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
        journal_entry_id,
        receivable_account_id,
        sales_cost_center_id,
        1,
        'Contract Receivable - ' || contract_record.contract_number,
        contract_record.contract_amount,
        0
    ),
    (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        sales_cost_center_id,
        2,
        'Contract Revenue - ' || contract_record.contract_number,
        0,
        contract_record.contract_amount
    );
    
    RAISE LOG 'Created journal entry % for contract %', journal_entry_id, contract_id_param;
    
    RETURN journal_entry_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating journal entry for contract %: %', contract_id_param, SQLERRM;
    RAISE;
END;
$function$;