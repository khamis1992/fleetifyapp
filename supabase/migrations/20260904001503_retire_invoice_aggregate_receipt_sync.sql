-- LOCAL CANDIDATE, NOT RELEASE-READY: retire only with the canonical report
-- deployment and remaining legacy reader migration/provenance audit.
-- Invoice aggregates are derived state, never new receipt facts. Preserve all
-- historical receipts and the canonical receipt immutability guard.
DO $migration$
DECLARE
  v_definition text;
  v_enabled "char";
  v_timeout text := current_setting('lock_timeout');
  v_search_path text := current_setting('search_path');
BEGIN
  IF to_regprocedure('public.get_canonical_rental_month_summary_v1(uuid,date)') IS NULL THEN
    RAISE EXCEPTION 'Canonical invoice-month reader must be installed before retiring receipt summary writes';
  END IF;
  PERFORM set_config('lock_timeout', '5s', true);
  -- pg_get_triggerdef qualification depends on the caller's search_path.
  PERFORM set_config('search_path', 'pg_catalog, public', true);
  LOCK TABLE public.invoices IN ACCESS EXCLUSIVE MODE;

  SELECT pg_get_triggerdef(t.oid), t.tgenabled INTO v_definition, v_enabled
  FROM pg_trigger t WHERE t.tgrelid = 'public.invoices'::regclass
    AND t.tgname = 'trg_sync_receipt_on_invoice_update' AND NOT t.tgisinternal;
  IF v_definition IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger t
      WHERE t.tgrelid = 'public.invoices'::regclass
        AND t.tgfoid = to_regprocedure('public.sync_receipt_on_invoice_update()') AND NOT t.tgisinternal) THEN
      RAISE EXCEPTION 'Unexpected invoice-to-receipt trigger remains; manual schema review required';
    END IF;
    PERFORM set_config('lock_timeout', v_timeout, true);
    PERFORM set_config('search_path', v_search_path, true);
    RETURN;
  END IF;
  IF v_definition <> 'CREATE TRIGGER trg_sync_receipt_on_invoice_update AFTER UPDATE OF payment_status, paid_amount ON public.invoices FOR EACH ROW EXECUTE FUNCTION sync_receipt_on_invoice_update()'
    OR v_enabled <> 'O'
    OR (SELECT md5(p.prosrc) FROM pg_proc p
        WHERE p.oid = to_regprocedure('public.sync_receipt_on_invoice_update()'))
       IS DISTINCT FROM '330e1ba91be25f6b05f7c265d4e59484'
    OR (SELECT count(*) FROM pg_trigger t WHERE t.tgrelid = 'public.invoices'::regclass
        AND t.tgfoid = to_regprocedure('public.sync_receipt_on_invoice_update()') AND NOT t.tgisinternal) <> 1 THEN
    RAISE EXCEPTION 'Invoice receipt synchronization differs from inspected schema; refusing retirement';
  END IF;

  DROP TRIGGER trg_sync_receipt_on_invoice_update ON public.invoices RESTRICT;
  PERFORM set_config('lock_timeout', v_timeout, true);
  PERFORM set_config('search_path', v_search_path, true);
END;
$migration$;
