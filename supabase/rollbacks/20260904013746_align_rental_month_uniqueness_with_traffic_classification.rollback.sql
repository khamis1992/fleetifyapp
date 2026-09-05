-- No business-row writes. Refuse rollback if valid rent now coexists with a
-- TV-only invoice: the old invariant cannot represent that data without loss.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.invoices IN ACCESS EXCLUSIVE MODE;
DO $rollback$
DECLARE
  v_definition text;
  v_valid boolean;
  v_ready boolean;
  v_comment text;
BEGIN
  SELECT pg_get_indexdef(i.indexrelid),i.indisvalid,i.indisready,obj_description(i.indexrelid,'pg_class')
    INTO v_definition,v_valid,v_ready,v_comment
  FROM pg_index i WHERE i.indexrelid=to_regclass('public.idx_invoices_unique_contract_month');
  IF v_valid IS NOT TRUE OR v_ready IS NOT TRUE THEN
    RAISE EXCEPTION 'Rental month index is missing or invalid; refusing rollback';
  END IF;
  IF md5(v_definition)='c44b733f2b1368ce7c965cf484140c3c' THEN RETURN; END IF;
  IF md5(v_definition)<>'ed4eba35fc39556da8207ce7350e329d' THEN
    RAISE EXCEPTION 'Rental month index changed after review; refusing rollback';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.invoices
    WHERE contract_id IS NOT NULL AND COALESCE(invoice_month,invoice_date) IS NOT NULL
      AND penalty_id IS NULL
      AND lower(COALESCE(status,'')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
      AND lower(COALESCE(payment_status,'')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
    GROUP BY contract_id,date_trunc('month',COALESCE(invoice_month,invoice_date)::timestamp)::date
    HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'Rental and traffic invoices now coexist; refusing lossy rollback. Reconcile evidence before restoring the old invariant';
  END IF;
  DROP INDEX public.idx_invoices_unique_contract_month;
  CREATE UNIQUE INDEX idx_invoices_unique_contract_month ON public.invoices USING btree (
    contract_id,
    ((date_trunc('month'::text,(COALESCE(invoice_month,invoice_date))::timestamp without time zone))::date)
  ) WHERE (
    (contract_id IS NOT NULL) AND (COALESCE(invoice_month,invoice_date) IS NOT NULL)
    AND (penalty_id IS NULL)
    AND (lower(COALESCE(status,''::text)) <> ALL (ARRAY['cancelled'::text,'canceled'::text,'void'::text,'voided'::text,'deleted'::text,'inactive'::text]))
    AND (lower(COALESCE(payment_status,''::text)) <> ALL (ARRAY['cancelled'::text,'canceled'::text,'void'::text,'voided'::text,'deleted'::text,'inactive'::text]))
  );
  IF md5(pg_get_indexdef('public.idx_invoices_unique_contract_month'::regclass))<>'c44b733f2b1368ce7c965cf484140c3c' THEN
    RAISE EXCEPTION 'Restored rental month index did not match the reviewed definition';
  END IF;
  IF v_comment IS NOT NULL THEN
    EXECUTE format('COMMENT ON INDEX public.idx_invoices_unique_contract_month IS %L',v_comment);
  END IF;
END;
$rollback$;
COMMIT;
