-- Fix customer account linking issues
-- Enable auto_create_account for all companies
UPDATE companies 
SET customer_account_settings = COALESCE(
    customer_account_settings,
    '{}'::jsonb
) || jsonb_build_object(
    'auto_create_account', true,
    'enable_account_selection', true,
    'account_prefix', 'CUST-',
    'account_naming_pattern', 'customer_name',
    'account_group_by', 'customer_type'
);