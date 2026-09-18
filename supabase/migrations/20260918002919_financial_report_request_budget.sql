-- Production diagnostics confirmed SQLSTATE 57014 for report calculation.
-- Reading, saving and approving either report recalculates its historical source
-- and can exceed the authenticated role's eight-second request budget.
-- Give only these six calculation RPCs a bounded 45-second request budget.
-- This installation changes no role settings, permissions, accounting records,
-- calculation logic, period-lock commands, list commands or void commands.
--
-- Metadata preflight on 2026-09-18 confirmed that all six function proconfig arrays
-- contained only search_path="". No function had a statement_timeout;
-- the matching rollback therefore RESETs only that new function setting.
-- PostgREST hoists configured function settings before the main query;
-- statement_timeout is included in the default db-hoisted-tx-settings list.
-- References:
-- https://postgrest.org/en/latest/references/transactions.html#hoisted-function-settings
-- https://docs.postgrest.org/en/v13/references/configuration.html#db-hoisted-tx-settings
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER FUNCTION public.get_professional_balance_sheet_v1(uuid, date, date)
  SET statement_timeout = '45s';
ALTER FUNCTION public.save_professional_balance_sheet_v1(uuid, date, date, text)
  SET statement_timeout = '45s';
ALTER FUNCTION public.approve_professional_balance_sheet_v1(uuid, text, jsonb)
  SET statement_timeout = '45s';
ALTER FUNCTION public.get_financial_statement_package_v1(uuid, jsonb)
  SET statement_timeout = '45s';
ALTER FUNCTION public.save_financial_statement_package_v1(uuid, jsonb)
  SET statement_timeout = '45s';
ALTER FUNCTION public.approve_financial_statement_package_v1(uuid, text, jsonb)
  SET statement_timeout = '45s';

NOTIFY pgrst, 'reload schema';
COMMIT;
