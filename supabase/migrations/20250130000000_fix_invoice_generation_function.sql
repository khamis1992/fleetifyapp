-- ================================================================
-- FIX INVOICE GENERATION FUNCTION
-- ================================================================
-- This migration fixes the generate_invoice_for_contract_month function
-- to use due_date instead of the non-existent invoice_month column
-- ================================================================

-- Drop and recreate the function with the fix
CREATE OR REPLACE FUNCTION generate_invoice_for_contract_month(
  p_contract_id UUID,
  p_invoice_month DATE -- First day of the month (e.g., 2024-01-01)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_total_amount DECIMAL(15,3);
  v_invoice_date DATE;
  v_due_date DATE;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id;
  END IF;

  -- Check if contract is active in this month
  IF v_contract.start_date > p_invoice_month OR 
     (v_contract.end_date IS NOT NULL AND v_contract.end_date < p_invoice_month) THEN
    RAISE NOTICE 'Contract % is not active in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;

  -- Check if invoice already exists for this month
  -- Check if there's already an invoice for this contract in the same month/year
  -- Use due_date to determine the month (since invoice_month column doesn't exist)
  -- Also check invoice_date as fallback in case due_date is NULL
  IF EXISTS (
    SELECT 1 FROM invoices
    WHERE contract_id = p_contract_id
      AND (
        (due_date IS NOT NULL AND DATE_TRUNC('month', due_date)::DATE = p_invoice_month)
        OR (due_date IS NULL AND invoice_date IS NOT NULL AND DATE_TRUNC('month', invoice_date)::DATE = p_invoice_month)
      )
      AND status != 'cancelled'
  ) THEN
    RAISE NOTICE 'Invoice already exists for contract % in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;

  -- Set invoice date and due date to the 1st of the month
  v_invoice_date := p_invoice_month;
  v_due_date := p_invoice_month;

  -- Calculate total amount (monthly rental amount)
  v_total_amount := COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0);

  -- Generate invoice number
  SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD((COUNT(*) + 1)::TEXT, 5, '0')
  INTO v_invoice_number
  FROM invoices
  WHERE company_id = v_contract.company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());

  -- Create invoice
  INSERT INTO invoices (
    company_id,
    customer_id,
    contract_id,
    invoice_number,
    invoice_date,
    due_date,
    total_amount,
    subtotal,
    tax_amount,
    discount_amount,
    paid_amount,
    balance_due,
    status,
    payment_status,
    invoice_type,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_contract.company_id,
    v_contract.customer_id,
    v_contract.id,
    v_invoice_number,
    v_invoice_date,
    v_due_date,
    v_total_amount,
    v_total_amount,
    0,
    0,
    0,
    v_total_amount,
    'sent',
    'unpaid',
    'service',
    'فاتورة إيجار شهرية - ' || TO_CHAR(p_invoice_month, 'YYYY-MM') || ' - عقد #' || v_contract.contract_number,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_invoice_id;

  RAISE NOTICE '✅ Created invoice % for contract % - Month: %', v_invoice_number, v_contract.contract_number, p_invoice_month;
  
  RETURN v_invoice_id;
END;
$$;

