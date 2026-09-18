BEGIN;
DO $patch$
DECLARE original text; anchor text;
BEGIN
  original := pg_get_functiondef('legal_evidence_private.review_contract_identity(uuid,uuid,uuid,text,text,text,boolean)'::regprocedure);
  anchor := 'v_document.legal_identity_details->>''reasonCode'' = ''insufficient_identity_evidence''';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Manual review eligibility changed'; END IF;
  -- These OCR assessments explicitly request human review. They are not a
  -- verified identity-number conflict or ambiguous evidence from several people.
  original := replace(original,anchor,
    'v_document.legal_identity_details->>''reasonCode'' IN (''insufficient_identity_evidence'', ''tenant_name_conflict'', ''low_ocr_confidence'', ''incomplete_scan'')');
  original := replace(original,
    'اختر نسخة عقد موقعة نشطة أو موقوفة لعدم اكتمال قراءة الهوية، وتحتوي على ملف للمعاينة',
    'اختر نسخة عقد موقعة نشطة أو موقوفة بانتظار مراجعة الهوية، وتحتوي على ملف للمعاينة');
  -- Preview remains read-only. Scope/role/revision checks, matching the full
  -- observed QID, attestation, reason, conflicting-copy guard and audit remain.
  EXECUTE original;
END;
$patch$;
COMMIT;
