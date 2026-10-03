-- Prepared only. Add ONLY period.sourceFingerprint through the existing XOR helper.
-- All existing accounts/totals/checks/source calculations and fields are unchanged.
-- Preserve function OID, owner, ACL, security, volatility, search_path and TimeZone.
-- No ledger writes, role/trigger change, authorization bypass or period unlock.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $period_fingerprint_repair$
DECLARE
  v_oid oid; v_after_oid oid;
  v_definition text; v_expected_definition text; v_after_definition text;
  v_properties jsonb;
BEGIN
  IF encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('balance_sheet_private.source_fingerprint(uuid,date)')),'UTF8')),'hex') IS DISTINCT FROM 'c16f51439a4c8567b1b7603ccbeba467fd56a294e8b3b84191ee2321897b1b4a' THEN
    RAISE EXCEPTION 'Corrected XOR helper differs from reviewed live definition';
  END IF;
  v_oid := to_regprocedure('balance_sheet_private.period(uuid,date)');
  IF v_oid IS NULL THEN RAISE EXCEPTION 'Expected period(uuid,date) is missing'; END IF;
  SELECT pg_get_functiondef(v_oid) INTO v_definition;
  IF encode(sha256(convert_to(v_definition,'UTF8')),'hex') IS DISTINCT FROM '9c91eac710c1ce9480339e084b582f461f830b6ada13117ef637cb140170d6fa' THEN
    RAISE EXCEPTION 'Live period definition differs from the reviewed source; stop';
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
  IF v_properties IS DISTINCT FROM $properties${"schema":"balance_sheet_private","name":"period","identityArguments":"p_company uuid, p_as_of date","owner":"postgres","acl":["postgres=X/postgres"],"securityDefiner":false,"leakproof":false,"strict":false,"volatility":"s","parallel":"u","kind":"f","returnType":"jsonb","returnsSet":false,"configuration":["search_path=\"\"","TimeZone=UTC"],"language":"sql"}$properties$::jsonb THEN
    RAISE EXCEPTION 'Period owner/ACL/security/configuration changed; stop';
  END IF;
  IF length(v_definition)-length(replace(v_definition,$anchor$  'source',jsonb_build_object(
$anchor$,'')) <> length($anchor$  'source',jsonb_build_object(
$anchor$) OR strpos(v_definition,$addition$  'sourceFingerprint',balance_sheet_private.source_fingerprint(p_company,p_as_of),
$addition$)<>0 THEN
    RAISE EXCEPTION 'Expected exactly one reviewed result insertion/removal point';
  END IF;
  v_expected_definition := replace(v_definition,$anchor$  'source',jsonb_build_object(
$anchor$,$addition$  'sourceFingerprint',balance_sheet_private.source_fingerprint(p_company,p_as_of),
$addition$ || $anchor$  'source',jsonb_build_object(
$anchor$);
  IF encode(sha256(convert_to(v_expected_definition,'UTF8')),'hex') IS DISTINCT FROM 'fc34958c964021c513a5c8dd7770254f2ec27a914c277c9e8ad70f4bd31e180c' THEN
    RAISE EXCEPTION 'Change is not exactly the reviewed JSON result key';
  END IF;
  EXECUTE v_expected_definition;
  v_after_oid := to_regprocedure('balance_sheet_private.period(uuid,date)');
  IF v_after_oid IS DISTINCT FROM v_oid THEN RAISE EXCEPTION 'Period function OID changed'; END IF;
  SELECT pg_get_functiondef(v_after_oid) INTO v_after_definition;
  IF v_after_definition IS DISTINCT FROM v_expected_definition OR
     encode(sha256(convert_to(v_after_definition,'UTF8')),'hex') IS DISTINCT FROM 'fc34958c964021c513a5c8dd7770254f2ec27a914c277c9e8ad70f4bd31e180c' THEN
    RAISE EXCEPTION 'Actual post-DDL period differs from the reviewed one-key change';
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
  IF v_properties IS DISTINCT FROM $properties${"schema":"balance_sheet_private","name":"period","identityArguments":"p_company uuid, p_as_of date","owner":"postgres","acl":["postgres=X/postgres"],"securityDefiner":false,"leakproof":false,"strict":false,"volatility":"s","parallel":"u","kind":"f","returnType":"jsonb","returnsSet":false,"configuration":["search_path=\"\"","TimeZone=UTC"],"language":"sql"}$properties$::jsonb THEN
    RAISE EXCEPTION 'Period owner/ACL/security/configuration changed during replacement';
  END IF;
  IF encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('balance_sheet_private.source_fingerprint(uuid,date)')),'UTF8')),'hex') IS DISTINCT FROM 'c16f51439a4c8567b1b7603ccbeba467fd56a294e8b3b84191ee2321897b1b4a' THEN
    RAISE EXCEPTION 'Corrected XOR helper differs from reviewed live definition';
  END IF;
  RAISE NOTICE 'Period fingerprint result key changed; all old calculations/source remain intact';
END;
$period_fingerprint_repair$;
COMMIT;
