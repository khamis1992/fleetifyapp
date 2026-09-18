-- Disable package generation/review without deleting financial history or audit events.
BEGIN;
SET LOCAL lock_timeout='5s';
DROP FUNCTION IF EXISTS public.get_financial_statement_package_v1(uuid,jsonb);
DROP FUNCTION IF EXISTS public.save_financial_statement_package_v1(uuid,jsonb);
DROP FUNCTION IF EXISTS public.approve_financial_statement_package_v1(uuid,text,jsonb);
DROP FUNCTION IF EXISTS public.list_financial_statement_packages_v1(uuid);
DROP FUNCTION IF EXISTS public.void_financial_statement_package_v1(uuid,text);
DROP FUNCTION IF EXISTS financial_statement_private.get_report(uuid,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.save_report(uuid,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.approve_report(uuid,text,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.list_reports(uuid);
DROP FUNCTION IF EXISTS financial_statement_private.void_report(uuid,text);
DROP FUNCTION IF EXISTS financial_statement_private.calculate(uuid,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.activity(uuid,date,date,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.equity_statement(text,jsonb,jsonb,jsonb,date,date);
DROP FUNCTION IF EXISTS financial_statement_private.equity_values(jsonb,jsonb,text);
DROP FUNCTION IF EXISTS financial_statement_private.cash_balance(jsonb,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.position_values(jsonb,jsonb,text);
DROP FUNCTION IF EXISTS financial_statement_private.validate_configuration(uuid,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.row(text,text,text,jsonb,text,jsonb,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.finding(text,text,text,jsonb,jsonb,text);
DROP FUNCTION IF EXISTS financial_statement_private.cash_detail(jsonb,text,numeric,text,text,text,jsonb);
DROP FUNCTION IF EXISTS financial_statement_private.position_group(text);
DROP FUNCTION IF EXISTS financial_statement_private.add_amount(jsonb,text,numeric);
DROP FUNCTION IF EXISTS financial_statement_private.catalog();
-- SELECT RLS, immutable triggers, snapshots and events deliberately remain.
NOTIFY pgrst,'reload schema';
COMMIT;
