-- Create ultra-fast contract creation function that merges all operations
CREATE OR REPLACE FUNCTION create_contract_with_journal_entry_ultra_fast(
    p_company_id uuid,
    p_customer_id uuid,
    p_vehicle_id uuid DEFAULT NULL,
    p_contract_type text DEFAULT 'rental',
    p_start_date date,
    p_end_date date,
    p_contract_amount numeric DEFAULT 0,
    p_monthly_amount numeric DEFAULT 0,
    p_description text DEFAULT NULL,
    p_terms text DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_contract_id uuid;
    v_contract_number text;
    v_journal_entry_id uuid;
    v_journal_entry_number text;
    v_receivables_account_id uuid;
    v_revenue_account_id uuid;
    v_start_time timestamp := clock_timestamp();
    v_execution_time_ms numeric;
    v_warnings text[] := ARRAY[]::text[];
    v_requires_manual_entry boolean := false;
    v_account_creation_result jsonb;
BEGIN
    -- Input validation (minimal for speed)
    IF p_company_id IS NULL OR p_customer_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Company ID and Customer ID are required'
        );
    END IF;

    -- Generate contract number
    v_contract_number := 'CNT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::text, 10, '0');
    v_contract_id := gen_random_uuid();

    -- Create contract record immediately
    INSERT INTO contracts (
        id,
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_type,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        description,
        terms,
        cost_center_id,
        status,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_contract_id,
        p_company_id,
        p_customer_id,
        p_vehicle_id,
        v_contract_number,
        p_contract_type,
        p_start_date,
        p_end_date,
        p_contract_amount,
        p_monthly_amount,
        p_description,
        p_terms,
        p_cost_center_id,
        'draft',
        p_created_by,
        now(),
        now()
    );

    -- Only create journal entry if amount > 0
    IF p_contract_amount > 0 THEN
        -- Quick account lookup (use existing or default accounts)
        SELECT id INTO v_receivables_account_id
        FROM chart_of_accounts 
        WHERE company_id = p_company_id 
        AND account_type = 'assets'
        AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
        AND is_active = true
        LIMIT 1;

        SELECT id INTO v_revenue_account_id
        FROM chart_of_accounts 
        WHERE company_id = p_company_id 
        AND account_type = 'revenue'
        AND is_active = true
        LIMIT 1;

        -- Create minimal journal entry if accounts exist
        IF v_receivables_account_id IS NOT NULL AND v_revenue_account_id IS NOT NULL THEN
            v_journal_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::text, 10, '0');
            v_journal_entry_id := gen_random_uuid();

            -- Insert journal entry
            INSERT INTO journal_entries (
                id,
                company_id,
                journal_entry_number,
                entry_date,
                description,
                total_amount,
                status,
                created_by
            ) VALUES (
                v_journal_entry_id,
                p_company_id,
                v_journal_entry_number,
                p_start_date,
                'Journal entry for contract: ' || v_contract_number,
                p_contract_amount,
                'posted',
                p_created_by
            );

            -- Insert journal entry lines (batch insert)
            INSERT INTO journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                description,
                debit_amount,
                credit_amount
            ) VALUES 
            (
                gen_random_uuid(),
                v_journal_entry_id,
                v_receivables_account_id,
                'Contract receivable: ' || v_contract_number,
                p_contract_amount,
                0
            ),
            (
                gen_random_uuid(),
                v_journal_entry_id,
                v_revenue_account_id,
                'Contract revenue: ' || v_contract_number,
                0,
                p_contract_amount
            );

            -- Update contract status to active and link journal entry
            UPDATE contracts 
            SET status = 'active', 
                journal_entry_id = v_journal_entry_id,
                updated_at = now()
            WHERE id = v_contract_id;
        ELSE
            v_warnings := array_append(v_warnings, 'Journal entry not created - missing chart of accounts setup');
            v_requires_manual_entry := true;
        END IF;
    END IF;

    -- Calculate execution time
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

    -- Return success response immediately
    RETURN jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number,
        'journal_entry_id', v_journal_entry_id,
        'journal_entry_number', v_journal_entry_number,
        'warnings', v_warnings,
        'requires_manual_entry', v_requires_manual_entry,
        'execution_time_ms', v_execution_time_ms,
        'message', 'Contract created successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Return error but don't fail completely
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
        );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_contract_with_journal_entry_ultra_fast TO authenticated;