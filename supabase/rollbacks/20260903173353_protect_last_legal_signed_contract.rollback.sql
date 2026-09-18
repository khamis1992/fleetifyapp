BEGIN;

DROP TRIGGER IF EXISTS trg_protect_last_legal_signed_contract
  ON public.contract_documents;
DROP FUNCTION IF EXISTS public.protect_last_legal_signed_contract_v1();

COMMIT;
