BEGIN;
DO $patch$
DECLARE original text; anchor text;
BEGIN
  original := pg_get_functiondef('legal_evidence_private.review_contract_identity(uuid,uuid,uuid,text,text,text,boolean)'::regprocedure);
  anchor := 'v_document.legal_identity_details->>''reasonCode'' IN (''insufficient_identity_evidence'', ''tenant_name_conflict'', ''low_ocr_confidence'', ''incomplete_scan'')';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Manual review eligibility changed'; END IF;
  original := replace(original,anchor,'v_document.legal_identity_details->>''reasonCode'' = ''insufficient_identity_evidence''');
  original := replace(original,
    'اختر نسخة عقد موقعة نشطة أو موقوفة بانتظار مراجعة الهوية، وتحتوي على ملف للمعاينة',
    'اختر نسخة عقد موقعة نشطة أو موقوفة لعدم اكتمال قراءة الهوية، وتحتوي على ملف للمعاينة');
  EXECUTE original;
END;
$patch$;
-- Keep completed human decisions, original evidence and audit history.
COMMIT;
