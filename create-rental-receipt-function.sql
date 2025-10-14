-- Create a SECURITY DEFINER function to create rental receipts (bypasses RLS)
-- This function runs with the privileges of the function owner, not the caller

DROP FUNCTION IF EXISTS create_rental_payment_receipt(uuid, text, text, date, numeric, numeric, numeric, uuid, uuid);

CREATE OR REPLACE FUNCTION create_rental_payment_receipt(
  p_customer_id uuid,
  p_customer_name text,
  p_month text,
  p_payment_date date,
  p_rent_amount numeric,
  p_fine numeric,
  p_total_paid numeric,
  p_company_id uuid,
  p_created_by uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with owner's privileges
SET search_path = public -- Security: explicitly set search path
AS $$
DECLARE
  v_receipt_id uuid;
  v_created_at timestamp with time zone;
  v_updated_at timestamp with time zone;
  result json;
BEGIN
  -- Set timestamps
  v_created_at := now();
  v_updated_at := now();
  
  -- Insert the rental payment receipt
  -- SECURITY DEFINER allows this to bypass RLS policies
  INSERT INTO rental_payment_receipts (
    customer_id,
    customer_name,
    month,
    payment_date,
    rent_amount,
    fine,
    total_paid,
    company_id,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_customer_id,
    p_customer_name,
    p_month,
    p_payment_date,
    p_rent_amount,
    p_fine,
    p_total_paid,
    p_company_id,
    p_created_by,
    v_created_at,
    v_updated_at
  ) RETURNING id INTO v_receipt_id;
  
  -- Return the complete receipt data
  result := json_build_object(
    'id', v_receipt_id,
    'customer_id', p_customer_id,
    'customer_name', p_customer_name,
    'month', p_month,
    'payment_date', p_payment_date,
    'rent_amount', p_rent_amount,
    'fine', p_fine,
    'total_paid', p_total_paid,
    'company_id', p_company_id,
    'created_by', p_created_by,
    'created_at', v_created_at,
    'updated_at', v_updated_at,
    'success', true,
    'message', 'Rental payment receipt created successfully'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return error details
    RAISE WARNING 'Error in create_rental_payment_receipt: % %', SQLERRM, SQLSTATE;
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_rental_payment_receipt(
  uuid, text, text, date, numeric, numeric, numeric, uuid, uuid
) TO authenticated;

-- Also grant to anon for testing (remove in production)
GRANT EXECUTE ON FUNCTION create_rental_payment_receipt(
  uuid, text, text, date, numeric, numeric, numeric, uuid, uuid
) TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully created create_rental_payment_receipt function with SECURITY DEFINER';
  RAISE NOTICE 'This function bypasses RLS and runs with owner privileges';
END
$$;
