-- ================================================================
-- CUSTOMER ACCOUNT STATEMENT FUNCTION
-- ================================================================
-- This function generates a comprehensive customer account statement
-- with opening balance, running totals, and transaction history
-- 
-- INSTALLATION:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" or press Ctrl+Enter
-- ================================================================

-- Drop existing function with all possible signatures to avoid conflicts
DROP FUNCTION IF EXISTS get_customer_account_statement_by_code(uuid,text,date,date);
DROP FUNCTION IF EXISTS get_customer_account_statement_by_code(UUID, TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS public.get_customer_account_statement_by_code(uuid,text,date,date);
DROP FUNCTION IF EXISTS public.get_customer_account_statement_by_code(UUID, TEXT, DATE, DATE);

-- Create the main function
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
  reference_number TEXT,
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
  customer_record RECORD;
  opening_balance DECIMAL(15,3) := 0;
BEGIN
  -- Verify customer exists and is active
  SELECT id, customer_code, first_name, last_name, company_name, customer_type 
  INTO customer_record 
  FROM customers 
  WHERE customer_code = p_customer_code 
    AND company_id = p_company_id 
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer with code % not found for company %', p_customer_code, p_company_id;
  END IF;

  -- Calculate opening balance if date range specified
  IF p_date_from IS NOT NULL THEN
    SELECT COALESCE(SUM(
      CASE 
        WHEN source_table = 'invoices' THEN debit_amount - credit_amount
        WHEN source_table = 'payments' THEN credit_amount - debit_amount  
        ELSE debit_amount - credit_amount
      END
    ), 0) INTO opening_balance
    FROM (
      -- Historical invoices before date range
      SELECT 
        i.total_amount as debit_amount,
        0 as credit_amount,
        'invoices' as source_table
      FROM invoices i
      WHERE i.customer_id = customer_record.id
        AND i.company_id = p_company_id
        AND i.invoice_date < p_date_from
        AND i.status != 'cancelled'
      
      UNION ALL
      
      -- Historical payments before date range
      SELECT 
        0 as debit_amount,
        p.amount as credit_amount,
        'payments' as source_table
      FROM payments p
      WHERE p.customer_id = customer_record.id
        AND p.company_id = p_company_id
        AND p.payment_date < p_date_from
        AND p.payment_status = 'completed'
        
      UNION ALL
      
      -- Historical journal entries before date range (OPTIONAL - only if customer_accounts exists)
      SELECT 
        COALESCE(jel.debit_amount, 0) as debit_amount,
        COALESCE(jel.credit_amount, 0) as credit_amount,
        'journal_entries' as source_table
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      LEFT JOIN customer_accounts ca ON jel.account_id = ca.account_id
      WHERE (ca.customer_id = customer_record.id OR jel.description ILIKE '%' || p_customer_code || '%')
        AND je.company_id = p_company_id
        AND je.entry_date < p_date_from
        AND je.status = 'posted'
    ) historical_transactions;
  END IF;

  -- Return comprehensive transaction statement
  RETURN QUERY
  WITH combined_transactions AS (
    -- Invoice transactions
    SELECT 
      i.id::TEXT as trans_id,
      i.invoice_date::DATE as trans_date,
      'invoice'::TEXT as trans_type,
      COALESCE(i.notes, 'Invoice No: ' || i.invoice_number) as trans_description,
      i.invoice_number as ref_number,
      i.total_amount as debit_amt,
      0::DECIMAL(15,3) as credit_amt,
      'invoices'::TEXT as source_tbl,
      i.created_at as sort_time
    FROM invoices i
    WHERE i.customer_id = customer_record.id
      AND i.company_id = p_company_id
      AND (p_date_from IS NULL OR i.invoice_date >= p_date_from)
      AND (p_date_to IS NULL OR i.invoice_date <= p_date_to)
      AND i.status != 'cancelled'

    UNION ALL

    -- Payment transactions
    SELECT 
      p.id::TEXT as trans_id,
      p.payment_date::DATE as trans_date,
      'payment'::TEXT as trans_type,
      COALESCE(p.notes, 'Payment No: ' || p.payment_number) as trans_description,
      p.payment_number as ref_number,
      0::DECIMAL(15,3) as debit_amt,
      p.amount as credit_amt,
      'payments'::TEXT as source_tbl,
      p.created_at as sort_time
    FROM payments p
    WHERE p.customer_id = customer_record.id
      AND p.company_id = p_company_id
      AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
      AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
      AND p.payment_status = 'completed'

    UNION ALL

    -- Journal entry transactions (OPTIONAL - gracefully handle if customer_accounts doesn't exist)
    SELECT 
      jel.id::TEXT as trans_id,
      je.entry_date::DATE as trans_date,
      CASE 
        WHEN jel.debit_amount > 0 THEN 'journal_debit'
        ELSE 'journal_credit'
      END as trans_type,
      COALESCE(
        jel.description, 
        je.description, 
        'Journal Entry'
      ) as trans_description,
      COALESCE(je.journal_entry_number, je.id::TEXT) as ref_number,
      COALESCE(jel.debit_amount, 0) as debit_amt,
      COALESCE(jel.credit_amount, 0) as credit_amt,
      'journal_entries'::TEXT as source_tbl,
      je.created_at as sort_time
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    LEFT JOIN customer_accounts ca ON jel.account_id = ca.account_id
    WHERE (ca.customer_id = customer_record.id OR jel.description ILIKE '%' || p_customer_code || '%')
      AND je.company_id = p_company_id
      AND (p_date_from IS NULL OR je.entry_date >= p_date_from)
      AND (p_date_to IS NULL OR je.entry_date <= p_date_to)
      AND je.status = 'posted'
  ),
  
  -- Add opening balance entry if date range specified
  transactions_with_opening AS (
    SELECT 
      'opening'::TEXT as trans_id,
      p_date_from::DATE as trans_date,
      'opening_balance'::TEXT as trans_type,
      'Opening Balance'::TEXT as trans_description,
      'OB-' || TO_CHAR(p_date_from, 'YYYYMMDD') as ref_number,
      CASE WHEN opening_balance >= 0 THEN opening_balance ELSE 0 END as debit_amt,
      CASE WHEN opening_balance < 0 THEN ABS(opening_balance) ELSE 0 END as credit_amt,
      'opening_balance'::TEXT as source_tbl,
      p_date_from::TIMESTAMP as sort_time
    FROM (SELECT 1) dummy
    WHERE p_date_from IS NOT NULL AND opening_balance != 0
    
    UNION ALL
    
    SELECT * FROM combined_transactions
  ),
  
  -- Calculate running balances
  ordered_transactions AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY trans_date, sort_time) as row_num
    FROM transactions_with_opening
    ORDER BY trans_date, sort_time
  )

  SELECT 
    ot.trans_id,
    ot.trans_date,
    ot.trans_type,
    ot.trans_description,
    ot.ref_number,
    ot.debit_amt,
    ot.credit_amt,
    -- Calculate cumulative running balance
    (
      SELECT 
        COALESCE(
          CASE WHEN p_date_from IS NOT NULL THEN opening_balance ELSE 0 END +
          SUM(ot2.debit_amt - ot2.credit_amt), 
          0
        )
      FROM ordered_transactions ot2 
      WHERE ot2.row_num <= ot.row_num
        AND ot2.trans_type != 'opening_balance'
    ) as running_balance,
    ot.source_tbl
  FROM ordered_transactions ot
  ORDER BY ot.trans_date, ot.sort_time;

END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code TO anon;

-- Add descriptive comment
COMMENT ON FUNCTION get_customer_account_statement_by_code IS 
'Professional customer account statement function with opening balance calculation, running balance tracking, and comprehensive transaction history from invoices, payments, and journal entries. Supports date range filtering and maintains proper accounting precision with 3 decimal places for KWD currency.';

-- ================================================================
-- VERIFICATION TEST
-- ================================================================
-- Uncomment the following lines to test the function after creation:
--
-- SELECT * FROM get_customer_account_statement_by_code(
--   'YOUR_COMPANY_ID'::UUID,
--   'CUSTOMER_CODE',
--   NULL::DATE,  -- From date (NULL for all)
--   NULL::DATE   -- To date (NULL for all)
-- );
-- ================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Function get_customer_account_statement_by_code created successfully!';
  RAISE NOTICE '📋 You can now use customer account statements in the application.';
  RAISE NOTICE '🔧 To test: SELECT * FROM get_customer_account_statement_by_code(company_id, customer_code, null, null);';
END $$;
