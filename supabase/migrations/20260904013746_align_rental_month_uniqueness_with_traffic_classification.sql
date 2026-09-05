-- Schema-only repair. Do not run without the reviewed rental-core/billing path.
-- A short transactional lock keeps uniqueness enforced across the replacement;
-- this is not an online/concurrent index build. Rehearse on the full schema first.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.invoices IN ACCESS EXCLUSIVE MODE;

DO $migration$
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
    RAISE EXCEPTION 'Rental month index is missing or invalid; refusing replacement';
  END IF;
  IF md5(v_definition)='ed4eba35fc39556da8207ce7350e329d' THEN RETURN; END IF;
  IF md5(v_definition)<>'c44b733f2b1368ce7c965cf484140c3c' THEN
    RAISE EXCEPTION 'Rental month index changed after review; refusing replacement';
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
    AND (upper(btrim(COALESCE(invoice_number::text,''::text))) NOT LIKE 'TV-%'::text)
  );
  IF md5(pg_get_indexdef('public.idx_invoices_unique_contract_month'::regclass))<>'ed4eba35fc39556da8207ce7350e329d' THEN
    RAISE EXCEPTION 'Replacement rental month index did not match the reviewed definition';
  END IF;
  IF v_comment IS NOT NULL THEN
    EXECUTE format('COMMENT ON INDEX public.idx_invoices_unique_contract_month IS %L',v_comment);
  END IF;
END;
$migration$;
COMMIT;
