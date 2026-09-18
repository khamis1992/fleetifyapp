-- Restore the verified prior configuration of all six calculation RPCs:
-- no per-function statement timeout.
-- RESET only statement_timeout so the existing search_path and any unrelated
-- function settings remain intact. Role-level request budgets apply again.
-- No permissions, financial records or calculation logic are changed.
-- References:
-- https://postgrest.org/en/latest/references/transactions.html#hoisted-function-settings
-- https://docs.postgrest.org/en/v13/references/configuration.html#db-hoisted-tx-settings
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER FUNCTION public.get_professional_balance_sheet_v1(uuid, date, date)
  RESET statement_timeout;
ALTER FUNCTION public.save_professional_balance_sheet_v1(uuid, date, date, text)
  RESET statement_timeout;
ALTER FUNCTION public.approve_professional_balance_sheet_v1(uuid, text, jsonb)
  RESET statement_timeout;
ALTER FUNCTION public.get_financial_statement_package_v1(uuid, jsonb)
  RESET statement_timeout;
ALTER FUNCTION public.save_financial_statement_package_v1(uuid, jsonb)
  RESET statement_timeout;
ALTER FUNCTION public.approve_financial_statement_package_v1(uuid, text, jsonb)
  RESET statement_timeout;

NOTIFY pgrst, 'reload schema';
COMMIT;
