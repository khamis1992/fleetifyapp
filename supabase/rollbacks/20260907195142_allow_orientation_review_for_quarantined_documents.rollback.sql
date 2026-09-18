DO $patch$
DECLARE v_definition text;
BEGIN
  v_definition := pg_get_functiondef('public.process_contract_document_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint)'::regprocedure);
  v_definition := replace(v_definition,'v_doc.legal_evidence_state NOT IN (''active'',''quarantined'')',
    'v_doc.legal_evidence_state IS DISTINCT FROM ''active''');
  EXECUTE v_definition;
END;
$patch$;
