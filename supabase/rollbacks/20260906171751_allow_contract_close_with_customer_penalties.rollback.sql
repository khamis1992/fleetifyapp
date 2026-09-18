BEGIN;
CREATE TRIGGER trg_block_contract_close_with_unpaid_penalties
BEFORE UPDATE OF status ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.trg_block_contract_close_with_unpaid_penalties();
COMMIT;
