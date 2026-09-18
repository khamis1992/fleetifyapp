BEGIN;
DO $restore$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('convert_contract_to_legal_collection_v2','uuid,uuid,text,text,text,boolean,text,uuid','legacy_conversion_v2'),
    ('freeze_legal_claim_snapshot_v1','uuid,uuid,uuid,text,date,text,uuid[],uuid','legacy_freeze_v1')
  ) x(name,args,backup) LOOP
    EXECUTE replace(pg_get_functiondef(to_regprocedure('legal_claim_internal.'||r.backup||'('||r.args||')')),
      'legal_claim_internal.'||r.backup||'(', 'public.'||r.name||'(');
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC,anon',r.name,r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated,service_role',r.name,r.args);
    EXECUTE format('DROP FUNCTION legal_claim_internal.%I(%s)',r.backup,r.args);
  END LOOP;
END;
$restore$;
DROP FUNCTION legal_claim_internal.convert_collection_v3(uuid,uuid,text,text,text,boolean,text,uuid);
DROP FUNCTION legal_claim_internal.freeze_claim_v2(uuid,uuid,uuid,text,date,text,uuid[],uuid);
COMMIT;
