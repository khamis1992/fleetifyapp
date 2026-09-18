BEGIN;
DO $patch$
DECLARE original text; anchor text;
BEGIN
  original := pg_get_functiondef('legal_evidence_private.review_contract_identity(uuid,uuid,uuid,text,text,text,boolean)'::regprocedure);
  anchor := 'OR v_document.legal_evidence_state <> ''active''';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Manual review eligibility changed'; END IF;
  -- OCR inability to read an ID is not a proven mismatch. Permit an authorized
  -- human to review that exact file, without activating it during preview.
  original := replace(original,anchor,
    'OR NOT COALESCE((v_document.legal_evidence_state = ''active'' OR (v_document.legal_evidence_state = ''quarantined'' AND v_document.legal_identity_match_status = ''unverified'' AND v_document.legal_identity_details->>''reasonCode'' = ''insufficient_identity_evidence'')),false)');
  original := replace(original,'اختر نسخة عقد موقعة ونشطة تحتوي على ملف للمعاينة',
    'اختر نسخة عقد موقعة نشطة أو موقوفة لعدم اكتمال قراءة الهوية، وتحتوي على ملف للمعاينة');
  anchor := 'to_jsonb(v_document),v_values,jsonb_build_object(''review_id'',v_review.id';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Manual review audit changed'; END IF;
  original := replace(original,anchor,
    'to_jsonb(v_document),v_values || jsonb_build_object(''legal_evidence_state'',''active'',''legal_identity_expires_at'',NULL),jsonb_build_object(''review_id'',v_review.id');
  anchor := 'UPDATE public.contract_documents SET legal_identity_match_status=''matched'',';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Manual review write changed'; END IF;
  original := replace(original,anchor,
    anchor || E'\n    legal_evidence_state=''active'',legal_identity_expires_at=NULL,');
  -- Existing actor/company checks, revision, full matching identity number,
  -- explicit attestation and reason, conflicting-copy guard and audit all apply.
  EXECUTE original;
END;
$patch$;
COMMIT;
