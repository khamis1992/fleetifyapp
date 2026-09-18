-- Remove the manager correction entry point. The production data repair is not
-- automatically reversed: restoring a false "filed" state would recreate the
-- integrity defect. The audit rows retain every previous value for controlled
-- manual recovery if ever required.

REVOKE ALL ON FUNCTION public.correct_unfiled_legal_case_to_preparation_v1(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.correct_unfiled_legal_case_to_preparation_v1(uuid, uuid, text, uuid);
