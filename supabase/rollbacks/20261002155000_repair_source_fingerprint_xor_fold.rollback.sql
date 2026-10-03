-- Prepared from live read-only pg_proc evidence; not applied by the preparer.
-- Rollback: exactly one aggregate token, bit_xor -> bit_or.
-- Source fields/serialization, company/cutoff, OID, owner, ACL, language,
-- security, volatility, search_path and TimeZone remain unchanged.
-- No ledger, roles, triggers, auth bypass or reporting-period changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $fingerprint_repair$
DECLARE
  v_oid oid; v_after_oid oid;
  v_definition text; v_expected_definition text; v_after_definition text;
  v_properties jsonb;
BEGIN
  v_oid := to_regprocedure('balance_sheet_private.source_fingerprint(uuid,date)');
  IF v_oid IS NULL THEN RAISE EXCEPTION 'Expected source_fingerprint(uuid,date) is missing'; END IF;
  SELECT pg_get_functiondef(v_oid) INTO v_definition;
  IF encode(sha256(convert_to(v_definition,'UTF8')),'hex') IS DISTINCT FROM 'c16f51439a4c8567b1b7603ccbeba467fd56a294e8b3b84191ee2321897b1b4a' THEN
    RAISE EXCEPTION 'Source fingerprint definition changed since read-only review; stop';
  END IF;
  SELECT jsonb_build_object('schema',n.nspname,'name',p.proname,
    'identityArguments',pg_get_function_identity_arguments(p.oid),'owner',r.rolname,'acl',to_jsonb(p.proacl),
    'securityDefiner',p.prosecdef,'leakproof',p.proleakproof,'strict',p.proisstrict,
    'volatility',p.provolatile,'parallel',p.proparallel,'kind',p.prokind,
    'returnType',pg_get_function_result(p.oid),'returnsSet',p.proretset,
    'configuration',to_jsonb(p.proconfig),'language',l.lanname)
  INTO v_properties FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_roles r ON r.oid=p.proowner JOIN pg_language l ON l.oid=p.prolang
  WHERE p.oid=v_oid;
  IF v_properties IS DISTINCT FROM $properties${"schema":"balance_sheet_private","name":"source_fingerprint","identityArguments":"p_company uuid, p_as_of date","owner":"postgres","acl":["postgres=X/postgres"],"securityDefiner":false,"leakproof":false,"strict":false,"volatility":"s","parallel":"u","kind":"f","returnType":"text","returnsSet":false,"configuration":["search_path=\"\"","TimeZone=UTC"],"language":"sql"}$properties$::jsonb THEN
    RAISE EXCEPTION 'Source fingerprint owner/ACL/security/configuration changed; stop';
  END IF;
  IF length(v_definition)-length(replace(v_definition,'bit_xor(','')) <> length('bit_xor(')
     OR strpos(v_definition,'bit_or(') <> 0 THEN
    RAISE EXCEPTION 'Expected exactly one aggregate token and no existing target token';
  END IF;
  v_expected_definition := replace(v_definition,'bit_xor(','bit_or(');
  IF encode(sha256(convert_to(v_expected_definition,'UTF8')),'hex') IS DISTINCT FROM 'ad9fb83231735f096e11af002a98c284a9cb1caf109af071c1216ef8a94261fb' THEN
    RAISE EXCEPTION 'Replacement is not the exact reviewed one-token definition';
  END IF;
  -- Execute captured CREATE OR REPLACE with the sole aggregate token swap.
  EXECUTE v_expected_definition;
  v_after_oid := to_regprocedure('balance_sheet_private.source_fingerprint(uuid,date)');
  IF v_after_oid IS DISTINCT FROM v_oid THEN RAISE EXCEPTION 'Function OID changed unexpectedly'; END IF;
  SELECT pg_get_functiondef(v_after_oid) INTO v_after_definition;
  IF v_after_definition IS DISTINCT FROM v_expected_definition
     OR encode(sha256(convert_to(v_after_definition,'UTF8')),'hex') IS DISTINCT FROM 'ad9fb83231735f096e11af002a98c284a9cb1caf109af071c1216ef8a94261fb' THEN
    RAISE EXCEPTION 'Actual post-DDL definition differs from the exact reviewed token change';
  END IF;
  SELECT jsonb_build_object('schema',n.nspname,'name',p.proname,
    'identityArguments',pg_get_function_identity_arguments(p.oid),'owner',r.rolname,'acl',to_jsonb(p.proacl),
    'securityDefiner',p.prosecdef,'leakproof',p.proleakproof,'strict',p.proisstrict,
    'volatility',p.provolatile,'parallel',p.proparallel,'kind',p.prokind,
    'returnType',pg_get_function_result(p.oid),'returnsSet',p.proretset,
    'configuration',to_jsonb(p.proconfig),'language',l.lanname)
  INTO v_properties FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_roles r ON r.oid=p.proowner JOIN pg_language l ON l.oid=p.prolang
  WHERE p.oid=v_oid;
  IF v_properties IS DISTINCT FROM $properties${"schema":"balance_sheet_private","name":"source_fingerprint","identityArguments":"p_company uuid, p_as_of date","owner":"postgres","acl":["postgres=X/postgres"],"securityDefiner":false,"leakproof":false,"strict":false,"volatility":"s","parallel":"u","kind":"f","returnType":"text","returnsSet":false,"configuration":["search_path=\"\"","TimeZone=UTC"],"language":"sql"}$properties$::jsonb THEN
    RAISE EXCEPTION 'Owner/ACL/security/configuration changed during replacement';
  END IF;
  RAISE NOTICE 'Source fingerprint aggregate updated; no source data or permission changed';
END;
$fingerprint_repair$;
COMMIT;
