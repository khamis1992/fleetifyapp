BEGIN;

GRANT EXECUTE ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid, uuid, uuid)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
  uuid, uuid, text, text, text, boolean, uuid
) TO authenticated, service_role;

COMMIT;
