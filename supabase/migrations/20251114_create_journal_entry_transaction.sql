-- Create Journal Entry with Transaction
-- This stored procedure ensures atomicity when creating a journal entry with its lines
-- It validates that debits equal credits before committing

CREATE OR REPLACE FUNCTION create_journal_entry_with_transaction(
  p_company_id UUID,
  p_entry_number TEXT,
  p_entry_date DATE,
  p_description TEXT,
  p_lines JSONB, -- Array of journal entry lines
  p_reference TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
  v_line JSONB;
  v_total_debit DECIMAL := 0;
  v_total_credit DECIMAL := 0;
  v_result JSONB;
  v_line_count INTEGER := 0;
BEGIN
  -- Start transaction (implicit in function)
  
  -- 1. Validate entry_number uniqueness
  IF EXISTS (
    SELECT 1 FROM journal_entries
    WHERE entry_number = p_entry_number
    AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Journal entry number % already exists', p_entry_number;
  END IF;
  
  -- 2. Validate lines array
  IF p_lines IS NULL OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'Journal entry must have at least 2 lines';
  END IF;
  
  -- 3. Calculate totals and validate
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::DECIMAL, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::DECIMAL, 0);
    v_line_count := v_line_count + 1;
    
    -- Validate account exists
    IF NOT EXISTS (
      SELECT 1 FROM accounts
      WHERE id = (v_line->>'account_id')::UUID
      AND company_id = p_company_id
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Account % not found or inactive', v_line->>'account_id';
    END IF;
  END LOOP;
  
  -- 4. Validate debits equal credits
  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Debits (%) must equal credits (%)', v_total_debit, v_total_credit;
  END IF;
  
  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Journal entry total cannot be zero';
  END IF;
  
  -- 5. Create journal entry
  INSERT INTO journal_entries (
    company_id,
    entry_number,
    entry_date,
    description,
    reference,
    total_debit,
    total_credit,
    status,
    is_active,
    created_by
  ) VALUES (
    p_company_id,
    p_entry_number,
    p_entry_date,
    p_description,
    p_reference,
    v_total_debit,
    v_total_credit,
    'draft',
    true,
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_entry_id;
  
  -- 6. Create journal entry lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO journal_entry_lines (
      company_id,
      journal_entry_id,
      account_id,
      description,
      debit,
      credit
    ) VALUES (
      p_company_id,
      v_entry_id,
      (v_line->>'account_id')::UUID,
      COALESCE(v_line->>'description', p_description),
      COALESCE((v_line->>'debit')::DECIMAL, 0),
      COALESCE((v_line->>'credit')::DECIMAL, 0)
    );
  END LOOP;
  
  -- 7. Log activity
  INSERT INTO activity_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_company_id,
    COALESCE(p_created_by, auth.uid()),
    'create',
    'journal_entry',
    v_entry_id,
    jsonb_build_object(
      'entry_number', p_entry_number,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit,
      'line_count', v_line_count
    )
  );
  
  -- 8. Return result
  SELECT jsonb_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'entry_number', p_entry_number,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'line_count', v_line_count,
    'message', 'Journal entry created successfully'
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL functions
    RAISE EXCEPTION 'Failed to create journal entry: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_journal_entry_with_transaction TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_journal_entry_with_transaction IS 
'Creates a journal entry with all its lines in a single atomic transaction. Validates that debits equal credits.';
