-- Create Contract with Transaction
-- This stored procedure ensures atomicity when creating a contract
-- It handles contract creation, vehicle status update, and activity logging in a single transaction

CREATE OR REPLACE FUNCTION create_contract_with_transaction(
  p_company_id UUID,
  p_customer_id UUID,
  p_vehicle_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_rental_type TEXT,
  p_rental_duration INTEGER,
  p_total_amount DECIMAL,
  p_security_deposit DECIMAL DEFAULT 0,
  p_created_by UUID DEFAULT NULL,
  p_additional_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract_id UUID;
  v_contract_number TEXT;
  v_result JSONB;
BEGIN
  -- Start transaction (implicit in function)
  
  -- 1. Generate contract number
  SELECT generate_contract_number(p_company_id) INTO v_contract_number;
  
  -- 2. Validate vehicle availability
  IF EXISTS (
    SELECT 1 FROM contracts
    WHERE vehicle_id = p_vehicle_id
    AND company_id = p_company_id
    AND status IN ('active', 'pending_payment')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Vehicle is already rented or reserved';
  END IF;
  
  -- 3. Validate customer exists
  IF NOT EXISTS (
    SELECT 1 FROM customers
    WHERE id = p_customer_id
    AND company_id = p_company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Customer not found or inactive';
  END IF;
  
  -- 4. Validate vehicle exists
  IF NOT EXISTS (
    SELECT 1 FROM vehicles
    WHERE id = p_vehicle_id
    AND company_id = p_company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Vehicle not found or inactive';
  END IF;
  
  -- 5. Create contract
  INSERT INTO contracts (
    company_id,
    contract_number,
    customer_id,
    vehicle_id,
    start_date,
    end_date,
    rental_type,
    rental_duration,
    total_amount,
    amount_paid,
    amount_remaining,
    security_deposit,
    security_deposit_paid,
    status,
    is_active,
    created_by
  ) VALUES (
    p_company_id,
    v_contract_number,
    p_customer_id,
    p_vehicle_id,
    p_start_date,
    p_end_date,
    p_rental_type,
    p_rental_duration,
    p_total_amount,
    0, -- amount_paid starts at 0
    p_total_amount, -- amount_remaining equals total initially
    p_security_deposit,
    0, -- security_deposit_paid starts at 0
    'draft', -- initial status
    true,
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_contract_id;
  
  -- 6. Update vehicle status to reserved
  UPDATE vehicles
  SET status = 'reserved',
      updated_at = NOW()
  WHERE id = p_vehicle_id
  AND company_id = p_company_id;
  
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
    'contract',
    v_contract_id,
    jsonb_build_object(
      'contract_number', v_contract_number,
      'customer_id', p_customer_id,
      'vehicle_id', p_vehicle_id,
      'total_amount', p_total_amount
    )
  );
  
  -- 8. Return result
  SELECT jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number,
    'message', 'Contract created successfully'
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL functions
    RAISE EXCEPTION 'Failed to create contract: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_contract_with_transaction TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_contract_with_transaction IS 
'Creates a contract with all related operations in a single atomic transaction. Ensures data consistency.';
