-- Disable the feature without undoing users' decisions or erasing audit evidence.
BEGIN;
DROP FUNCTION public.close_contract_no_claim_closure_v1(uuid,uuid,text,uuid,text);
DROP FUNCTION public.preview_contract_no_claim_closure_v1(uuid,uuid);
DROP FUNCTION contract_finance_private.close_no_claim_closure(uuid,uuid,text,uuid,text);
DROP FUNCTION contract_finance_private.preview_no_claim_closure(uuid,uuid);
DROP FUNCTION contract_finance_private.no_claim_snapshot(uuid,uuid);
DROP FUNCTION contract_finance_private.require_closure_access(uuid);
-- Retain the RLS-protected decision table and public repair snapshots used by the resolution guard.
NOTIFY pgrst,'reload schema';
COMMIT;
