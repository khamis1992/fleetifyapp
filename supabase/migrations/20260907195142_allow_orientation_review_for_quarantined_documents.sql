-- Orientation does not approve identity or reactivate quarantined evidence.
DO $patch$
DECLARE v_definition text;
BEGIN
  v_definition := pg_get_functiondef('public.process_contract_document_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint)'::regprocedure);
  IF position('v_doc.legal_evidence_state IS DISTINCT FROM ''active''' IN v_definition)=0 THEN
    RAISE EXCEPTION 'Orientation state guard changed';
  END IF;
  v_definition := replace(v_definition,'v_doc.legal_evidence_state IS DISTINCT FROM ''active''',
    'v_doc.legal_evidence_state NOT IN (''active'',''quarantined'')');
  v_definition := replace(v_definition,'هذه نسخة مؤرشفة أو معزولة؛ افتح النسخة الحالية للتصحيح',
    'هذه نسخة مؤرشفة؛ افتح النسخة الحالية للتصحيح');
  EXECUTE v_definition;
END;
$patch$;
