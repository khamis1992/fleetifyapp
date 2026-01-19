-- Create a database function to create customer and contract atomically
-- This bypasses RLS issues by running in the security definer context

CREATE OR REPLACE FUNCTION create_customer_with_contract(
  p_company_id uuid,
  p_first_name text,
  p_last_name text,
  p_monthly_amount numeric
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  v_customer_id uuid;
  v_contract_number text;
  v_start_date date;
  v_end_date date;
  result json;
BEGIN
  -- Generate unique contract number
  v_contract_number := 'CNT-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);
  
  -- Set contract dates
  v_start_date := current_date;
  v_end_date := current_date + interval '1 year';
  
  -- Insert customer and get the ID
  INSERT INTO customers (
    company_id,
    first_name,
    last_name,
    customer_type,
    phone,
    is_active
  ) VALUES (
    p_company_id,
    p_first_name,
    p_last_name,
    'individual',
    '000000000',
    true
  ) RETURNING id INTO v_customer_id;
  
  -- Insert contract
  INSERT INTO contracts (
    customer_id,
    company_id,
    contract_number,
    contract_date,
    start_date,
    end_date,
    contract_type,
    monthly_amount,
    status
  ) VALUES (
    v_customer_id,
    p_company_id,
    v_contract_number,
    v_start_date,
    v_start_date,
    v_end_date,
    'vehicle_rental',
    p_monthly_amount,
    'active'
  );
  
  -- Return result
  result := json_build_object(
    'customer_id', v_customer_id,
    'contract_number', v_contract_number,
    'success', true,
    'message', 'Customer and contract created successfully'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_customer_with_contract TO authenticated;

-- Example usage:
-- SELECT create_customer_with_contract(
--   'your-company-id'::uuid,
--   'John',
--   'Doe',
--   1500.00
-- );