BEGIN;
-- Stop the new entry point; immutable command/receipt history remains intact.
DROP FUNCTION IF EXISTS public.create_invoice_payment_with_late_fee_v2(
  uuid,uuid,numeric,numeric,uuid,date,text,text,text,text,uuid
);
DO $restore$
DECLARE v_definition text; v_source text;
BEGIN
  SELECT pg_get_functiondef(oid), prosrc INTO v_definition,v_source
  FROM pg_proc WHERE oid='public.enforce_payment_financial_controls()'::regprocedure;
  v_source := replace(v_source,
    'v_existing_paid + public.payment_principal_for_control_v1(NEW)',
    'v_existing_paid + COALESCE(NEW.amount, 0)');
  IF md5(replace(v_source,E'\r\n',E'\n')) <> '4daf47f4a7f0569e413439c6c130230d' THEN
    RAISE EXCEPTION 'Financial control changed; refusing unsafe rollback';
  END IF;
  EXECUTE replace(v_definition,
    'v_existing_paid + public.payment_principal_for_control_v1(NEW)',
    'v_existing_paid + COALESCE(NEW.amount, 0)');
END;
$restore$;
DROP FUNCTION public.payment_principal_for_control_v1(public.payments);
DROP FUNCTION public.assert_invoice_fee_command_allocations_v1(uuid,uuid,uuid,uuid,numeric,numeric);
-- Refuse to discard unexpected in-flight evidence; successful RPCs leave none.
DO $empty$
BEGIN
  IF EXISTS (SELECT 1 FROM public.invoice_fee_payment_context) THEN
    RAISE EXCEPTION 'Fee command context is not empty; investigate before rollback';
  END IF;
END;
$empty$;
DROP TABLE public.invoice_fee_payment_context;
COMMIT;
