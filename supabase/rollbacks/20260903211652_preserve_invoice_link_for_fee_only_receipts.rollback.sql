BEGIN;

-- Restore only this change; never delete receipts, allocations or replay evidence.
DO $rollback$
DECLARE
  v_definition text;
  v_source text;
  v_pattern text := E'  -- fee_only_invoice_link_v1:start\n.*?  -- fee_only_invoice_link_v1:end\n\n';
BEGIN
  SELECT replace(pg_get_functiondef(oid), E'\r\n', E'\n'),
    replace(prosrc, E'\r\n', E'\n') INTO v_definition, v_source
  FROM pg_proc WHERE oid = 'public.sync_payment_allocation_state(uuid)'::regprocedure;
  IF md5(v_source) <> '0358c925d7b546663600ee759a7f8297'
     OR position('  -- fee_only_invoice_link_v1:start' IN v_source) = 0
     OR md5(regexp_replace(v_source, v_pattern, '', 's')) <> 'ce8a7175fe46f375080b854ed2f62fd5' THEN
    RAISE EXCEPTION 'Allocation synchronization changed; review before rollback';
  END IF;
  EXECUTE regexp_replace(v_definition, v_pattern, '', 's');
END;
$rollback$;

COMMIT;
