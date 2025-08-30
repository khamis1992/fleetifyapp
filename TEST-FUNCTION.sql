-- Test script to verify the function works
-- Run this after applying the main function

-- Test the function with dummy parameters (will fail gracefully with "customer not found")
SELECT public.auto_create_customer_accounts(
    '00000000-0000-0000-0000-000000000000',  -- dummy company_id
    '00000000-0000-0000-0000-000000000000'   -- dummy customer_id
);