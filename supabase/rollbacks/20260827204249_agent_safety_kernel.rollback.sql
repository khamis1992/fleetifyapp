BEGIN;

DROP FUNCTION IF EXISTS public.get_agent_safety_inventory_v1();
DROP FUNCTION IF EXISTS public.assert_direct_legal_contract_document_v1(uuid,uuid,uuid);
DROP FUNCTION IF EXISTS public.contract_terms_scan_batch_candidates_v4(uuid,integer,uuid);
DROP TRIGGER IF EXISTS trg_01_guard_signed_contract_identity_match_v1
ON public.contract_documents;
DROP TRIGGER IF EXISTS trg_00_guard_signed_contract_binding_v1
ON public.contract_documents;
DROP FUNCTION IF EXISTS public.guard_signed_contract_evidence_integrity_v1();
DROP FUNCTION IF EXISTS public.normalize_legal_party_name_v1(text);
DROP FUNCTION IF EXISTS public.verify_scheduled_agent_invocation_v2(text,uuid,text,text);
DROP TABLE IF EXISTS public.agent_safety_events;
DROP TABLE IF EXISTS public.agent_invocation_leases;
DROP TABLE IF EXISTS public.agent_safety_policies;

COMMIT;
