BEGIN;
-- Explicit emergency rollback only: restores the audited historical cache,
-- not invoice/receipt/journal status. Lock prevents concurrent trigger bypass.
LOCK TABLE public.invoices IN ACCESS EXCLUSIVE MODE;
ALTER TABLE public.invoices DISABLE TRIGGER trg_ensure_invoice_balance_due;
DO $restore$
DECLARE item record; current_row jsonb; restored integer:=0;
BEGIN
  FOR item IN SELECT * FROM public.audit_logs
    WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND action='repair_pre_guard_cancelled_invoice_balances'
  LOOP
    SELECT to_jsonb(i) INTO current_row FROM public.invoices i
      WHERE i.id=item.resource_id AND i.company_id=item.company_id;
    IF (current_row-'updated_at') IS DISTINCT FROM (item.new_values-'updated_at') THEN
      RAISE EXCEPTION 'Invoice changed after repair; refusing rollback: %',item.resource_id;
    END IF;
    UPDATE public.invoices SET balance_due=(item.old_values->>'balance_due')::numeric
      WHERE id=item.resource_id AND company_id=item.company_id;
    restored:=restored+1;
  END LOOP;
  IF restored<>23 THEN RAISE EXCEPTION 'Expected 23 audited invoices, found %',restored; END IF;
END;
$restore$;
ALTER TABLE public.invoices ENABLE TRIGGER trg_ensure_invoice_balance_due;
COMMIT;
