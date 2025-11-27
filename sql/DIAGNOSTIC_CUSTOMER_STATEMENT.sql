-- ================================================================
-- DIAGNOSTIC SCRIPT - Customer Account Statement
-- ================================================================
-- Run this in Supabase SQL Editor to diagnose issues
-- Copy all output and share if you need help
-- ================================================================

-- 1. Check if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_customer_account_statement_by_code'
  ) THEN
    RAISE NOTICE '✅ Function EXISTS in database';
  ELSE
    RAISE NOTICE '❌ Function DOES NOT EXIST - You need to install it!';
    RAISE NOTICE '📝 Use: CREATE_SIMPLE_CUSTOMER_STATEMENT.sql or CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql';
  END IF;
END $$;

-- 2. Check function permissions
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Permissions GRANTED'
    ELSE '❌ Permissions NOT SET'
  END as permission_status,
  STRING_AGG(grantee || ' can ' || privilege_type, ', ') as details
FROM information_schema.routine_privileges 
WHERE routine_name = 'get_customer_account_statement_by_code';

-- 3. Check if customers have customer_code
SELECT 
  COUNT(*) as total_customers,
  COUNT(customer_code) as with_code,
  COUNT(*) - COUNT(customer_code) as missing_code,
  CASE 
    WHEN COUNT(customer_code) = 0 THEN '❌ NO CUSTOMERS have customer_code!'
    WHEN COUNT(*) - COUNT(customer_code) > 0 THEN '⚠️ Some customers missing customer_code'
    ELSE '✅ All customers have customer_code'
  END as status
FROM customers
WHERE is_active = true;

-- 4. Sample customers with codes (for testing)
SELECT 
  '📋 Sample Customer Codes (use these for testing):' as info,
  customer_code,
  COALESCE(company_name, first_name || ' ' || last_name) as name,
  company_id,
  id as customer_id
FROM customers 
WHERE customer_code IS NOT NULL 
  AND is_active = true
LIMIT 5;

-- 5. Check if invoices table has required columns
SELECT 
  '📊 Invoices Table Structure:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name IN ('customer_id', 'total_amount', 'invoice_date', 'status', 'invoice_number')
ORDER BY ordinal_position;

-- 6. Check if payments table has required columns
SELECT 
  '💰 Payments Table Structure:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name IN ('customer_id', 'amount', 'payment_date', 'payment_status', 'payment_number')
ORDER BY ordinal_position;

-- 7. Test function with sample data (if function exists)
DO $$
DECLARE
  test_company_id UUID;
  test_customer_code TEXT;
  record_count INT;
BEGIN
  -- Get a test customer
  SELECT company_id, customer_code 
  INTO test_company_id, test_customer_code
  FROM customers 
  WHERE customer_code IS NOT NULL 
    AND is_active = true 
  LIMIT 1;
  
  IF test_customer_code IS NOT NULL THEN
    -- Try to call the function
    BEGIN
      SELECT COUNT(*) INTO record_count
      FROM get_customer_account_statement_by_code(
        test_company_id,
        test_customer_code,
        NULL::DATE,
        NULL::DATE
      );
      
      RAISE NOTICE '✅ Function TEST SUCCESSFUL - Returned % rows', record_count;
      RAISE NOTICE '📝 Test customer code: %', test_customer_code;
      
      IF record_count = 0 THEN
        RAISE NOTICE '⚠️ Customer has no transactions (this is OK if they are new)';
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Function TEST FAILED';
      RAISE NOTICE 'Error: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '⚠️ Cannot test - no customers with customer_code found';
  END IF;
END $$;

-- 8. Summary and recommendations
DO $$
DECLARE
  func_exists BOOLEAN;
  customers_with_codes INT;
BEGIN
  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_customer_account_statement_by_code'
  ) INTO func_exists;
  
  -- Check customer codes
  SELECT COUNT(customer_code) 
  INTO customers_with_codes
  FROM customers 
  WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 DIAGNOSTIC SUMMARY';
  RAISE NOTICE '========================================';
  
  IF NOT func_exists THEN
    RAISE NOTICE '❌ PROBLEM: Function not installed';
    RAISE NOTICE '✅ SOLUTION: Run CREATE_SIMPLE_CUSTOMER_STATEMENT.sql in Supabase Dashboard';
    RAISE NOTICE '';
  ELSIF customers_with_codes = 0 THEN
    RAISE NOTICE '❌ PROBLEM: No customers have customer_code';
    RAISE NOTICE '✅ SOLUTION: Run this to generate codes:';
    RAISE NOTICE '   UPDATE customers SET customer_code = ''C'' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, ''0'') WHERE customer_code IS NULL;';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ Everything looks good!';
    RAISE NOTICE '📝 If still not working, check:';
    RAISE NOTICE '   1. Clear browser cache (Ctrl+Shift+Delete)';
    RAISE NOTICE '   2. Hard refresh page (Ctrl+F5)';
    RAISE NOTICE '   3. Check browser console for errors (F12)';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- 9. Show actual test data (if available)
SELECT 
  '🧪 ACTUAL TEST QUERY RESULT:' as info,
  transaction_date,
  transaction_type,
  description,
  debit_amount,
  credit_amount,
  running_balance
FROM get_customer_account_statement_by_code(
  (SELECT company_id FROM customers WHERE customer_code IS NOT NULL LIMIT 1),
  (SELECT customer_code FROM customers WHERE customer_code IS NOT NULL LIMIT 1),
  NULL::DATE,
  NULL::DATE
)
LIMIT 10;
