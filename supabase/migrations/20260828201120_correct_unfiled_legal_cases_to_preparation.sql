-- Correct legal cases that were restored as "filed" even though no court filing
-- evidence exists. The reusable RPC keeps the same evidence checks atomic and
-- limits manual corrections to company managers.

CREATE OR REPLACE FUNCTION public.correct_unfiled_legal_case_to_preparation_v1(
  p_company_id uuid,
  p_case_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor uuid;
  v_case public.legal_cases%ROWTYPE;
  v_contract_legal_status text;
  v_is_cancel_artifact boolean;
  v_old_case_status text;
  v_old_filing_date date;
  v_old_outcome_type text;
  v_old_outcome_date date;
  v_old_outcome_notes text;
BEGIN
  v_actor := public.legal_workflow_actor_profile_v1(p_company_id, p_actor_id);

  IF auth.uid() IS NOT NULL
     AND NOT (
       public.is_company_admin(p_company_id)
       OR public.is_company_manager(p_company_id)
     ) THEN
    RAISE EXCEPTION 'Manager permission is required to correct filing status'
      USING ERRCODE = '42501';
  END IF;

  IF length(BTRIM(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'A detailed correction reason is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_case
  FROM public.legal_cases
  WHERE id = p_case_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal case was not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_case.workflow_stage <> 'filed' THEN
    RAISE EXCEPTION 'Only cases marked as filed can use filing-status correction'
      USING ERRCODE = 'P0001';
  END IF;

  IF NULLIF(BTRIM(COALESCE(v_case.case_reference, '')), '') IS NOT NULL
     OR NULLIF(BTRIM(COALESCE(v_case.complaint_number, '')), '') IS NOT NULL
     OR EXISTS (
       SELECT 1
       FROM public.taqadi_filing_jobs j
       WHERE j.company_id = p_company_id
         AND j.legal_case_id = p_case_id
         AND j.status IN ('filed', 'completed')
     )
     OR EXISTS (
       SELECT 1
       FROM public.taqadi_filing_artifacts a
       JOIN public.taqadi_filing_jobs j
         ON j.id = a.job_id
        AND j.company_id = a.company_id
       WHERE j.company_id = p_company_id
         AND j.legal_case_id = p_case_id
         AND a.artifact_type IN ('receipt', 'submission_summary')
     )
     OR EXISTS (
       SELECT 1
       FROM public.lawsuit_preparations lp
       WHERE lp.company_id = p_company_id
         AND (
           lp.legal_case_id = p_case_id
           OR (lp.legal_case_id IS NULL AND lp.contract_id = v_case.contract_id)
         )
         AND (
           lp.registered_at IS NOT NULL
           OR lp.submitted_at IS NOT NULL
           OR NULLIF(BTRIM(COALESCE(lp.taqadi_case_number, '')), '') IS NOT NULL
           OR NULLIF(BTRIM(COALESCE(lp.taqadi_reference_number, '')), '') IS NOT NULL
           OR lower(COALESCE(lp.status, '')) IN ('registered', 'filed', 'submitted', 'completed')
         )
     )
     OR EXISTS (
       SELECT 1 FROM public.legal_case_hearings h
       WHERE h.company_id = p_company_id AND h.case_id = p_case_id
     )
     OR EXISTS (
       SELECT 1 FROM public.legal_case_appeals a
       WHERE a.company_id = p_company_id AND a.case_id = p_case_id
     )
     OR EXISTS (
       SELECT 1 FROM public.legal_case_enforcements e
       WHERE e.company_id = p_company_id AND e.case_id = p_case_id
     ) THEN
    RAISE EXCEPTION 'Court filing evidence exists; filing status cannot be corrected'
      USING ERRCODE = 'P0001';
  END IF;

  v_is_cancel_artifact :=
    v_case.outcome_type = 'withdrawn'
    AND v_case.outcome_notes = 'Cancelled from legal case tracking';

  v_old_case_status := v_case.case_status;
  v_old_filing_date := v_case.filing_date;
  v_old_outcome_type := v_case.outcome_type;
  v_old_outcome_date := v_case.outcome_date;
  v_old_outcome_notes := v_case.outcome_notes;

  IF (
    v_case.outcome_type IS NOT NULL
    OR v_case.outcome_date IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(v_case.outcome_notes, '')), '') IS NOT NULL
  ) AND NOT v_is_cancel_artifact THEN
    RAISE EXCEPTION 'A legal outcome exists; filing status cannot be corrected'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT legal_status
  INTO v_contract_legal_status
  FROM public.contracts
  WHERE id = v_case.contract_id
    AND company_id = p_company_id;

  UPDATE public.legal_cases
  SET
    workflow_stage = 'preparation',
    case_status = 'pending',
    filing_date = NULL,
    stage_updated_at = now(),
    closed_at = NULL,
    closure_reason = NULL,
    outcome_type = CASE WHEN v_is_cancel_artifact THEN NULL ELSE outcome_type END,
    outcome_date = CASE WHEN v_is_cancel_artifact THEN NULL ELSE outcome_date END,
    outcome_notes = CASE WHEN v_is_cancel_artifact THEN NULL ELSE outcome_notes END,
    updated_at = now()
  WHERE id = p_case_id
    AND company_id = p_company_id
  RETURNING * INTO v_case;

  UPDATE public.tasks
  SET
    status = 'cancelled',
    completed_at = COALESCE(completed_at, now()),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'cancelled_reason', 'legal_case_filing_status_corrected',
      'cancelled_at', now()
    ),
    updated_at = now()
  WHERE company_id = p_company_id
    AND category = 'legal_workflow'
    AND metadata->>'legal_case_id' = p_case_id::text
    AND status IN ('pending', 'in_progress', 'on_hold')
    AND metadata->>'workflow_key' IN (
      'schedule-hearing:' || p_case_id::text,
      'acceptance-state:' || p_case_id::text,
      'court-acceptance:' || p_case_id::text
    );

  PERFORM public.legal_workflow_sync_contract_v1(
    p_company_id,
    v_case.contract_id,
    'preparation'
  );

  INSERT INTO public.legal_case_activities(
    case_id,
    company_id,
    activity_type,
    activity_title,
    activity_description,
    old_values,
    new_values,
    created_by
  ) VALUES (
    p_case_id,
    p_company_id,
    'filing_status_corrected',
    'تصحيح حالة رفع الدعوى',
    BTRIM(p_reason),
    jsonb_build_object(
      'workflow_stage', 'filed',
      'case_status', v_old_case_status,
      'filing_date', v_old_filing_date,
      'outcome_type', v_old_outcome_type,
      'outcome_date', v_old_outcome_date,
      'outcome_notes', v_old_outcome_notes,
      'contract_legal_status', v_contract_legal_status
    ),
    jsonb_build_object(
      'workflow_stage', 'preparation',
      'case_status', 'pending',
      'filing_date', NULL,
      'contract_legal_status', 'under_legal_action',
      'source', 'manager_unfiled_filing_correction'
    ),
    v_actor
  );

  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION public.correct_unfiled_legal_case_to_preparation_v1(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_unfiled_legal_case_to_preparation_v1(uuid, uuid, text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.correct_unfiled_legal_case_to_preparation_v1(uuid, uuid, text, uuid) IS
  'Manager-only correction from filed to preparation when no court filing evidence or downstream litigation record exists.';

-- One-time repair for the batch restored on 2026-08-27. The evidence checks are
-- intentionally repeated here so a case that gained real filing evidence before
-- deployment is excluded automatically.
CREATE TEMP TABLE _unfiled_legal_case_corrections ON COMMIT DROP AS
SELECT
  lc.id AS case_id,
  lc.company_id,
  lc.contract_id,
  lc.case_status AS old_case_status,
  lc.filing_date AS old_filing_date,
  lc.outcome_type AS old_outcome_type,
  lc.outcome_date AS old_outcome_date,
  lc.outcome_notes AS old_outcome_notes,
  ct.legal_status AS old_contract_legal_status
FROM public.legal_cases lc
LEFT JOIN public.contracts ct
  ON ct.id = lc.contract_id
 AND ct.company_id = lc.company_id
WHERE lc.workflow_stage = 'filed'
  AND EXISTS (
    SELECT 1
    FROM public.legal_case_activities a
    WHERE a.company_id = lc.company_id
      AND a.case_id = lc.id
      AND a.activity_type = 'cancellation_reversed'
      AND a.new_values->>'source' = 'restore_cancelled_legal_cases_20260827'
  )
  AND NULLIF(BTRIM(COALESCE(lc.case_reference, '')), '') IS NULL
  AND NULLIF(BTRIM(COALESCE(lc.complaint_number, '')), '') IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.taqadi_filing_jobs j
    WHERE j.company_id = lc.company_id
      AND j.legal_case_id = lc.id
      AND j.status IN ('filed', 'completed')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.taqadi_filing_artifacts a
    JOIN public.taqadi_filing_jobs j
      ON j.id = a.job_id
     AND j.company_id = a.company_id
    WHERE j.company_id = lc.company_id
      AND j.legal_case_id = lc.id
      AND a.artifact_type IN ('receipt', 'submission_summary')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.lawsuit_preparations lp
    WHERE lp.company_id = lc.company_id
      AND (
        lp.legal_case_id = lc.id
        OR (lp.legal_case_id IS NULL AND lp.contract_id = lc.contract_id)
      )
      AND (
        lp.registered_at IS NOT NULL
        OR lp.submitted_at IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(lp.taqadi_case_number, '')), '') IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(lp.taqadi_reference_number, '')), '') IS NOT NULL
        OR lower(COALESCE(lp.status, '')) IN ('registered', 'filed', 'submitted', 'completed')
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.legal_case_hearings h
    WHERE h.company_id = lc.company_id AND h.case_id = lc.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.legal_case_appeals a
    WHERE a.company_id = lc.company_id AND a.case_id = lc.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.legal_case_enforcements e
    WHERE e.company_id = lc.company_id AND e.case_id = lc.id
  )
  AND (
    (
      lc.outcome_type IS NULL
      AND lc.outcome_date IS NULL
      AND NULLIF(BTRIM(COALESCE(lc.outcome_notes, '')), '') IS NULL
    )
    OR (
      lc.outcome_type = 'withdrawn'
      AND lc.outcome_notes = 'Cancelled from legal case tracking'
    )
  );

INSERT INTO public.legal_case_activities(
  case_id,
  company_id,
  activity_type,
  activity_title,
  activity_description,
  old_values,
  new_values,
  created_by
)
SELECT
  c.case_id,
  c.company_id,
  'filing_status_corrected',
  'تصحيح حالة رفع الدعوى',
  'تصحيح إنتاجي معتمد: لا يوجد رقم دعوى خارجي أو إيصال رفع أو مهمة تقاضي مكتملة.',
  jsonb_build_object(
    'workflow_stage', 'filed',
    'case_status', c.old_case_status,
    'filing_date', c.old_filing_date,
    'outcome_type', c.old_outcome_type,
    'outcome_date', c.old_outcome_date,
    'outcome_notes', c.old_outcome_notes,
    'contract_legal_status', c.old_contract_legal_status
  ),
  jsonb_build_object(
    'workflow_stage', 'preparation',
    'case_status', 'pending',
    'filing_date', NULL,
    'contract_legal_status', 'under_legal_action',
    'source', 'bulk_unfiled_filing_correction_20260828'
  ),
  NULL
FROM _unfiled_legal_case_corrections c;

UPDATE public.legal_cases lc
SET
  workflow_stage = 'preparation',
  case_status = 'pending',
  filing_date = NULL,
  stage_updated_at = now(),
  closed_at = NULL,
  closure_reason = NULL,
  outcome_type = CASE
    WHEN lc.outcome_type = 'withdrawn'
     AND lc.outcome_notes = 'Cancelled from legal case tracking'
    THEN NULL ELSE lc.outcome_type END,
  outcome_date = CASE
    WHEN lc.outcome_type = 'withdrawn'
     AND lc.outcome_notes = 'Cancelled from legal case tracking'
    THEN NULL ELSE lc.outcome_date END,
  outcome_notes = CASE
    WHEN lc.outcome_type = 'withdrawn'
     AND lc.outcome_notes = 'Cancelled from legal case tracking'
    THEN NULL ELSE lc.outcome_notes END,
  updated_at = now()
FROM _unfiled_legal_case_corrections c
WHERE lc.id = c.case_id
  AND lc.company_id = c.company_id;

UPDATE public.tasks t
SET
  status = 'cancelled',
  completed_at = COALESCE(t.completed_at, now()),
  metadata = COALESCE(t.metadata, '{}'::jsonb) || jsonb_build_object(
    'cancelled_reason', 'legal_case_filing_status_corrected',
    'cancelled_at', now()
  ),
  updated_at = now()
FROM _unfiled_legal_case_corrections c
WHERE t.company_id = c.company_id
  AND t.category = 'legal_workflow'
  AND t.metadata->>'legal_case_id' = c.case_id::text
  AND t.status IN ('pending', 'in_progress', 'on_hold')
  AND t.metadata->>'workflow_key' IN (
    'schedule-hearing:' || c.case_id::text,
    'acceptance-state:' || c.case_id::text,
    'court-acceptance:' || c.case_id::text
  );

UPDATE public.contracts ct
SET
  legal_status = 'under_legal_action',
  updated_at = now()
FROM _unfiled_legal_case_corrections c
WHERE ct.id = c.contract_id
  AND ct.company_id = c.company_id;
