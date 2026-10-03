-- Restore diagnostic attribution after the source-fingerprint optimization.
-- Replaces only assemble_report checks; sourceFingerprint, account/totals payloads,
-- date validation, company scope and permission calculation remain unchanged.
-- CREATE OR REPLACE retains the existing owner, function OID and execution ACL.
-- Local source only; this migration has not been applied to the live database.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION balance_sheet_private.assemble_report(p_company uuid, p_as_of date, p_comparison date, p_current jsonb, p_comparison_source jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET "TimeZone" TO 'UTC'
AS $function$
DECLARE v_current jsonb:=p_current; v_comparison jsonb:=p_comparison_source; v_company jsonb; v_accounts jsonb;
  v_checks jsonb; v_merged jsonb; v_vehicles jsonb; v_payload jsonb; v_fingerprint text;
BEGIN
  IF p_as_of IS NULL OR NOT isfinite(p_as_of) OR p_as_of < DATE '0001-01-01' OR p_as_of > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date
    OR (p_comparison IS NOT NULL AND (NOT isfinite(p_comparison) OR p_comparison < DATE '0001-01-01' OR p_comparison >= p_as_of)) THEN
    RAISE EXCEPTION 'Invalid balance sheet date or comparison date' USING ERRCODE='22023';
  END IF;
  SELECT jsonb_build_object('id',c.id,'name',COALESCE(c.name,''),'nameAr',c.name_ar,'commercialRegister',c.commercial_register,
    'currency',COALESCE(upper(btrim(c.currency)),''),'address',COALESCE(NULLIF(btrim(c.address_ar),''),c.address)) INTO v_company
  FROM public.companies c WHERE c.id=p_company;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Company not found' USING ERRCODE='22023'; END IF;

  -- Preserve the original report's current/comparison diagnostic contract.
  WITH current_rows AS (
    SELECT c->>'code' AS code, c FROM jsonb_array_elements(v_current->'checks') c
  ), comparison_rows AS (
    SELECT c->>'code' AS code, c FROM jsonb_array_elements(COALESCE(v_comparison->'checks','[]'::jsonb)) c
  )
  SELECT COALESCE(jsonb_agg(row_to_merge ORDER BY code),'[]'::jsonb) INTO v_merged
  FROM (
    SELECT cr.code,
      jsonb_build_object('code',cr.code,'severity',cr.c->>'severity','count',(cr.c->>'count')::numeric,
        'asOfDate',cr.c->>'asOfDate','detail',cr.c->'detail','scope','as_of') AS row_to_merge
    FROM current_rows cr
    UNION ALL
    SELECT cp.code,
      CASE WHEN EXISTS (SELECT 1 FROM current_rows cr WHERE cr.code=cp.code AND cr.c->>'count'=cp.c->>'count') THEN NULL
        ELSE jsonb_build_object('code',cp.code,'severity',cp.c->>'severity','count',(cp.c->>'count')::numeric,
          'asOfDate',cp.c->>'asOfDate','detail',cp.c->'detail','scope','comparison_only') END AS row_to_merge
    FROM comparison_rows cp
  ) merged
  WHERE row_to_merge IS NOT NULL;
  v_checks:=v_merged;
  IF COALESCE(NULLIF(btrim(v_company->>'name'),''),NULLIF(btrim(v_company->>'nameAr'),'')) IS NULL
    OR NULLIF(btrim(v_company->>'commercialRegister'),'') IS NULL THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','missing_company_identity','severity','error','count',1,'asOfDate',p_as_of,'detail','[]'::jsonb,'scope','as_of'));
  END IF;
  IF COALESCE(v_company->>'currency','') !~ '^[A-Z]{3}$' THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','missing_company_currency','severity','error','count',1,'asOfDate',p_as_of,'detail','[]'::jsonb,'scope','as_of'));
  END IF;
  -- These are explicitly CURRENT operational-data warnings, never historical asset valuations.
  SELECT jsonb_build_object('missingCost',count(*) FILTER (WHERE purchase_cost IS NULL OR purchase_cost<=0
      OR purchase_cost::text IN ('NaN','Infinity','-Infinity')),
    'missingPurchaseDate',count(*) FILTER (WHERE purchase_date IS NULL),
    'activeVehicles',count(*)) INTO v_vehicles FROM public.vehicles
  WHERE company_id=p_company AND COALESCE(is_active,true);
  IF (v_vehicles->>'missingCost')::bigint>0 THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','current_vehicles_missing_cost','severity','warning',
      'count',(v_vehicles->>'missingCost')::bigint,'asOfDate',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date,
      'detail','[]'::jsonb,'scope','current_register'));
  END IF;
  IF (v_vehicles->>'missingPurchaseDate')::bigint>0 THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','current_vehicles_missing_purchase_date','severity','warning',
      'count',(v_vehicles->>'missingPurchaseDate')::bigint,'asOfDate',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date,
      'detail','[]'::jsonb,'scope','current_register'));
  END IF;
  SELECT COALESCE(jsonb_agg(c.value||jsonb_build_object('comparisonBalance',
    COALESCE((p.value->>'balance')::numeric,0))
    ORDER BY c.value->>'code',c.value->>'id'),'[]'::jsonb) INTO v_accounts
  FROM jsonb_array_elements(v_current->'accounts') c
  LEFT JOIN jsonb_array_elements(COALESCE(v_comparison->'accounts','[]'::jsonb)) p ON p.value->>'id'=c.value->>'id';
  -- Hash the per-period source fingerprints and metadata, not marshalled rows.
  v_fingerprint:=encode(sha256(convert_to(jsonb_build_object('version',1,'company',v_company,'asOf',p_as_of,
    'comparisonDate',p_comparison,'current',v_current->>'sourceFingerprint',
    'comparison',COALESCE(v_comparison->>'sourceFingerprint',''),
    'vehicles',v_vehicles)::text,'UTF8')),'hex');
  v_payload:=jsonb_build_object('version',1,'company',v_company,'asOfDate',p_as_of,'comparisonDate',p_comparison,
    'generatedAt',statement_timestamp(),'accounts',v_accounts,'current',v_current->'totals',
    'comparison',v_comparison->'totals','checks',v_checks,'fingerprint',v_fingerprint,
    'permissions',jsonb_build_object('canSave',balance_sheet_private.has_access(p_company,'save'),
      'canApprove',balance_sheet_private.has_access(p_company,'approve')));
  RETURN v_payload;
END;
$function$;

COMMIT;
