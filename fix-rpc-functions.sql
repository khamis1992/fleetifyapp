-- Fix RPC functions to use monthly_amount instead of monthly_payment

-- Drop existing functions first (they may have different return types)
DROP FUNCTION IF EXISTS get_customer_outstanding_balance(uuid, uuid);
DROP FUNCTION IF EXISTS get_customer_unpaid_months(uuid, uuid);
DROP FUNCTION IF EXISTS get_all_customers_outstanding_balance(uuid);

-- 1. Create get_customer_outstanding_balance function
CREATE FUNCTION get_customer_outstanding_balance(
  customer_id_param uuid,
  company_id_param uuid
) RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  monthly_rent numeric,
  total_paid numeric,
  total_expected numeric,
  outstanding_balance numeric,
  months_behind integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id as customer_id,
    (cu.first_name || ' ' || cu.last_name) as customer_name,
    COALESCE(c.monthly_amount, 0) as monthly_rent,
    COALESCE(SUM(p.amount), 0) as total_paid,
    (COALESCE(c.monthly_amount, 0) * 
      GREATEST(1, EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1)
    ) as total_expected,
    (
      (COALESCE(c.monthly_amount, 0) * 
        GREATEST(1, EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1)
      ) - COALESCE(SUM(p.amount), 0)
    ) as outstanding_balance,
    GREATEST(0, 
      (EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1) - 
      COUNT(DISTINCT p.payment_month)::integer
    ) as months_behind
  FROM customers cu
  INNER JOIN contracts c ON cu.id = c.customer_id
  LEFT JOIN payments p ON cu.id = p.customer_id AND p.payment_type = 'rental'
  WHERE cu.id = customer_id_param
    AND cu.company_id = company_id_param
    AND c.status = 'active'
  GROUP BY cu.id, cu.first_name, cu.last_name, c.monthly_amount, c.start_date;
END;
$$;

-- 2. Create get_customer_unpaid_months function
CREATE FUNCTION get_customer_unpaid_months(
  customer_id_param uuid,
  company_id_param uuid
) RETURNS TABLE (
  month_key text,
  month_name text,
  expected_amount numeric,
  paid_amount numeric,
  balance numeric,
  is_paid boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contract_start_date date;
  monthly_rent numeric;
  current_month date;
  months_count integer;
BEGIN
  -- Get contract details
  SELECT c.start_date, c.monthly_amount
  INTO contract_start_date, monthly_rent
  FROM contracts c
  WHERE c.customer_id = customer_id_param
    AND c.company_id = company_id_param
    AND c.status = 'active'
  LIMIT 1;

  IF contract_start_date IS NULL THEN
    RETURN;
  END IF;

  -- Calculate months from contract start to now
  months_count := EXTRACT(MONTH FROM AGE(CURRENT_DATE, contract_start_date))::integer + 1;
  
  -- Generate months and check payment status
  FOR i IN 0..(months_count - 1) LOOP
    current_month := contract_start_date + (i || ' months')::interval;
    
    RETURN QUERY
    SELECT 
      TO_CHAR(current_month, 'YYYY-MM') as month_key,
      TO_CHAR(current_month, 'Month YYYY') as month_name,
      monthly_rent as expected_amount,
      COALESCE(
        (SELECT SUM(amount) 
         FROM payments 
         WHERE customer_id = customer_id_param 
           AND TO_CHAR(payment_month, 'YYYY-MM') = TO_CHAR(current_month, 'YYYY-MM')
           AND payment_type = 'rental'
        ), 0
      ) as paid_amount,
      monthly_rent - COALESCE(
        (SELECT SUM(amount) 
         FROM payments 
         WHERE customer_id = customer_id_param 
           AND TO_CHAR(payment_month, 'YYYY-MM') = TO_CHAR(current_month, 'YYYY-MM')
           AND payment_type = 'rental'
        ), 0
      ) as balance,
      EXISTS (
        SELECT 1 
        FROM payments 
        WHERE customer_id = customer_id_param 
          AND TO_CHAR(payment_month, 'YYYY-MM') = TO_CHAR(current_month, 'YYYY-MM')
          AND payment_type = 'rental'
          AND amount >= monthly_rent
      ) as is_paid;
  END LOOP;
END;
$$;

-- 3. Create get_all_customers_outstanding_balance function
CREATE FUNCTION get_all_customers_outstanding_balance(
  company_id_param uuid
) RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  monthly_rent numeric,
  total_paid numeric,
  outstanding_balance numeric,
  months_behind integer,
  last_payment_date date
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id as customer_id,
    (cu.first_name || ' ' || cu.last_name) as customer_name,
    COALESCE(c.monthly_amount, 0) as monthly_rent,
    COALESCE(SUM(p.amount), 0) as total_paid,
    (
      (COALESCE(c.monthly_amount, 0) * 
        GREATEST(1, EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1)
      ) - COALESCE(SUM(p.amount), 0)
    ) as outstanding_balance,
    GREATEST(0, 
      (EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1) - 
      COUNT(DISTINCT p.payment_month)::integer
    ) as months_behind,
    MAX(p.payment_date) as last_payment_date
  FROM customers cu
  INNER JOIN contracts c ON cu.id = c.customer_id
  LEFT JOIN payments p ON cu.id = p.customer_id AND p.payment_type = 'rental'
  WHERE cu.company_id = company_id_param
    AND c.status = 'active'
    AND cu.is_active = true
  GROUP BY cu.id, cu.first_name, cu.last_name, c.monthly_amount, c.start_date
  HAVING (
    (COALESCE(c.monthly_amount, 0) * 
      GREATEST(1, EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1)
    ) - COALESCE(SUM(p.amount), 0)
  ) > 0
  ORDER BY outstanding_balance DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_customer_outstanding_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_unpaid_months TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_customers_outstanding_balance TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated all RPC functions to use monthly_amount instead of monthly_payment';
END
$$;
