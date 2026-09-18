BEGIN;
DO $rollback$
DECLARE
  v_definition text := pg_get_functiondef('public.revert_contract_from_legal_v2(uuid,uuid,text,uuid,uuid)'::regprocedure);
  v_old text := $old$(conversion.performed_at AT TIME ZONE 'Asia/Qatar')::date = legal_case.filing_date$old$;
  v_new text := $new$legal_case.filing_date IN (
                (conversion.performed_at AT TIME ZONE 'Asia/Qatar')::date,
                (conversion.performed_at AT TIME ZONE 'UTC')::date
              )$new$;
BEGIN
  IF strpos(v_definition, v_old) > 0 THEN RETURN; END IF;
  IF strpos(v_definition, v_new) = 0 THEN
    RAISE EXCEPTION 'Unexpected legal reversal definition; refusing rollback';
  END IF;
  EXECUTE replace(v_definition, v_new, v_old);
END;
$rollback$;
NOTIFY pgrst, 'reload schema';
COMMIT;
