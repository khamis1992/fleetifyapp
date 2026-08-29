BEGIN;

REVOKE ALL ON FUNCTION public.fulfill_missing_contract_pdf_request_v1()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_missing_contract_pdf_request_v1()
TO service_role;

COMMIT;;
