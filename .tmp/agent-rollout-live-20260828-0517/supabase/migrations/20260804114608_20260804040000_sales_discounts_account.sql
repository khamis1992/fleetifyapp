-- Create the missing sales-discounts leaf account used by invoice discount
-- journals. The discount poster previously fell back to an arbitrary expense
-- account and failed on header accounts.

BEGIN;

INSERT INTO public.chart_of_accounts (
  company_id, account_code, account_name, account_type, balance_type,
  is_header, account_level, is_active
)
SELECT
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  '5199',
  'خصومات ممنوحة على الإيرادات',
  'expenses',
  'debit',
  false,
  3,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.chart_of_accounts account
  WHERE account.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND account.account_code = '5199'
);

COMMIT;;
