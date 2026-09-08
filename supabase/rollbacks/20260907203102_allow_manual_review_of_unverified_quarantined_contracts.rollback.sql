BEGIN;
DO $patch$
DECLARE original text; anchor text;
BEGIN
  original := pg_get_functiondef('legal_evidence_private.review_contract_identity(uuid,uuid,uuid,text,text,text,boolean)'::regprocedure);
  anchor := 'OR NOT COALESCE((v_document.legal_evidence_state = ''active'' OR (v_document.legal_evidence_state = ''quarantined'' AND v_document.legal_identity_match_status = ''unverified'' AND v_document.legal_identity_details->>''reasonCode'' = ''insufficient_identity_evidence'')),false)';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Manual review eligibility changed'; END IF;
  original := replace(original,anchor,'OR v_document.legal_evidence_state <> ''active''');
  original := replace(original,'اختر نسخة عقد موقعة نشطة أو موقوفة لعدم اكتمال قراءة الهوية، وتحتوي على ملف للمعاينة',
    'اختر نسخة عقد موقعة ونشطة تحتوي على ملف للمعاينة');
  original := replace(original,
    'to_jsonb(v_document),v_values || jsonb_build_object(''legal_evidence_state'',''active'',''legal_identity_expires_at'',NULL),jsonb_build_object(''review_id'',v_review.id',
    'to_jsonb(v_document),v_values,jsonb_build_object(''review_id'',v_review.id');
  original := replace(original,E'\n    legal_evidence_state=''active'',legal_identity_expires_at=NULL,','');
  EXECUTE original;
END;
$patch$;
-- Preserve authorized human decisions and their evidence; no document data is
-- approved by this migration and rollback never discards a recorded review.
COMMIT;
