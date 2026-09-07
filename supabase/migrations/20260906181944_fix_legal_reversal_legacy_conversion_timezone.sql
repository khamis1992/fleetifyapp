-- Legacy convert_to_legal wrote CURRENT_DATE in UTC. The reversal guard used
-- Qatar's date, incorrectly treating conversions after 21:00 UTC as filings.
-- Only broaden the date match inside the existing exact-case provenance guard.
-- All filing references, submitted jobs/preparations and hearing guards remain.
BEGIN;
DO $migration$
DECLARE
  v_definition text := pg_get_functiondef('public.revert_contract_from_legal_v2(uuid,uuid,text,uuid,uuid)'::regprocedure);
  v_old text := $old$(conversion.performed_at AT TIME ZONE 'Asia/Qatar')::date = legal_case.filing_date$old$;
  v_new text := $new$legal_case.filing_date IN (
                (conversion.performed_at AT TIME ZONE 'Asia/Qatar')::date,
                (conversion.performed_at AT TIME ZONE 'UTC')::date
              )$new$;
BEGIN
  IF strpos(v_definition, v_new) > 0 THEN RETURN; END IF;
  IF strpos(v_definition, v_old) = 0 THEN
    RAISE EXCEPTION 'Unexpected legal reversal definition; refusing to change other guards';
  END IF;
  EXECUTE replace(v_definition, v_old, v_new);
END;
$migration$;
NOTIFY pgrst, 'reload schema';
COMMIT;
