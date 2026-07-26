DROP TRIGGER IF EXISTS block_verification_with_open_financial_review
  ON public.customer_verification_tasks;
DROP FUNCTION IF EXISTS public.block_verification_with_open_financial_review();
DROP FUNCTION IF EXISTS public.resolve_contract_financial_review_v1(uuid, uuid, text, text);
