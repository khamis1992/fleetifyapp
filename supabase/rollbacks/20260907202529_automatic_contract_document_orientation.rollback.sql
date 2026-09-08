-- Behavior rollback: disable unattended writes, preserving originals, saved
-- corrected versions and machine provenance. Never relabel an agent as a user.
UPDATE public.agent_safety_policies SET enabled=false,updated_at=now()
WHERE agent_id='contract-document-orientation-agent';
DROP FUNCTION IF EXISTS public.process_automatic_contract_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint,text,jsonb);
DROP FUNCTION IF EXISTS public.contract_orientation_candidates_v1(uuid,integer,uuid);
DROP FUNCTION IF EXISTS public.assert_orientation_agent_enabled_v1(uuid);
-- Retain checks/history and nullable actor fields because production rows may
-- exist. The interactive API remains available with its original authorization.
