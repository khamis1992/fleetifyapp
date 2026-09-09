-- Restore before rolling back canonical claim readers. Preserve all audit rows.
BEGIN;
DO $restore$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('complete_legal_transfer_readiness_v1_pre_pdf_request_agent','uuid,uuid,jsonb,uuid','before_memo_completion_bottom_v1'),
    ('complete_legal_transfer_readiness_with_scope_v1','uuid,uuid,jsonb,text,uuid','before_memo_completion_scope_v1'),
    ('complete_legal_transfer_readiness_v2','uuid,uuid,jsonb,text,uuid','before_memo_completion_v2')
  ) x(name,args,backup) LOOP
    EXECUTE replace(pg_get_functiondef(to_regprocedure('legal_memo_calc_private.'||r.backup||'('||r.args||')')),
      'legal_memo_calc_private.'||r.backup||'(', 'public.'||r.name||'(');
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC,anon',r.name,r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated,service_role',r.name,r.args);
    EXECUTE format('DROP FUNCTION legal_memo_calc_private.%I(%s)',r.backup,r.args);
  END LOOP;
END;
$restore$;
DROP FUNCTION legal_memo_calc_private.dispatch_memo_readiness(uuid,uuid,jsonb,text,uuid);
DROP FUNCTION legal_memo_calc_private.persist_memo_readiness(uuid,uuid,jsonb,uuid);
DROP FUNCTION legal_memo_calc_private.prepare_memo_readiness(uuid,uuid,jsonb,uuid);
DROP FUNCTION legal_memo_calc_private.authorize_memo_completion(uuid,uuid,uuid);
COMMIT;
