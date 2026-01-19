-- ================================================================
-- CUSTOMER ACCOUNT STATEMENT FUNCTION
-- ================================================================
-- Creates function to get customer account statement by customer code
-- ================================================================

-- Drop existing versions
DROP FUNCTION IF EXISTS get_customer_account_statement_by_code(uuid,text,date,date);
DROP FUNCTION IF EXISTS public.get_customer_account_statement_by_code(uuid,text,date,date);

-- Create function
CREATE OR REPLACE FUNCTION get_customer_account_statement_by_code(
  p_company_id UUID,
  p_customer_code TEXT,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
  transaction_id TEXT,
  transaction_date DATE,
  transaction_type TEXT,
  description TEXT,
  reference_number VARCHAR(50),
  debit_amount DECIMAL(15,3),
  credit_amount DECIMAL(15,3),
  running_balance DECIMAL(15,3),
  source_table TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_running_balance DECIMAL(15,3) := 0;
BEGIN
  -- Find customer by code
  SELECT id INTO v_customer_id
  FROM customers 
  WHERE customer_code = p_customer_code 
    AND company_id = p_company_id 
    AND is_active = true;

  -- If customer not found, return empty result
  IF v_customer_id IS NULL THEN
    RAISE NOTICE 'Customer with code % not found', p_customer_code;
    RETURN;
  END IF;

  -- Return simple transaction statement (invoices + payments only)
  RETURN QUERY
  WITH all_transactions AS (
    -- Invoices (debit)
    SELECT 
      i.id::TEXT as trans_id,
      i.invoice_date::DATE as trans_date,
      'invoice'::TEXT as trans_type,
      COALESCE(i.notes, 'فاتورة رقم ' || i.invoice_number) as trans_desc,
      i.invoice_number as ref_num,
      i.total_amount as debit_amt,
      0::DECIMAL(15,3) as credit_amt,
      'invoices'::TEXT as source,
      i.invoice_date::TIMESTAMP as sort_time
    FROM invoices i
    WHERE i.customer_id = v_customer_id
      AND i.company_id = p_company_id
      AND (p_date_from IS NULL OR i.invoice_date >= p_date_from)
      AND (p_date_to IS NULL OR i.invoice_date <= p_date_to)
      AND COALESCE(i.status, 'active') != 'cancelled'

    UNION ALL

    -- Payments (credit)
    SELECT 
      p.id::TEXT as trans_id,
      p.payment_date::DATE as trans_date,
      'payment'::TEXT as trans_type,
      COALESCE(p.notes, 'دفعة رقم ' || p.payment_number) as trans_desc,
      p.payment_number as ref_num,
      0::DECIMAL(15,3) as debit_amt,
      p.amount as credit_amt,
      'payments'::TEXT as source,
      p.payment_date::TIMESTAMP as sort_time
    FROM payments p
    WHERE p.customer_id = v_customer_id
      AND p.company_id = p_company_id
      AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
      AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
      AND p.payment_status IN ('completed', 'paid', 'approved')
  ),
  
  ordered AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY trans_date, sort_time) as row_num
    FROM all_transactions
  )
  
  SELECT 
    o.trans_id,
    o.trans_date,
    o.trans_type,
    o.trans_desc,
    o.ref_num,
    o.debit_amt,
    o.credit_amt,
    -- Simple running balance calculation
    (
      SELECT SUM(o2.debit_amt - o2.credit_amt)
      FROM ordered o2
      WHERE o2.row_num <= o.row_num
    ) as running_balance,
    o.source
  FROM ordered o
  ORDER BY o.trans_date, o.sort_time;

END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code(uuid, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code(uuid, text, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code(uuid, text, date, date) TO anon;

-- Add comment
COMMENT ON FUNCTION get_customer_account_statement_by_code IS 'Returns customer account statement showing invoices and payments with running balance';

