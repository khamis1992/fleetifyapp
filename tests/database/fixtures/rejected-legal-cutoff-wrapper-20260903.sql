-- FROZEN REJECTED CANDIDATE. NEVER DEPLOY OR EXECUTE WHOLE FILE.
-- Audit extracts only function statements before the case-specific DO block.
-- RELEASE BLOCKER (2026-09-04): do not deploy this wrapper as-is.
-- Actual-function regressions in tests/database/legal-claim-source-audit.test.mjs
-- show that v4 subtracts exclusions using a different cutoff (erasing valid debt),
-- and rewinding p_as_of_date here also erases evidenced post-termination retention.
-- Replace the shared claim-row calculation with component-specific cutoffs before
-- deployment. The case-specific DML below also needs separate reconciliation.
BEGIN;

-- Keep the already-audited calculation body intact, but make its effective
-- as-of date the earliest legally documented cutoff. The prior implementation
-- calculated and displayed rent_cutoff_date while still selecting invoice and
-- schedule rows through the later p_as_of_date.
ALTER FUNCTION public.calculate_legal_claim_breakdown_v3(uuid, uuid, date)
  RENAME TO calculate_legal_claim_breakdown_v3_uncapped_20260903;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_breakdown_v3_uncapped_20260903(uuid, uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.calculate_legal_claim_breakdown_v3(
  p_company_id uuid,
  p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date)
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := COALESCE(NULLIF(auth.jwt() ->> 'role', ''), '');
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_cutoff_date date := p_as_of_date;
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL OR p_as_of_date IS NULL THEN
    RAISE EXCEPTION 'Company, contract and as-of date are required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT v_trusted_direct_session
     AND v_role <> 'service_role'
     AND (
       auth.uid() IS NULL
       OR public.get_user_company_id() IS DISTINCT FROM p_company_id
     )
  THEN
    RAISE EXCEPTION 'Not authorized to calculate this legal claim'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = p_contract_id
      AND contract.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Contract was not found'
      USING ERRCODE = 'P0001';
  END IF;

  v_cutoff_date := LEAST(
    p_as_of_date,
    COALESCE((
      SELECT profile.vehicle_returned_at::date
      FROM public.legal_case_litigation_profile profile
      WHERE profile.company_id = p_company_id
        AND profile.contract_id = p_contract_id
    ), p_as_of_date),
    COALESCE((
      SELECT CASE
        WHEN profile.termination_date_status = 'confirmed'
          THEN profile.termination_date
        ELSE NULL
      END
      FROM public.legal_case_litigation_profile profile
      WHERE profile.company_id = p_company_id
        AND profile.contract_id = p_contract_id
    ), p_as_of_date),
    COALESCE((
      SELECT MIN(legal_case.judgment_final_at::date)
      FROM public.legal_cases legal_case
      WHERE legal_case.company_id = p_company_id
        AND legal_case.contract_id = p_contract_id
        AND legal_case.judgment_final_at IS NOT NULL
        AND LOWER(COALESCE(legal_case.case_status, '')) <> 'cancelled'
    ), p_as_of_date),
    COALESCE((
      SELECT MIN(legal_case.outcome_date)
      FROM public.legal_cases legal_case
      WHERE legal_case.company_id = p_company_id
        AND legal_case.contract_id = p_contract_id
        AND legal_case.outcome_date IS NOT NULL
        AND legal_case.workflow_stage IN ('judgment_issued', 'appeal', 'enforcement', 'collection', 'closed')
        AND LOWER(COALESCE(legal_case.case_status, '')) <> 'cancelled'
    ), p_as_of_date)
  );

  RETURN public.calculate_legal_claim_breakdown_v3_uncapped_20260903(
    p_company_id,
    p_contract_id,
    v_cutoff_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_breakdown_v3(uuid, uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_breakdown_v3(uuid, uuid, date)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.calculate_legal_claim_breakdown_v3(uuid, uuid, date) IS
'Calculates the legal claim through the earliest documented cutoff. Due invoices and payment schedules after vehicle return, confirmed termination, final judgment or recorded outcome are excluded from rent.';

DO $$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := 'd00185fb-df9a-4abd-975a-cc99aab7bf77';
  v_case_id uuid;
  v_old_case_value numeric;
  v_statement jsonb;
BEGIN
  SELECT legal_case.id, legal_case.case_value
  INTO v_case_id, v_old_case_value
  FROM public.legal_cases legal_case
  WHERE legal_case.company_id = v_company_id
    AND legal_case.contract_id = v_contract_id
    AND legal_case.case_number = 'CASE-26-0059'
    AND legal_case.case_status = 'pending'
    AND legal_case.workflow_stage = 'preparation'
    AND legal_case.filing_date IS NULL
  FOR UPDATE;

  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'CASE-26-0059 is no longer safe for automatic claim refresh';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.legal_claim_snapshots snapshot
    WHERE snapshot.company_id = v_company_id
      AND snapshot.contract_id = v_contract_id
  ) THEN
    RAISE EXCEPTION 'CASE-26-0059 has a frozen claim snapshot and requires manual reconciliation';
  END IF;

  v_statement := public.calculate_legal_claim_statement_v4(
    v_company_id,
    v_contract_id,
    DATE '2026-09-03',
    'full_outstanding',
    ARRAY[]::uuid[]
  );

  IF COALESCE((v_statement ->> 'total')::numeric, -1) <> 44100
     OR (v_statement ->> 'cutoff_date')::date <> DATE '2026-08-31'
  THEN
    RAISE EXCEPTION 'Corrected LTO2024276 legal claim did not validate against the signed schedule and return cutoff: %',
      v_statement;
  END IF;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, severity, status, metadata
  ) VALUES (
    v_company_id,
    'refresh_case_26_0059_after_signed_schedule_20260903163803',
    'legal_case',
    v_case_id,
    'CASE-26-0059',
    'Refreshed the unfiled claim after applying the signed schedule and the documented vehicle-return cutoff.',
    pg_catalog.jsonb_build_object('case_value', v_old_case_value),
    pg_catalog.jsonb_build_object(
      'case_value', (v_statement ->> 'total')::numeric,
      'cutoff_date', v_statement ->> 'cutoff_date',
      'claim_statement', v_statement
    ),
    'high',
    'completed',
    pg_catalog.jsonb_build_object('migration', '20260903163803')
  );

  UPDATE public.legal_cases legal_case
  SET
    case_value = (v_statement ->> 'total')::numeric,
    claim_calculation_version = 'v4-cutoff-enforced',
    claim_calculated_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  WHERE legal_case.id = v_case_id
    AND legal_case.company_id = v_company_id;
END;
$$;

COMMIT;
