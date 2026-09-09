BEGIN;
-- Match resolveDefendantContact and the frozen memo factual validator. Keep
-- worker ownership, review, evidence, approval and company gates unchanged.
DO $patch$
DECLARE
  target record; definition text;
  old_contact text := $old$v_address := COALESCE(
    NULLIF(BTRIM(v_profile.defendant_service_address), ''),
    NULLIF(BTRIM(v_customer.address), '')
  );
  v_email := COALESCE(
    NULLIF(BTRIM(v_profile.defendant_email), ''),
    NULLIF(BTRIM(v_customer.email), '')
  );$old$;
  new_contact text := $new$v_address := COALESCE(
    NULLIF(BTRIM(v_profile.defendant_service_address), ''),
    NULLIF(BTRIM(v_customer.address), ''),
    'الدوحة قطر'
  );
  v_email := CASE WHEN v_profile.defendant_email_status = 'verified' THEN COALESCE(
    NULLIF(BTRIM(v_profile.defendant_email), ''),
    CASE WHEN COALESCE(NULLIF(v_profile.defendant_contact_source, ''), 'customer_record') = 'customer_record'
      THEN NULLIF(BTRIM(v_customer.email), '') END
  ) END;$new$;
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('public.approve_taqadi_reviewed_legal_file_v1(uuid,text,jsonb)', '0808c1b897ac18770ba48b949f5565a5', 'before_contact_worker_approval'),
    ('public.legal_case_filing_block_reason_v1(uuid,uuid,numeric)', '8c78e4c48273f70852cfc03dfbcc3320', 'before_contact_filing_block')
  ) entries(signature, expected_hash, backup_name)
  LOOP
    IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=target.signature::regprocedure) IS DISTINCT FROM target.expected_hash THEN
      RAISE EXCEPTION 'Filing function changed since contact audit: %', target.signature;
    END IF;
    definition := pg_get_functiondef(target.signature::regprocedure);
    IF (length(definition)-length(replace(definition,old_contact,'')))/length(old_contact)<>1 THEN
      RAISE EXCEPTION 'Unexpected contact resolver layout: %',target.signature;
    END IF;
    EXECUTE replace(definition, split_part(target.signature,'(',1)||'(', 'legal_memo_calc_private.'||target.backup_name||'(');
    EXECUTE replace(definition,old_contact,new_contact);
  END LOOP;
END;
$patch$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_contact_worker_approval(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_contact_filing_block(uuid,uuid,numeric) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
