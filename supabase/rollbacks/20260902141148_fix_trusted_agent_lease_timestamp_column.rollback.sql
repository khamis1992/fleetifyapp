-- Restore the function body that preceded migration 20260902141016.
-- Warning: this intentionally restores the historical claimed_at reference.
CREATE OR REPLACE FUNCTION public.begin_trusted_agent_invocation_v1(
  p_agent_id text,
  p_company_id uuid,
  p_request_id text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_policy public.agent_safety_policies%ROWTYPE;
  v_request_id text := NULLIF(pg_catalog.left(BTRIM(COALESCE(p_request_id, '')), 200), '');
  v_claimed boolean := false;
BEGIN
  IF p_company_id IS NULL OR v_request_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_policy
  FROM public.agent_safety_policies policy
  WHERE policy.agent_id = p_agent_id;

  IF v_policy.agent_id IS NULL THEN RETURN false; END IF;

  IF p_actor_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = p_actor_id AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = p_actor_id
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RETURN false;
  END IF;

  IF NOT v_policy.enabled THEN RETURN false; END IF;

  INSERT INTO public.agent_invocation_leases (
    company_id, conflict_group, agent_id, request_id, expires_at
  ) VALUES (
    p_company_id, v_policy.conflict_group, p_agent_id, v_request_id,
    now() + pg_catalog.make_interval(secs => v_policy.max_runtime_seconds)
  )
  ON CONFLICT (company_id, conflict_group) DO UPDATE
  SET agent_id = EXCLUDED.agent_id,
      request_id = EXCLUDED.request_id,
      claimed_at = now(),
      expires_at = EXCLUDED.expires_at
  WHERE public.agent_invocation_leases.expires_at <= now()
  RETURNING true INTO v_claimed;

  RETURN v_claimed;
END;
$function$;

REVOKE ALL ON FUNCTION public.begin_trusted_agent_invocation_v1(text,uuid,text,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_trusted_agent_invocation_v1(text,uuid,text,uuid)
TO service_role;

