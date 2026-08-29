BEGIN;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname = 'missing-contract-pdf-agent';

UPDATE public.agent_invocation_registry
SET enabled = false,
    updated_at = now()
WHERE agent_id = 'missing-contract-pdf-agent';

DROP FUNCTION IF EXISTS public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
);
ALTER FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
  uuid, uuid, text, text, text, boolean, uuid
) RENAME TO convert_contract_to_legal_v1;

-- Rebind the compatibility overload to the restored implementation.
CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT public.convert_contract_to_legal_v1(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    false,
    p_actor_id
  );
$function$;

DROP FUNCTION IF EXISTS public.complete_legal_transfer_readiness_v1(
  uuid, uuid, jsonb, uuid
);
ALTER FUNCTION public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent(
  uuid, uuid, jsonb, uuid
) RENAME TO complete_legal_transfer_readiness_v1;

DROP FUNCTION IF EXISTS public.get_legal_transfer_readiness_v1(uuid, uuid);
ALTER FUNCTION public.get_legal_transfer_readiness_v1_pre_pdf_request_agent(
  uuid, uuid
) RENAME TO get_legal_transfer_readiness_v1;

DROP TRIGGER IF EXISTS trg_fulfill_missing_contract_pdf_request
ON public.contract_documents;
DROP FUNCTION IF EXISTS public.fulfill_missing_contract_pdf_request_v1();
DROP FUNCTION IF EXISTS public.enqueue_missing_contract_pdf_request_v1(
  uuid, uuid, text, uuid
);

UPDATE public.contract_documents document
SET legal_identity_match_status = 'pending',
    legal_identity_expected_name = NULL,
    legal_identity_extracted_name = NULL,
    legal_identity_match_reason = NULL,
    legal_identity_checked_at = NULL,
    updated_at = now()
WHERE document.id = '7c0304c2-06f8-475d-b8c6-c689c2f9ec39'::uuid
  AND document.legal_identity_match_reason =
    'الملف نسخة من العقد 276 لحسن شريف وربط بعقد ألياس يعقوبي بمطابقة اللوحة فقط؛ غير صالح للجاهزية القانونية.';

DROP TABLE IF EXISTS public.missing_contract_pdf_deliveries;
DROP TABLE IF EXISTS public.missing_contract_pdf_requests;
DROP TABLE IF EXISTS public.missing_contract_pdf_recipients;

COMMIT;
