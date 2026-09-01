-- Follow-up hardening for the unified legal claim engine.

BEGIN;

-- The tenant-first operational index does not cover deletes/updates through the
-- contract_id foreign key because contract_id is not its leading column.
CREATE INDEX IF NOT EXISTS idx_legal_claim_snapshots_contract_id
  ON public.legal_claim_snapshots(contract_id);

CREATE OR REPLACE FUNCTION public.freeze_legal_claim_snapshot_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_case_id uuid,
  p_snapshot_type text,
  p_as_of_date date,
  p_claim_scope text,
  p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.legal_claim_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_statement jsonb;
  v_snapshot public.legal_claim_snapshots%ROWTYPE;
  v_version integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL
     AND p_actor_id IS NOT NULL
     AND p_actor_id IS DISTINCT FROM auth.uid()
  THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;
  IF p_snapshot_type NOT IN ('transfer', 'filing', 'initial_judgment', 'manual_review') THEN
    RAISE EXCEPTION 'Unsupported claim snapshot type' USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to freeze this legal claim'
      USING ERRCODE = '42501';
  END IF;
  IF p_case_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.id = p_case_id
      AND legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
  ) THEN
    RAISE EXCEPTION 'Legal case does not belong to this contract' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_company_id::text || ':legal-claim-snapshot:' || p_contract_id::text,
      0
    )
  );

  v_statement := public.calculate_legal_claim_statement_v4(
    p_company_id,
    p_contract_id,
    p_as_of_date,
    p_claim_scope,
    p_excluded_invoice_ids
  );

  SELECT COALESCE(MAX(snapshot.version), 0) + 1
  INTO v_version
  FROM public.legal_claim_snapshots snapshot
  WHERE snapshot.company_id = p_company_id
    AND snapshot.contract_id = p_contract_id
    AND snapshot.case_id IS NOT DISTINCT FROM p_case_id
    AND snapshot.snapshot_type = p_snapshot_type;

  INSERT INTO public.legal_claim_snapshots (
    company_id, contract_id, case_id, snapshot_type, version, claim_scope,
    as_of_date, cutoff_date, vehicle_custody, contract_status, total_amount,
    breakdown, created_by
  )
  VALUES (
    p_company_id,
    p_contract_id,
    p_case_id,
    p_snapshot_type,
    v_version,
    COALESCE(NULLIF(BTRIM(p_claim_scope), ''), 'full_outstanding'),
    p_as_of_date,
    COALESCE((v_statement ->> 'cutoff_date')::date, p_as_of_date),
    CASE
      WHEN v_statement ->> 'vehicle_custody' IN ('with_defendant', 'returned')
        THEN v_statement ->> 'vehicle_custody'
      ELSE 'unknown'
    END,
    COALESCE(v_statement ->> 'contract_status', 'unknown'),
    COALESCE((v_statement ->> 'total')::numeric, 0),
    v_statement,
    v_actor
  )
  RETURNING * INTO v_snapshot;

  RETURN v_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.freeze_legal_claim_snapshot_v1(uuid, uuid, uuid, text, date, text, uuid[], uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.freeze_legal_claim_snapshot_v1(uuid, uuid, uuid, text, date, text, uuid[], uuid)
  TO authenticated, service_role;

COMMIT;
