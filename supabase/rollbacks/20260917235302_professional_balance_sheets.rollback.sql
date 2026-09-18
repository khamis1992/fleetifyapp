-- Disable new generation and transitions. Preserve all saved statements, signatures,
-- confirmations, void reasons and audit events, with existing SELECT RLS and immutability.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP FUNCTION public.get_professional_balance_sheet_v1(uuid,date,date);
DROP FUNCTION public.save_professional_balance_sheet_v1(uuid,date,date,text);
DROP FUNCTION public.approve_professional_balance_sheet_v1(uuid,text,jsonb);
DROP FUNCTION public.list_professional_balance_sheets_v1(uuid);
DROP FUNCTION public.void_professional_balance_sheet_v1(uuid,text);
DROP FUNCTION balance_sheet_private.get_report(uuid,date,date);
DROP FUNCTION balance_sheet_private.save_report(uuid,date,date,text);
DROP FUNCTION balance_sheet_private.approve_report(uuid,text,jsonb);
DROP FUNCTION balance_sheet_private.list_reports(uuid);
DROP FUNCTION balance_sheet_private.void_report(uuid,text);
DROP FUNCTION balance_sheet_private.calculate(uuid,date,date);
DROP FUNCTION balance_sheet_private.period(uuid,date);
DROP FUNCTION balance_sheet_private.actor_name(uuid);
DROP FUNCTION balance_sheet_private.finite_amount(numeric);
DROP FUNCTION balance_sheet_private.classification(text,text);
DROP FUNCTION balance_sheet_private.account_type(text);
-- Retain tables, has_access SELECT predicate and both immutability triggers/functions.
NOTIFY pgrst,'reload schema';
COMMIT;
