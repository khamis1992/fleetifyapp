-- User approved this document-only worker and a daily 03:00 Qatar run on
-- 2026-09-08. Do not change the company pause or any other agent's policy.
UPDATE public.agent_safety_policies p
SET enabled=true,
    evidence_policy=p.evidence_policy || jsonb_build_object(
      'approved_pause',jsonb_build_object('company_id',c.company_id,
        'paused_at_epoch',extract(epoch FROM c.paused_at),'pause_reason',c.pause_reason),
      'activation',jsonb_build_object('approved_at',clock_timestamp(),
        'schedule','03:00 Asia/Qatar','scope','contract_pdf_orientation_only')),
    updated_at=clock_timestamp()
FROM public.system_agent_controls c
WHERE p.agent_id='contract-document-orientation-agent'
  AND c.company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.enabled AND NOT c.kill_switch AND c.paused
  AND c.paused_at IS NOT NULL
  AND c.pause_reason='whatsapp_number_banned_after_bulk_send_20260828';

CREATE OR REPLACE FUNCTION public.assert_orientation_agent_enabled_v1(p_company_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
  IF current_user<>'service_role' OR p_company_id IS DISTINCT FROM '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
    OR NOT EXISTS(SELECT 1 FROM public.agent_safety_policies WHERE agent_id='contract-document-orientation-agent' AND enabled AND execution_mode='auto_apply')
    OR EXISTS(SELECT 1 FROM public.system_agent_controls c WHERE c.company_id=p_company_id
      AND (NOT c.enabled OR c.kill_switch OR (c.paused AND NOT EXISTS(
        SELECT 1 FROM public.agent_safety_policies p WHERE p.agent_id='contract-document-orientation-agent'
          AND c.paused_at IS NOT NULL AND p.evidence_policy->'approved_pause'=jsonb_build_object(
            'company_id',c.company_id,'paused_at_epoch',extract(epoch FROM c.paused_at),'pause_reason',c.pause_reason)
      ))))
  THEN RAISE EXCEPTION 'ORIENTATION_AGENT_PAUSED_OR_DISABLED' USING ERRCODE='42501'; END IF;
END;
$fn$;
REVOKE ALL ON FUNCTION public.assert_orientation_agent_enabled_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_orientation_agent_enabled_v1(uuid) TO service_role;

INSERT INTO public.audit_logs(company_id,user_id,action,resource_type,old_values,new_values,metadata)
SELECT c.company_id,NULL,'contract_document_orientation_daily_enabled','agent_safety_policies',
  jsonb_build_object('scheduled',false),jsonb_build_object('scheduled_time','03:00 Asia/Qatar'),
  jsonb_build_object('agent_id',p.agent_id,'user_authorization','2026-09-08 enable and run now',
    'company_pause_unchanged',true,'approved_pause',p.evidence_policy->'approved_pause')
FROM public.agent_safety_policies p CROSS JOIN public.system_agent_controls c
WHERE p.agent_id='contract-document-orientation-agent'
  AND c.company_id='24bc0b21-4e2d-4413-9842-31719a3669f4';
