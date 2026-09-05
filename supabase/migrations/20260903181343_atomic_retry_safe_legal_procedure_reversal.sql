BEGIN;

ALTER TABLE public.contract_operations_log
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_operations_company_type_idempotency
  ON public.contract_operations_log(company_id, operation_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- All enqueue/restart entry points must observe the current case state. In
-- particular a cancelled job must not be restarted after its case was closed
-- by reversal. The shared case lock serializes this decision with reversal.
CREATE OR REPLACE FUNCTION public.guard_taqadi_queue_open_case_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $guard$
DECLARE
  v_case public.legal_cases%ROWTYPE;
BEGIN
  IF NEW.status <> 'queued' THEN RETURN NEW; END IF;

  SELECT legal_case.* INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.id = NEW.legal_case_id
    AND legal_case.company_id = NEW.company_id
    AND legal_case.contract_id = NEW.contract_id
  FOR SHARE NOWAIT;

  IF NOT FOUND OR v_case.workflow_stage IS DISTINCT FROM 'preparation'
     OR lower(COALESCE(v_case.case_status, '')) IN (
       'closed', 'settled', 'withdrawn', 'dismissed', 'cancelled', 'canceled'
     )
  THEN
    RAISE EXCEPTION 'Only an open case in preparation may enter the filing queue'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$guard$;

REVOKE ALL ON FUNCTION public.guard_taqadi_queue_open_case_v1() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_guard_taqadi_queue_open_case
BEFORE INSERT OR UPDATE OF status, company_id, contract_id, legal_case_id
ON public.taqadi_filing_jobs
FOR EACH ROW EXECUTE FUNCTION public.guard_taqadi_queue_open_case_v1();

CREATE OR REPLACE FUNCTION public.revert_contract_from_legal_v2(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text,
  p_idempotency_key uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_actor_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_contract public.contracts%ROWTYPE;
  v_existing_operation public.contract_operations_log%ROWTYPE;
  v_vehicle_state jsonb;
  v_target_vehicle_status text;
  v_closed_cases integer := 0;
  v_cancelled_jobs integer := 0;
  v_cancelled_preparations integer := 0;
  v_deactivated_delinquency integer := 0;
  v_reason text := NULLIF(BTRIM(COALESCE(p_reason, '')), '');
  v_has_open_state boolean := false;
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Company, contract, and idempotency key are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_reason IS NULL OR length(v_reason) < 10 THEN
    RAISE EXCEPTION 'A reversal reason of at least 10 characters is required'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session
     AND v_actor_role <> 'service_role'
     AND (v_actor_role <> 'authenticated' OR auth.uid() IS NULL)
  THEN
    RAISE EXCEPTION 'Authentication is required to remove a legal procedure'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_trusted_direct_session
     AND v_actor_role <> 'service_role'
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles profile
       WHERE profile.user_id = v_actor
         AND profile.company_id = p_company_id
         AND COALESCE(profile.is_active, false) = true
         AND (
           profile.role IN ('admin', 'manager')
           OR EXISTS (
             SELECT 1
             FROM public.user_roles granted_role
             WHERE granted_role.user_id = v_actor
               AND granted_role.company_id = p_company_id
               AND granted_role.role::text IN ('super_admin', 'company_admin', 'manager')
           )
         )
     )
  THEN
    RAISE EXCEPTION 'The current user is not authorized to remove legal procedures'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_company_id::text || ':legal-contract:' || p_contract_id::text,
      0
    )
  );

  SELECT operation.*
  INTO v_existing_operation
  FROM public.contract_operations_log operation
  WHERE operation.company_id = p_company_id
    AND operation.operation_type = 'revert_from_legal'
    AND operation.idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_operation.contract_id IS DISTINCT FROM p_contract_id
       OR v_existing_operation.operation_details ->> 'reason' IS DISTINCT FROM v_reason
    THEN
      RAISE EXCEPTION 'The idempotency key belongs to a different legal reversal request'
        USING ERRCODE = '22023';
    END IF;
    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'changed', false,
      'idempotent_replay', true,
      'contract_id', p_contract_id,
      'operation_id', v_existing_operation.id,
      'closed_cases', COALESCE((v_existing_operation.operation_details ->> 'closed_cases')::integer, 0),
      'cancelled_jobs', COALESCE((v_existing_operation.operation_details ->> 'cancelled_jobs')::integer, 0),
      'cancelled_preparations', COALESCE((v_existing_operation.operation_details ->> 'cancelled_preparations')::integer, 0),
      'deactivated_delinquent_records', COALESCE((v_existing_operation.operation_details ->> 'deactivated_delinquent_records')::integer, 0)
    );
  END IF;

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The contract was not found in the selected company'
      USING ERRCODE = 'P0001';
  END IF;

  -- Enqueue locks the case; claim/restart/completion lock the job. Freeze all
  -- dependent rows BEFORE checking their state. NOWAIT is intentional: those
  -- writers use different lock orders, so waiting here could deadlock with
  -- a worker holding a job while completing its case/contract update.
  BEGIN
    PERFORM legal_case.id
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
    ORDER BY legal_case.id
    FOR UPDATE NOWAIT;

    PERFORM job.id
    FROM public.taqadi_filing_jobs job
    WHERE job.company_id = p_company_id
      AND job.contract_id = p_contract_id
    ORDER BY job.id
    FOR UPDATE NOWAIT;

    PERFORM preparation.id
    FROM public.lawsuit_preparations preparation
    WHERE preparation.company_id = p_company_id
      AND preparation.contract_id = p_contract_id
    ORDER BY preparation.id
    FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RAISE EXCEPTION 'يجري تحديث ملف الدعوى الآن؛ انتظر انتهاء العملية ثم أعد المحاولة'
      USING ERRCODE = '55P03';
  END;

  IF EXISTS (
    SELECT 1
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
      AND (
        legal_case.filing_date IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(legal_case.case_reference, '')), '') IS NOT NULL
        OR lower(COALESCE(legal_case.workflow_stage, '')) IN (
          'filed', 'awaiting_acceptance', 'accepted', 'hearings', 'judgment', 'enforcement'
        )
      )
      AND lower(COALESCE(legal_case.case_status, '')) NOT IN (
        'closed', 'settled', 'withdrawn', 'dismissed', 'cancelled', 'canceled'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.taqadi_filing_jobs job
    WHERE job.company_id = p_company_id
      AND job.contract_id = p_contract_id
      AND job.status = 'filed'
  ) OR EXISTS (
    SELECT 1
    FROM public.lawsuit_preparations preparation
    WHERE preparation.company_id = p_company_id
      AND preparation.contract_id = p_contract_id
      AND (preparation.submitted_at IS NOT NULL OR preparation.registered_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'A filed legal case cannot be removed; close it through the audited case-outcome workflow'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.taqadi_filing_jobs job
    WHERE job.company_id = p_company_id
      AND job.contract_id = p_contract_id
      AND (
        job.status IN (
          'validating', 'filling_case', 'validating_parties', 'uploading_documents', 'reviewing', 'submitting'
        )
        OR job.error_code = 'SUBMISSION_UNCERTAIN'
      )
  ) THEN
    RAISE EXCEPTION 'The Taqadi filing worker is processing this contract or its submission result is uncertain; verify the portal result first'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    lower(COALESCE(v_contract.status::text, '')) = 'under_legal_procedure'
    OR NULLIF(BTRIM(COALESCE(v_contract.legal_status, '')), '') IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM public.legal_cases legal_case
      WHERE legal_case.company_id = p_company_id
        AND legal_case.contract_id = p_contract_id
        AND lower(COALESCE(legal_case.case_status, '')) NOT IN (
          'closed', 'settled', 'withdrawn', 'dismissed', 'cancelled', 'canceled'
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.delinquent_customers delinquent
      WHERE delinquent.company_id = p_company_id
        AND delinquent.contract_id = p_contract_id
        AND COALESCE(delinquent.is_active, false) = true
    )
    OR EXISTS (
      SELECT 1 FROM public.taqadi_filing_jobs job
      WHERE job.company_id = p_company_id
        AND job.contract_id = p_contract_id
        AND job.status NOT IN ('filed', 'cancelled')
    )
    OR EXISTS (
      SELECT 1 FROM public.lawsuit_preparations preparation
      WHERE preparation.company_id = p_company_id
        AND preparation.contract_id = p_contract_id
        AND lower(COALESCE(preparation.status, '')) <> 'cancelled'
    )
  INTO v_has_open_state;

  IF NOT v_has_open_state THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'changed', false,
      'idempotent_replay', true,
      'contract_id', p_contract_id,
      'closed_cases', 0,
      'cancelled_jobs', 0,
      'deactivated_delinquent_records', 0
    );
  END IF;

  IF lower(COALESCE(v_contract.status::text, '')) NOT IN ('under_legal_procedure', 'active') THEN
    RAISE EXCEPTION 'Only an active or legal-procedure contract can use this reversal workflow'
      USING ERRCODE = 'P0001';
  END IF;

  WITH cancelled_jobs AS (
    UPDATE public.taqadi_filing_jobs job
    SET
      status = 'cancelled',
      current_step = 'cancelled',
      error_code = 'LEGAL_PROCEDURE_REVERSED',
      error_message = v_reason,
      locked_by = NULL,
      locked_at = NULL,
      completed_at = COALESCE(job.completed_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
    WHERE job.company_id = p_company_id
      AND job.contract_id = p_contract_id
      AND job.status IN ('queued', 'waiting_login', 'needs_human', 'failed')
    RETURNING job.id, job.company_id
  )
  INSERT INTO public.taqadi_filing_job_events (
    company_id, job_id, event_type, step, status, message, details
  )
  SELECT
    cancelled.company_id,
    cancelled.id,
    'cancelled_by_legal_reversal',
    'cancelled',
    'cancelled',
    v_reason,
    pg_catalog.jsonb_build_object('contract_id', p_contract_id, 'actor_id', v_actor)
  FROM cancelled_jobs cancelled;
  GET DIAGNOSTICS v_cancelled_jobs = ROW_COUNT;

  UPDATE public.lawsuit_preparations preparation
  SET
    status = 'cancelled',
    notes = CONCAT_WS(E'\n\n', NULLIF(BTRIM(preparation.notes), ''), 'تم إلغاء التجهيز: ' || v_reason),
    updated_at = pg_catalog.now()
  WHERE preparation.company_id = p_company_id
    AND preparation.contract_id = p_contract_id
    AND preparation.registered_at IS NULL
    AND preparation.submitted_at IS NULL
    AND lower(COALESCE(preparation.status, '')) <> 'cancelled';
  GET DIAGNOSTICS v_cancelled_preparations = ROW_COUNT;

  UPDATE public.legal_cases legal_case
  SET
    case_status = 'closed',
    workflow_stage = 'closed',
    outcome_type = COALESCE(NULLIF(BTRIM(legal_case.outcome_type), ''), 'withdrawn'),
    outcome_date = COALESCE(
      legal_case.outcome_date,
      (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date
    ),
    closed_at = COALESCE(legal_case.closed_at, pg_catalog.now()),
    closure_reason = COALESCE(NULLIF(BTRIM(legal_case.closure_reason), ''), v_reason),
    notes = CONCAT_WS(E'\n\n', NULLIF(BTRIM(legal_case.notes), ''), 'تم إلغاء الإجراء القانوني: ' || v_reason),
    stage_updated_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  WHERE legal_case.company_id = p_company_id
    AND legal_case.contract_id = p_contract_id
    AND lower(COALESCE(legal_case.case_status, '')) NOT IN (
      'closed', 'settled', 'withdrawn', 'dismissed', 'cancelled', 'canceled'
    );
  GET DIAGNOSTICS v_closed_cases = ROW_COUNT;

  UPDATE public.delinquent_customers delinquent
  SET
    is_active = false,
    last_updated_at = pg_catalog.now()
  WHERE delinquent.company_id = p_company_id
    AND delinquent.contract_id = p_contract_id
    AND COALESCE(delinquent.is_active, false) = true;
  GET DIAGNOSTICS v_deactivated_delinquency = ROW_COUNT;

  UPDATE public.contracts contract
  SET
    status = 'active',
    legal_status = NULL,
    suspension_reason = NULL,
    updated_at = pg_catalog.now()
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id;

  IF v_contract.vehicle_id IS NOT NULL THEN
    v_vehicle_state := public.system_agent_vehicle_derived_state(
      v_contract.vehicle_id,
      p_company_id
    );
    v_target_vehicle_status := NULLIF(v_vehicle_state ->> 'target_status', '');

    IF v_target_vehicle_status IS NOT NULL THEN
      UPDATE public.vehicles vehicle
      SET
        status = v_target_vehicle_status::public.vehicle_status,
        updated_at = pg_catalog.now()
      WHERE vehicle.id = v_contract.vehicle_id
        AND vehicle.company_id = p_company_id;
    END IF;
  END IF;

  INSERT INTO public.contract_operations_log (
    contract_id,
    company_id,
    operation_type,
    operation_details,
    old_values,
    new_values,
    notes,
    performed_by,
    idempotency_key
  ) VALUES (
    p_contract_id,
    p_company_id,
    'revert_from_legal',
    pg_catalog.jsonb_build_object(
      'reason', v_reason,
      'closed_cases', v_closed_cases,
      'cancelled_jobs', v_cancelled_jobs,
      'cancelled_preparations', v_cancelled_preparations,
      'deactivated_delinquent_records', v_deactivated_delinquency
    ),
    pg_catalog.jsonb_build_object(
      'status', v_contract.status,
      'legal_status', v_contract.legal_status
    ),
    pg_catalog.jsonb_build_object('status', 'active', 'legal_status', NULL::text),
    'تم إلغاء الإجراء القانوني: ' || v_reason,
    v_actor,
    p_idempotency_key
  )
  RETURNING * INTO v_existing_operation;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'changed', true,
    'idempotent_replay', false,
    'contract_id', p_contract_id,
    'operation_id', v_existing_operation.id,
    'closed_cases', v_closed_cases,
    'cancelled_jobs', v_cancelled_jobs,
    'cancelled_preparations', v_cancelled_preparations,
    'deactivated_delinquent_records', v_deactivated_delinquency,
    'vehicle_status', v_target_vehicle_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revert_contract_from_legal_v2(
  uuid, uuid, text, uuid, uuid
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.revert_contract_from_legal_v2(
  uuid, uuid, text, uuid, uuid
) TO authenticated, service_role;

COMMENT ON COLUMN public.contract_operations_log.idempotency_key IS
  'Optional client request UUID for retry-safe contract lifecycle operations.';

COMMENT ON FUNCTION public.revert_contract_from_legal_v2(
  uuid, uuid, text, uuid, uuid
) IS 'Atomically cancels unfiled Taqadi work, closes open preparation cases, clears delinquency, restores contract and vehicle state, and records one retry-safe audit operation.';

COMMIT;
