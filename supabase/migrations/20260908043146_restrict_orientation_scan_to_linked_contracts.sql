-- Some legacy signed-agreement uploads have no contract_id. They cannot be
-- safely corrected as contract documents or entered in the contract scan ledger.
CREATE OR REPLACE FUNCTION public.contract_orientation_candidates_v1(p_company_id uuid,p_limit integer DEFAULT 50,p_document_id uuid DEFAULT NULL)
RETURNS TABLE(document_id uuid,contract_id uuid,file_path text,source_fingerprint text,
  human_reviewed boolean,attempt_count integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
  SELECT d.id,d.contract_id,d.file_path,
    md5(jsonb_build_array(d.file_path,d.file_size,s.updated_at)::text),
    EXISTS(SELECT 1 FROM public.contract_document_orientation_revisions h
      WHERE h.document_id=d.id AND h.company_id=d.company_id AND h.corrected_file_path=d.file_path AND h.actor_id IS NOT NULL),
    COALESCE(c.attempt_count,0)
  FROM public.contract_documents d
  JOIN public.contracts ctr ON ctr.id=d.contract_id AND ctr.company_id=d.company_id
  LEFT JOIN storage.objects s ON s.bucket_id='contract-documents' AND s.name=d.file_path
  LEFT JOIN public.contract_document_orientation_checks c ON c.document_id=d.id AND c.company_id=d.company_id
  WHERE d.company_id=p_company_id AND (p_document_id IS NULL OR d.id=p_document_id) AND d.document_type IN ('signed_contract','signed_contract_image')
    AND d.legal_evidence_state IN ('active','quarantined') AND d.superseded_by_document_id IS NULL
    AND NULLIF(d.file_path,'') IS NOT NULL AND (d.mime_type='application/pdf' OR lower(d.file_path) LIKE '%.pdf')
    AND (c.document_id IS NULL OR c.source_fingerprint<>md5(jsonb_build_array(d.file_path,d.file_size,s.updated_at)::text)
      OR c.detector_version<>'tesseract-osd-dual-scale-v1' OR c.retry_after<=clock_timestamp())
  ORDER BY c.checked_at NULLS FIRST,d.created_at,d.id LIMIT LEAST(GREATEST(p_limit,1),100);
$fn$;
REVOKE ALL ON FUNCTION public.contract_orientation_candidates_v1(uuid,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contract_orientation_candidates_v1(uuid,integer,uuid) TO service_role;
