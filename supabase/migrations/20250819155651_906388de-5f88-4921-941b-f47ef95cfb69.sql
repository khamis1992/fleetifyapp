-- Fix account hierarchy by properly connecting Cash accounts to Assets
UPDATE public.chart_of_accounts 
SET parent_account_id = (
  SELECT id FROM public.chart_of_accounts 
  WHERE account_code = '1000' AND company_id = chart_of_accounts.company_id
)
WHERE account_code IN ('1102', '1103') 
AND parent_account_id IS NULL;

-- Enhanced cascade delete function that properly handles all foreign key constraints
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
  account_id_param UUID,
  force_delete BOOLEAN DEFAULT FALSE,
  transfer_to_account_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  account_record RECORD;
  child_accounts_count INTEGER := 0;
  linked_tables TEXT[] := ARRAY[]::TEXT[];
  table_counts JSONB := '{}'::JSONB;
  contracts_count INTEGER := 0;
  journal_entries_count INTEGER := 0;
  payments_count INTEGER := 0;
  invoices_count INTEGER := 0;
  customers_count INTEGER := 0;
  vehicles_count INTEGER := 0;
  result JSONB;
BEGIN
  -- Get account details
  SELECT * INTO account_record
  FROM public.chart_of_accounts
  WHERE id = account_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account not found or inactive'
    );
  END IF;

  -- Count child accounts
  SELECT COUNT(*) INTO child_accounts_count
  FROM public.chart_of_accounts
  WHERE parent_account_id = account_id_param AND is_active = true;

  -- Check for contracts using this account
  SELECT COUNT(*) INTO contracts_count
  FROM public.contracts
  WHERE account_id = account_id_param;
  
  IF contracts_count > 0 THEN
    linked_tables := array_append(linked_tables, 'contracts');
    table_counts := table_counts || jsonb_build_object('contracts', contracts_count);
  END IF;

  -- Check for journal entries
  SELECT COUNT(*) INTO journal_entries_count
  FROM public.journal_entry_lines
  WHERE account_id = account_id_param;
  
  IF journal_entries_count > 0 THEN
    linked_tables := array_append(linked_tables, 'journal_entry_lines');
    table_counts := table_counts || jsonb_build_object('journal_entry_lines', journal_entries_count);
  END IF;

  -- Check for payments
  SELECT COUNT(*) INTO payments_count
  FROM public.payments
  WHERE account_id = account_id_param;
  
  IF payments_count > 0 THEN
    linked_tables := array_append(linked_tables, 'payments');
    table_counts := table_counts || jsonb_build_object('payments', payments_count);
  END IF;

  -- Check for invoices
  SELECT COUNT(*) INTO invoices_count
  FROM public.invoices
  WHERE account_id = account_id_param;
  
  IF invoices_count > 0 THEN
    linked_tables := array_append(linked_tables, 'invoices');
    table_counts := table_counts || jsonb_build_object('invoices', invoices_count);
  END IF;

  -- Check for customers
  SELECT COUNT(*) INTO customers_count
  FROM public.customers
  WHERE account_id = account_id_param;
  
  IF customers_count > 0 THEN
    linked_tables := array_append(linked_tables, 'customers');
    table_counts := table_counts || jsonb_build_object('customers', customers_count);
  END IF;

  -- Check for vehicles
  SELECT COUNT(*) INTO vehicles_count
  FROM public.vehicles
  WHERE account_id = account_id_param;
  
  IF vehicles_count > 0 THEN
    linked_tables := array_append(linked_tables, 'vehicles');
    table_counts := table_counts || jsonb_build_object('vehicles', vehicles_count);
  END IF;

  -- If this is just analysis (no force_delete and no transfer), return preview
  IF NOT force_delete AND transfer_to_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'can_delete', (array_length(linked_tables, 1) IS NULL OR array_length(linked_tables, 1) = 0) AND child_accounts_count = 0,
      'linked_tables', linked_tables,
      'table_counts', table_counts,
      'account_info', jsonb_build_object(
        'code', account_record.account_code,
        'name', account_record.account_name,
        'is_system', account_record.is_system
      ),
      'child_accounts_count', child_accounts_count,
      'message', CASE 
        WHEN child_accounts_count > 0 THEN 'Account has ' || child_accounts_count || ' child accounts'
        WHEN array_length(linked_tables, 1) > 0 THEN 'Account has data in: ' || array_to_string(linked_tables, ', ')
        ELSE 'Account can be safely deleted'
      END
    );
  END IF;

  -- Handle data transfer if specified
  IF transfer_to_account_id IS NOT NULL THEN
    -- Validate transfer target exists and is in same company
    IF NOT EXISTS (
      SELECT 1 FROM public.chart_of_accounts 
      WHERE id = transfer_to_account_id 
      AND company_id = account_record.company_id 
      AND is_active = true
      AND id != account_id_param
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid transfer target account'
      );
    END IF;

    -- Transfer contracts
    UPDATE public.contracts 
    SET account_id = transfer_to_account_id 
    WHERE account_id = account_id_param;

    -- Transfer journal entries
    UPDATE public.journal_entry_lines 
    SET account_id = transfer_to_account_id 
    WHERE account_id = account_id_param;

    -- Transfer payments
    UPDATE public.payments 
    SET account_id = transfer_to_account_id 
    WHERE account_id = account_id_param;

    -- Transfer invoices
    UPDATE public.invoices 
    SET account_id = transfer_to_account_id 
    WHERE account_id = account_id_param;

    -- Transfer customers
    UPDATE public.customers 
    SET account_id = transfer_to_account_id 
    WHERE account_id = account_id_param;

    -- Transfer vehicles
    UPDATE public.vehicles 
    SET account_id = transfer_to_account_id 
    WHERE account_id = account_id_param;

    -- Transfer child accounts to new parent
    UPDATE public.chart_of_accounts 
    SET parent_account_id = transfer_to_account_id 
    WHERE parent_account_id = account_id_param;

    -- Now delete the account
    UPDATE public.chart_of_accounts 
    SET is_active = false, updated_at = now() 
    WHERE id = account_id_param;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'transferred',
      'deleted_account', jsonb_build_object(
        'code', account_record.account_code,
        'name', account_record.account_name
      ),
      'transfer_to_account_id', transfer_to_account_id,
      'child_accounts_deleted', child_accounts_count
    );
  END IF;

  -- Handle force delete
  IF force_delete THEN
    -- Delete/deactivate child accounts first
    UPDATE public.chart_of_accounts 
    SET is_active = false, updated_at = now() 
    WHERE parent_account_id = account_id_param;

    -- Delete contracts
    DELETE FROM public.contracts WHERE account_id = account_id_param;
    
    -- Delete journal entries
    DELETE FROM public.journal_entry_lines WHERE account_id = account_id_param;
    
    -- Delete payments  
    DELETE FROM public.payments WHERE account_id = account_id_param;
    
    -- Delete invoices
    DELETE FROM public.invoices WHERE account_id = account_id_param;
    
    -- Update customers to remove account reference
    UPDATE public.customers SET account_id = NULL WHERE account_id = account_id_param;
    
    -- Update vehicles to remove account reference
    UPDATE public.vehicles SET account_id = NULL WHERE account_id = account_id_param;

    -- Finally delete the account
    UPDATE public.chart_of_accounts 
    SET is_active = false, updated_at = now() 
    WHERE id = account_id_param;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'deleted',
      'deleted_account', jsonb_build_object(
        'code', account_record.account_code,
        'name', account_record.account_name
      ),
      'child_accounts_deleted', child_accounts_count
    );
  END IF;

  -- Default case - just deactivate if no constraints
  IF array_length(linked_tables, 1) IS NULL AND child_accounts_count = 0 THEN
    UPDATE public.chart_of_accounts 
    SET is_active = false, updated_at = now() 
    WHERE id = account_id_param;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'deactivated',
      'deleted_account', jsonb_build_object(
        'code', account_record.account_code,
        'name', account_record.account_name
      )
    );
  END IF;

  -- Cannot delete due to constraints
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Account cannot be deleted due to existing relationships. Use force delete or transfer data first.',
    'linked_tables', linked_tables,
    'child_accounts_count', child_accounts_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;