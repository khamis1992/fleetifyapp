-- Step 1: Remove ALL duplicate/conflicting triggers that handle contract activation
DROP TRIGGER IF EXISTS trigger_contract_changes ON contracts;
DROP TRIGGER IF EXISTS trigger_handle_contract_status_change ON contracts;
DROP TRIGGER IF EXISTS handle_contract_activation_trigger ON contracts;

-- Step 2: Modify create_contract_journal_entry to NOT update contracts table
-- (the calling code should handle setting journal_entry_id)
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result uuid;
    v_contract_record RECORD;
    v_journal_entry_id uuid;
    v_receivable_account_id uuid;
    v_revenue_account_id uuid;
    v_sales_cost_center_id uuid;
    v_journal_entry_number text;
BEGIN
    -- Get contract details
    SELECT * INTO v_contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE WARNING 'Contract not found: %', contract_id_param;
        RETURN NULL;
    END IF;
    
    -- Skip if contract amount is 0 or negative
    IF v_contract_record.contract_amount <= 0 THEN
        RAISE WARNING 'Contract amount is 0 or negative, skipping journal entry creation for contract: %', contract_id_param;
        RETURN NULL;
    END IF;
    
    -- Get required accounts and cost center
    SELECT id INTO v_sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = v_contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Get account mappings
    BEGIN
        v_receivable_account_id := public.get_mapped_account_enhanced(v_contract_record.company_id, 'RECEIVABLES');
        v_revenue_account_id := public.get_mapped_account_enhanced(v_contract_record.company_id, 'RENTAL_REVENUE');
        
        -- Fallback to sales revenue if rental revenue not found
        IF v_revenue_account_id IS NULL THEN
            v_revenue_account_id := public.get_mapped_account_enhanced(v_contract_record.company_id, 'SALES_REVENUE');
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to get account mappings for company %: %', v_contract_record.company_id, SQLERRM;
            RETURN NULL;
    END;
    
    -- Only create journal entry if we have both required accounts
    IF v_receivable_account_id IS NULL OR v_revenue_account_id IS NULL THEN
        RAISE WARNING 'Missing account mappings for company %, skipping journal entry creation', v_contract_record.company_id;
        RETURN NULL;
    END IF;
    
    -- Generate journal entry number
    v_journal_entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = v_contract_record.company_id 
        AND DATE(entry_date) = CURRENT_DATE
    )::TEXT, 4, '0');
    
    -- Create journal entry
    BEGIN
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
            v_contract_record.company_id,
            v_journal_entry_number,
            CURRENT_DATE,
            'Contract Revenue - ' || v_contract_record.contract_number,
            'contract',
            contract_id_param,
            v_contract_record.contract_amount,
            v_contract_record.contract_amount,
            'posted',
            COALESCE(v_contract_record.created_by, auth.uid())
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
            'Accounts Receivable - ' || v_contract_record.contract_number,
            v_contract_record.contract_amount,
            0
        ),
        (
            gen_random_uuid(),
            v_journal_entry_id,
            v_revenue_account_id,
            v_sales_cost_center_id,
            2,
            'Contract Revenue - ' || v_contract_record.contract_number,
            0,
            v_contract_record.contract_amount
        );
        
        -- REMOVED: Do NOT update contracts table from here
        -- The calling BEFORE trigger will set NEW.journal_entry_id
        
        RETURN v_journal_entry_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create journal entry for contract %: %', contract_id_param, SQLERRM;
            RETURN NULL;
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in create_contract_journal_entry for contract %: %', contract_id_param, SQLERRM;
        RETURN NULL;
END;
$function$;

-- Step 3: Create ONE SINGLE unified BEFORE trigger for contract status changes
CREATE OR REPLACE FUNCTION public.handle_contract_status_change_unified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_entry_result uuid;
BEGIN
    -- Only process when status changes to active
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') AND NEW.journal_entry_id IS NULL THEN
        -- Try to create journal entry
        BEGIN
            journal_entry_result := public.create_contract_journal_entry(NEW.id);
            
            -- Set the journal_entry_id on NEW record (this is a BEFORE trigger)
            IF journal_entry_result IS NOT NULL THEN
                NEW.journal_entry_id := journal_entry_result;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but continue with the update
                RAISE WARNING 'Failed to create journal entry for contract %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create the unified trigger
CREATE TRIGGER trigger_handle_contract_status_change_unified
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION handle_contract_status_change_unified();;
