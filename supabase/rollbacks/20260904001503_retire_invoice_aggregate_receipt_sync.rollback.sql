-- Emergency schema rollback only. Restores the known legacy defect; it is not
-- a repair of historical data. No receipts, payments or allocations are removed.
DO $rollback$
DECLARE
  v_definition text;
  v_enabled "char";
  v_timeout text := current_setting('lock_timeout');
  v_search_path text := current_setting('search_path');
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM set_config('search_path', 'pg_catalog, public', true);
  LOCK TABLE public.invoices IN ACCESS EXCLUSIVE MODE;
  IF (SELECT md5(p.prosrc) FROM pg_proc p
      WHERE p.oid = to_regprocedure('public.sync_receipt_on_invoice_update()'))
     IS DISTINCT FROM '330e1ba91be25f6b05f7c265d4e59484' THEN
    RAISE EXCEPTION 'Original receipt synchronization function changed; refusing rollback';
  END IF;
  SELECT pg_get_triggerdef(t.oid), t.tgenabled INTO v_definition, v_enabled
  FROM pg_trigger t WHERE t.tgrelid = 'public.invoices'::regclass
    AND t.tgname = 'trg_sync_receipt_on_invoice_update' AND NOT t.tgisinternal;
  IF v_definition IS NOT NULL THEN
    IF v_definition <> 'CREATE TRIGGER trg_sync_receipt_on_invoice_update AFTER UPDATE OF payment_status, paid_amount ON public.invoices FOR EACH ROW EXECUTE FUNCTION sync_receipt_on_invoice_update()'
      OR v_enabled <> 'O' THEN
      RAISE EXCEPTION 'Replacement trigger exists; refusing to overwrite it';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'public.invoices'::regclass
      AND t.tgfoid = to_regprocedure('public.sync_receipt_on_invoice_update()') AND NOT t.tgisinternal) THEN
      RAISE EXCEPTION 'Unexpected replacement receipt trigger exists; refusing rollback';
    END IF;
    CREATE TRIGGER trg_sync_receipt_on_invoice_update
      AFTER UPDATE OF payment_status, paid_amount ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.sync_receipt_on_invoice_update();
  END IF;
  PERFORM set_config('lock_timeout', v_timeout, true);
  PERFORM set_config('search_path', v_search_path, true);
END;
$rollback$;
