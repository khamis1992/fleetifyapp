BEGIN;

-- These functions are implementation details called from the guarded public
-- conversion workflow. Keeping them off the authenticated PostgREST surface
-- prevents callers from invoking an internal stage out of sequence.
REVOKE ALL ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid, uuid, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
  uuid, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
  uuid, uuid, text, text, text, boolean, uuid
) TO service_role;

COMMIT;
