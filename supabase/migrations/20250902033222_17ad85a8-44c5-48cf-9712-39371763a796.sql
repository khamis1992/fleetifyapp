-- Enhanced unified function for fast contract creation with all optimizations
-- This function combines all contract creation steps into one optimized database call

CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry_enhanced(
    p_company_id uuid,
    p_customer_id uuid,
    p_vehicle_id uuid DEFAULT NULL,
    p_contract_type text DEFAULT 'rental',
    p_start_date date,
    p_end_date date,
    p_contract_amount numeric,
    p_monthly_amount numeric DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_terms text DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract_id uuid;
    v_contract_number text;
    v_journal_entry_id uuid;
    v_journal_entry_number text;
    v_receivables_account_id uuid;
    v_revenue_account_id uuid;
    v_warnings text[] := ARRAY[]::text[];
    v_customer_exists boolean := false;
    v_vehicle_available boolean := true;
    v_cost_center_id uuid;
    v_start_time timestamp := clock_timestamp();
    v_accounts_check_time numeric;
    v_contract_create_time numeric;
    v_journal_create_time numeric;
BEGIN
    -- Performance tracking
    RAISE NOTICE '[ENHANCED_CONTRACT] Starting enhanced contract creation for company % customer %', p_company_id, p_customer_id;
    
    -- Fast validation checks (parallel where possible)
    -- Check customer existence and get default cost center in one query
    SELECT EXISTS(
        SELECT 1 FROM customers 
        WHERE id = p_customer_id 
        AND company_id = p_company_id 
        AND is_active = true
        AND COALESCE(is_blacklisted, false) = false
    ), 
    COALESCE(c.default_cost_center_id, p_cost_center_id)
    INTO v_customer_exists, v_cost_center_id
    FROM customers c 
    WHERE c.id = p_customer_id AND c.company_id = p_company_id;
    
    IF NOT v_customer_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'العميل غير موجود أو غير نشط أو محظور',
            'error_code', 'CUSTOMER_NOT_FOUND'
        );
    END IF;
    
    -- Quick vehicle availability check if vehicle specified
    IF p_vehicle_id IS NOT NULL THEN
        SELECT NOT EXISTS(
            SELECT 1 FROM contracts 
            WHERE vehicle_id = p_vehicle_id 
            AND status = 'active'
            AND (
                (p_start_date BETWEEN start_date AND end_date) OR
                (p_end_date BETWEEN start_date AND end_date) OR
                (start_date BETWEEN p_start_date AND p_end_date)
            )
        ) INTO v_vehicle_available;
        
        IF NOT v_vehicle_available THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'المركبة غير متاحة في الفترة المحددة',
                'error_code', 'VEHICLE_NOT_AVAILABLE'
            );
        END IF;
    END IF;
    
    -- Get account mappings quickly using optimized query with fallbacks
    WITH account_mappings_fast AS (
        SELECT 
            dat.type_code,
            am.chart_of_accounts_id
        FROM default_account_types dat
        LEFT JOIN account_mappings am ON (
            dat.id = am.default_account_type_id 
            AND am.company_id = p_company_id 
            AND am.is_active = true
        )
        WHERE dat.type_code IN ('RECEIVABLES', 'RENTAL_REVENUE', 'REVENUE')
    ),
    account_fallbacks AS (
        SELECT 
            'RECEIVABLES' as type_code,
            id as chart_of_accounts_id
        FROM chart_of_accounts 
        WHERE company_id = p_company_id 
        AND account_type = 'assets' 
        AND is_active = true 
        AND is_header = false
        ORDER BY created_at ASC
        LIMIT 1
        
        UNION ALL
        
        SELECT 
            'REVENUE' as type_code,
            id as chart_of_accounts_id
        FROM chart_of_accounts 
        WHERE company_id = p_company_id 
        AND account_type = 'revenue' 
        AND is_active = true 
        AND is_header = false
        ORDER BY created_at ASC
        LIMIT 1
    )
    SELECT 
        COALESCE(
            (SELECT chart_of_accounts_id FROM account_mappings_fast WHERE type_code = 'RECEIVABLES'),
            (SELECT chart_of_accounts_id FROM account_fallbacks WHERE type_code = 'RECEIVABLES')
        ),
        COALESCE(
            (SELECT chart_of_accounts_id FROM account_mappings_fast WHERE type_code IN ('RENTAL_REVENUE', 'REVENUE')),
            (SELECT chart_of_accounts_id FROM account_fallbacks WHERE type_code = 'REVENUE')
        )
    INTO v_receivables_account_id, v_revenue_account_id;
    
    v_accounts_check_time := extract(epoch from (clock_timestamp() - v_start_time));
    RAISE NOTICE '[ENHANCED_CONTRACT] Account lookup completed in % seconds', v_accounts_check_time;
    
    -- Generate contract number efficiently
    SELECT 'CON-' || to_char(CURRENT_DATE, 'YY') || '-' || 
           LPAD((COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 8) AS INTEGER)), 0) + 1)::text, 3, '0')
    INTO v_contract_number
    FROM contracts 
    WHERE company_id = p_company_id 
    AND contract_number LIKE 'CON-' || to_char(CURRENT_DATE, 'YY') || '-%';
    
    -- Create contract with all data in single insert
    INSERT INTO contracts (
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
        cost_center_id,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_company_id,
        p_customer_id,
        p_vehicle_id,
        v_contract_number,
        p_contract_type,
        CURRENT_DATE,
        p_start_date,
        p_end_date,
        p_contract_amount,
        COALESCE(p_monthly_amount, p_contract_amount),
        p_description,
        p_terms,
        'active',
        p_created_by,
        v_cost_center_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO v_contract_id;
    
    v_contract_create_time := extract(epoch from (clock_timestamp() - v_start_time)) - v_accounts_check_time;
    RAISE NOTICE '[ENHANCED_CONTRACT] Contract created in % seconds', v_contract_create_time;
    
    -- Create journal entry only if contract amount > 0 and accounts are available
    IF p_contract_amount > 0 AND v_receivables_account_id IS NOT NULL AND v_revenue_account_id IS NOT NULL THEN
        -- Generate journal entry number efficiently
        SELECT 'JE-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD((COUNT(*) + 1)::text, 4, '0')
        INTO v_journal_entry_number
        FROM journal_entries 
        WHERE company_id = p_company_id 
        AND entry_date = CURRENT_DATE;
        
        -- Create journal entry and lines in single transaction
        INSERT INTO journal_entries (
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
            created_by,
            created_at
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
            p_created_by,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_journal_entry_id;
        
        -- Insert journal entry lines efficiently
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES 
        (
            v_journal_entry_id,
            v_receivables_account_id,
            v_cost_center_id,
            1,
            'Accounts Receivable - ' || v_contract_number,
            p_contract_amount,
            0
        ),
        (
            v_journal_entry_id,
            v_revenue_account_id,
            v_cost_center_id,
            2,
            'Contract Revenue - ' || v_contract_number,
            0,
            p_contract_amount
        );
        
        -- Update contract with journal entry reference
        UPDATE contracts 
        SET journal_entry_id = v_journal_entry_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_contract_id;
        
        v_journal_create_time := extract(epoch from (clock_timestamp() - v_start_time)) - v_accounts_check_time - v_contract_create_time;
        RAISE NOTICE '[ENHANCED_CONTRACT] Journal entry created in % seconds', v_journal_create_time;
    ELSE
        -- Add warnings for skipped journal entry
        IF p_contract_amount <= 0 THEN
            v_warnings := array_append(v_warnings, 'لا يتطلب قيد محاسبي - مبلغ العقد صفر');
        END IF;
        IF v_receivables_account_id IS NULL THEN
            v_warnings := array_append(v_warnings, 'حساب الذمم المدينة غير مربوط');
        END IF;
        IF v_revenue_account_id IS NULL THEN
            v_warnings := array_append(v_warnings, 'حساب الإيرادات غير مربوط');
        END IF;
    END IF;
    
    -- Log performance metrics
    INSERT INTO ai_activity_logs (
        company_id,
        user_id,
        activity_type,
        details,
        created_at
    ) VALUES (
        p_company_id,
        p_created_by,
        'contract_creation_performance',
        jsonb_build_object(
            'contract_id', v_contract_id,
            'total_time_seconds', extract(epoch from (clock_timestamp() - v_start_time)),
            'accounts_check_time', v_accounts_check_time,
            'contract_create_time', v_contract_create_time,
            'journal_create_time', COALESCE(v_journal_create_time, 0),
            'has_journal_entry', v_journal_entry_id IS NOT NULL
        ),
        CURRENT_TIMESTAMP
    );
    
    RAISE NOTICE '[ENHANCED_CONTRACT] Total execution time: % seconds', extract(epoch from (clock_timestamp() - v_start_time));
    
    -- Return comprehensive result
    RETURN jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number,
        'journal_entry_id', v_journal_entry_id,
        'journal_entry_number', v_journal_entry_number,
        'warnings', v_warnings,
        'requires_manual_entry', false,
        'execution_time_seconds', extract(epoch from (clock_timestamp() - v_start_time)),
        'performance_breakdown', jsonb_build_object(
            'accounts_check', v_accounts_check_time,
            'contract_creation', v_contract_create_time,
            'journal_creation', COALESCE(v_journal_create_time, 0)
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ENHANCED_CONTRACT] Error: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'execution_time_seconds', extract(epoch from (clock_timestamp() - v_start_time))
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_contract_with_journal_entry_enhanced TO authenticated;

-- Create optimized indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_company_date_performance ON contracts(company_id, contract_date, contract_number) 
WHERE contract_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_company_active_blacklist ON customers(company_id, is_active, is_blacklisted) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_account_mappings_company_active ON account_mappings(company_id, default_account_type_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, entry_date);