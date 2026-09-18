-- Restore before rolling back canonical claim readers. Preserve all audit rows.
BEGIN;
DO $dependencies$
BEGIN
  IF to_regprocedure('legal_claim_internal.auto_verify_review_v2(uuid,uuid,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'Roll back canonical system review 20260904040649 before completion 20260904034603';
  END IF;
END;
$dependencies$;
DO $restore$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('complete_legal_transfer_readiness_v1_pre_pdf_request_agent','uuid,uuid,jsonb,uuid','legacy_completion_bottom_v1'),
    ('complete_legal_transfer_readiness_with_scope_v1','uuid,uuid,jsonb,text,uuid','legacy_completion_scope_v1'),
    ('complete_legal_transfer_readiness_v2','uuid,uuid,jsonb,text,uuid','legacy_completion_v2')
  ) x(name,args,backup) LOOP
    EXECUTE replace(pg_get_functiondef(to_regprocedure('legal_claim_internal.'||r.backup||'('||r.args||')')),
      'legal_claim_internal.'||r.backup||'(', 'public.'||r.name||'(');
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC,anon',r.name,r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated,service_role',r.name,r.args);
    EXECUTE format('DROP FUNCTION legal_claim_internal.%I(%s)',r.backup,r.args);
  END LOOP;
END;
$restore$;
DROP FUNCTION legal_claim_internal.dispatch_readiness_completion_v3(uuid,uuid,jsonb,text,uuid);
DROP FUNCTION legal_claim_internal.persist_readiness_v3(uuid,uuid,jsonb,uuid);
DROP FUNCTION legal_claim_internal.prepare_readiness_snapshot_v3(uuid,uuid,jsonb,uuid);
DROP FUNCTION legal_claim_internal.authorize_readiness_completion_v1(uuid,uuid,uuid);
COMMIT;
