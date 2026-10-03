-- Apply as a NEW forward migration only if reversing this repair is necessary.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$
BEGIN
 IF encode(sha256(convert_to(pg_get_functiondef('public.invoice_settlement_protected_paid_amount(uuid)'::regprocedure),'UTF8')),'hex') <> 'd8a602c0c1b24ef5cedf15a50119f0fe89b0227898b238db20480fb9cebd59e6' THEN
  RAISE EXCEPTION 'Settlement function changed since repair; re-review rollback';
 END IF;
END;
$guard$;
CREATE OR REPLACE FUNCTION public.invoice_settlement_protected_paid_amount(p_invoice_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT e.protected_paid_amount
      FROM public.invoice_balance_fix_exceptions e
      WHERE e.invoice_id = p_invoice_id
        AND e.is_active
      LIMIT 1
    ),
    (
      SELECT i.total_amount
      FROM public.invoices i
      WHERE i.id = p_invoice_id
        AND i.invoice_number ILIKE 'PYINV3%'
        AND EXISTS (
          SELECT 1
          FROM public.journal_entry_lines jel
          JOIN public.journal_entries je ON je.id = jel.journal_entry_id
          WHERE je.company_id = i.company_id
            AND je.entry_number ILIKE 'YEADJ%'
            AND position(i.invoice_number IN coalesce(jel.line_description, '')) > 0
        )
      LIMIT 1
    ),
    0
  )::numeric;
$function$;
COMMIT;

