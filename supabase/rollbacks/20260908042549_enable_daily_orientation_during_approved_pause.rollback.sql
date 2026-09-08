-- Disable only this worker; keep originals, scan results and the global pause.
UPDATE public.agent_safety_policies
SET enabled=false,evidence_policy=evidence_policy-'approved_pause'-'activation',updated_at=clock_timestamp()
WHERE agent_id='contract-document-orientation-agent';
CREATE OR REPLACE FUNCTION public.assert_orientation_agent_enabled_v1(p_company_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
  IF current_user<>'service_role' OR p_company_id IS DISTINCT FROM '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
    OR NOT EXISTS(SELECT 1 FROM public.agent_safety_policies WHERE agent_id='contract-document-orientation-agent' AND enabled AND execution_mode='auto_apply')
    OR EXISTS(SELECT 1 FROM public.system_agent_controls WHERE company_id=p_company_id AND (NOT enabled OR paused OR kill_switch))
  THEN RAISE EXCEPTION 'ORIENTATION_AGENT_PAUSED_OR_DISABLED' USING ERRCODE='42501'; END IF;
END;
$fn$;
REVOKE ALL ON FUNCTION public.assert_orientation_agent_enabled_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_orientation_agent_enabled_v1(uuid) TO service_role;
