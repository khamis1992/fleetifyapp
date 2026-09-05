-- Restore the captured production rental core without changing its privileges or invoice type.
-- Refuses unknown function versions; no invoice or schedule history is rewritten.
BEGIN;
DO $migration$
DECLARE
  v_definition text := pg_catalog.pg_get_functiondef('public.system_generate_invoice_for_contract_month_core(uuid,date)'::regprocedure);
  v_old text := $old$      AND invoice.contract_id = v_contract.id
      AND date_trunc($old$;
  v_new text := $new$      AND invoice.contract_id = v_contract.id
      -- Rental generation must not mistake a traffic charge for rent.
      AND invoice.penalty_id IS NULL
      AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
      AND date_trunc($new$;
BEGIN
  IF pg_catalog.md5(v_definition) = 'd7972cf4eac7f73a3e1e3d33efb0a2f0' THEN
    RETURN;
  ELSIF strpos(v_definition, v_new) > 0
    AND pg_catalog.md5(replace(v_definition, v_new, v_old)) = 'd7972cf4eac7f73a3e1e3d33efb0a2f0' THEN
    EXECUTE replace(v_definition, v_new, v_old);
  ELSE
    RAISE EXCEPTION 'Rental invoice core changed after review; refusing rollback';
  END IF;
END;
$migration$;
COMMIT;

