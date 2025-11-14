-- Create Payment with Transaction
-- This stored procedure ensures atomicity when creating a payment
-- It updates the contract amounts and status automatically

CREATE OR REPLACE FUNCTION create_payment_with_transaction(
  p_company_id UUID,
  p_contract_id UUID,
  p_customer_id UUID,
  p_amount DECIMAL,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_payment_type TEXT DEFAULT 'rental', -- 'rental', 'security_deposit', 'penalty', 'refund'
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_payment_number TEXT;
  v_contract contracts%ROWTYPE;
  v_new_amount_paid DECIMAL;
  v_new_amount_remaining DECIMAL;
  v_new_deposit_paid DECIMAL;
  v_new_status TEXT;
  v_result JSONB;
BEGIN
  -- Start transaction (implicit in function)
  
  -- 1. Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  
  -- 2. Get and lock contract for update
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id
  AND company_id = p_company_id
  AND is_active = true
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found or inactive';
  END IF;
  
  -- 3. Validate customer matches contract
  IF v_contract.customer_id != p_customer_id THEN
    RAISE EXCEPTION 'Customer does not match contract';
  END IF;
  
  -- 4. Generate payment number
  SELECT generate_payment_number(p_company_id) INTO v_payment_number;
  
  -- 5. Calculate new amounts based on payment type
  IF p_payment_type = 'security_deposit' THEN
    v_new_deposit_paid := v_contract.security_deposit_paid + p_amount;
    
    IF v_new_deposit_paid > v_contract.security_deposit THEN
      RAISE EXCEPTION 'Security deposit payment exceeds required amount';
    END IF;
    
    v_new_amount_paid := v_contract.amount_paid;
    v_new_amount_remaining := v_contract.amount_remaining;
  ELSE
    v_new_amount_paid := v_contract.amount_paid + p_amount;
    v_new_amount_remaining := v_contract.amount_remaining - p_amount;
    v_new_deposit_paid := v_contract.security_deposit_paid;
    
    IF v_new_amount_remaining < 0 THEN
      RAISE EXCEPTION 'Payment amount exceeds remaining balance';
    END IF;
  END IF;
  
  -- 6. Determine new contract status
  v_new_status := v_contract.status;
  
  IF p_payment_type = 'security_deposit' AND v_new_deposit_paid >= v_contract.security_deposit THEN
    -- Security deposit fully paid
    IF v_contract.status = 'draft' THEN
      v_new_status := 'pending_payment';
    END IF;
  ELSIF p_payment_type = 'rental' THEN
    IF v_new_amount_remaining = 0 THEN
      -- Fully paid
      IF v_contract.status IN ('draft', 'pending_payment') THEN
        v_new_status := 'active';
      END IF;
    ELSIF v_new_amount_paid > 0 AND v_contract.status = 'draft' THEN
      -- Partially paid
      v_new_status := 'pending_payment';
    END IF;
  END IF;
  
  -- 7. Create payment record
  INSERT INTO payments (
    company_id,
    payment_number,
    contract_id,
    customer_id,
    amount,
    payment_date,
    payment_method,
    payment_type,
    reference,
    notes,
    status,
    is_active,
    created_by
  ) VALUES (
    p_company_id,
    v_payment_number,
    p_contract_id,
    p_customer_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_payment_type,
    p_reference,
    p_notes,
    'completed',
    true,
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_payment_id;
  
  -- 8. Update contract
  UPDATE contracts
  SET 
    amount_paid = v_new_amount_paid,
    amount_remaining = v_new_amount_remaining,
    security_deposit_paid = v_new_deposit_paid,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_contract_id
  AND company_id = p_company_id;
  
  -- 9. Update vehicle status if contract becomes active
  IF v_new_status = 'active' AND v_contract.status != 'active' THEN
    UPDATE vehicles
    SET status = 'rented',
        updated_at = NOW()
    WHERE id = v_contract.vehicle_id
    AND company_id = p_company_id;
  END IF;
  
  -- 10. Log activity
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
    'payment',
    v_payment_id,
    jsonb_build_object(
      'payment_number', v_payment_number,
      'contract_id', p_contract_id,
      'amount', p_amount,
      'payment_type', p_payment_type,
      'old_status', v_contract.status,
      'new_status', v_new_status
    )
  );
  
  -- 11. Return result
  SELECT jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'payment_number', v_payment_number,
    'contract_status', v_new_status,
    'amount_paid', v_new_amount_paid,
    'amount_remaining', v_new_amount_remaining,
    'security_deposit_paid', v_new_deposit_paid,
    'message', 'Payment created successfully'
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL functions
    RAISE EXCEPTION 'Failed to create payment: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_payment_with_transaction TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_payment_with_transaction IS 
'Creates a payment and updates the contract amounts and status in a single atomic transaction.';
