-- ================================================================
-- CREATE LEGAL CASE FROM RECEIPT
-- ================================================================
-- Automatically creates a legal case for an overdue payment receipt
-- Created: 2025-01-27
-- ================================================================

CREATE OR REPLACE FUNCTION create_legal_case_from_receipt(p_receipt_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_customer RECORD;
  v_contract RECORD;
  v_case_id UUID;
  v_case_number TEXT;
  v_case_count INTEGER;
BEGIN
  -- Get receipt details
  SELECT * INTO v_receipt FROM rental_payment_receipts WHERE id = p_receipt_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt not found: %', p_receipt_id;
  END IF;
  
  -- Get customer details
  SELECT * INTO v_customer FROM customers WHERE id = v_receipt.customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found for receipt: %', p_receipt_id;
  END IF;
  
  -- Get contract details if available
  IF v_receipt.contract_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM contracts WHERE id = v_receipt.contract_id;
  END IF;
  
  -- Check if case already exists for this receipt
  IF EXISTS (
    SELECT 1 FROM legal_cases
    WHERE customer_id = v_receipt.customer_id
      AND company_id = v_receipt.company_id
      AND case_status = 'open'
      AND metadata->>'source_receipt_id' = p_receipt_id::TEXT
  ) THEN
    -- Return existing case ID
    SELECT id INTO v_case_id
    FROM legal_cases
    WHERE customer_id = v_receipt.customer_id
      AND company_id = v_receipt.company_id
      AND case_status = 'open'
      AND metadata->>'source_receipt_id' = p_receipt_id::TEXT
    LIMIT 1;
    
    RETURN v_case_id;
  END IF;
  
  -- Generate case number
  SELECT COUNT(*) + 1 INTO v_case_count
  FROM legal_cases
  WHERE company_id = v_receipt.company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  v_case_number := 'LC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_case_count::TEXT, 4, '0');
  
  -- Create legal case
  INSERT INTO legal_cases (
    company_id,
    customer_id,
    case_number,
    case_title,
    case_type,
    case_status,
    priority,
    claim_amount,
    currency,
    description,
    metadata,
    filed_date,
    created_at,
    updated_at
  ) VALUES (
    v_receipt.company_id,
    v_receipt.customer_id,
    v_case_number,
    'قضية تحصيل دين - ' || v_receipt.customer_name || ' - ' || v_receipt.month,
    'rental',
    'open',
    'high',
    COALESCE(v_receipt.pending_balance, v_receipt.amount_due, v_receipt.rent_amount),
    'QAR',
    'قضية تحصيل دين تلقائية نتيجة عدم سداد إيصال الإيجار الشهري. المبلغ المستحق: ' || 
    COALESCE(v_receipt.amount_due::TEXT, v_receipt.rent_amount::TEXT) || ' ريال (إيجار: ' || 
    v_receipt.rent_amount::TEXT || ' + غرامة: ' || COALESCE(v_receipt.fine::TEXT, '0') || ')',
    jsonb_build_object(
      'source_receipt_id', v_receipt.id,
      'receipt_month', v_receipt.month,
      'contract_id', v_receipt.contract_id,
      'vehicle_id', v_receipt.vehicle_id,
      'days_overdue', GREATEST(0, CURRENT_DATE - v_receipt.payment_date),
      'rent_amount', v_receipt.rent_amount,
      'fine_amount', COALESCE(v_receipt.fine, 0),
      'total_due', COALESCE(v_receipt.amount_due, v_receipt.rent_amount),
      'pending_balance', COALESCE(v_receipt.pending_balance, v_receipt.amount_due, v_receipt.rent_amount),
      'auto_created', true
    ),
    CURRENT_DATE,
    NOW(),
    NOW()
  ) RETURNING id INTO v_case_id;
  
  RETURN v_case_id;
END;
$$;

-- Add comments
COMMENT ON FUNCTION create_legal_case_from_receipt IS 
'Creates a legal case for an overdue payment receipt. Automatically generates case number and includes all receipt details in metadata.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_legal_case_from_receipt TO authenticated;
GRANT EXECUTE ON FUNCTION create_legal_case_from_receipt TO service_role;;
