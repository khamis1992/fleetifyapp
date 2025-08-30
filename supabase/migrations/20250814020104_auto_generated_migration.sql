-- Add account 1130201 to the current company (العراف لتاجير السيارات)
-- Based on the existing account structure from the other company

INSERT INTO public.chart_of_accounts (
    id,
    company_id,
    account_code,
    account_name,
    account_name_ar,
    account_type,
    account_subtype,
    balance_type,
    parent_account_id,
    account_level,
    is_header,
    is_active,
    is_system,
    current_balance,
    description,
    sort_order,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '24bc0b21-4e2d-4413-9842-31719a3669f4', -- العراف لتاجير السيارات
    '1130201',
    'Customers Receivables - Individual',
    'المدينون - أفراد',
    'assets',
    'current_assets',
    'debit',
    (SELECT id FROM public.chart_of_accounts 
     WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' 
     AND account_code = '1130' 
     LIMIT 1),
    4,
    false,
    true,
    false,
    0,
    'Customer receivables for individual customers',
    201,
    now(),
    now()
);