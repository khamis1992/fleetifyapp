DROP FUNCTION IF EXISTS public.convert_contract_to_legal_v1(uuid, uuid, text, text, text, boolean, uuid);
ALTER FUNCTION public.convert_contract_to_legal_v1_pre_employee_review(
  uuid, uuid, text, text, text, boolean, uuid
) RENAME TO convert_contract_to_legal_v1;

DROP FUNCTION IF EXISTS public.override_legal_transfer_employee_review_v1(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.respond_legal_transfer_employee_review_v1(uuid, uuid, text, text, jsonb, jsonb, jsonb, uuid);
DROP FUNCTION IF EXISTS public.request_legal_transfer_employee_review_v1(uuid, uuid, text, uuid);
DROP TABLE IF EXISTS public.legal_transfer_employee_reviews;
DROP FUNCTION IF EXISTS public.can_manage_legal_transfer_reviews_v1(uuid);
