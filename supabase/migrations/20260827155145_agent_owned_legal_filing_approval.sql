-- The owner starts filing; the trusted Taqadi worker owns review and approval.
-- Browser users cannot call the approval RPC.

BEGIN;

ALTER TABLE public.legal_case_litigation_profile
  ADD COLUMN IF NOT EXISTS approval_source text,
  ADD COLUMN IF NOT EXISTS approval_job_id uuid REFERENCES public.taqadi_filing_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_worker_id text;

ALTER TABLE public.legal_case_memo_snapshots
  ADD COLUMN IF NOT EXISTS approval_source text,
  ADD COLUMN IF NOT EXISTS approval_job_id uuid REFERENCES public.taqadi_filing_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_worker_id text;

UPDATE public.legal_case_litigation_profile
SET approval_source = 'human'
WHERE legal_review_status = 'approved'
  AND approval_source IS NULL;

UPDATE public.legal_case_memo_snapshots
SET approval_source = 'human'
WHERE readiness_status = 'approved'
  AND approval_source IS NULL;

ALTER TABLE public.legal_case_litigation_profile
  ADD CONSTRAINT chk_legal_profile_approval_source CHECK (
    approval_source IS NULL OR approval_source IN ('human', 'taqadi_agent')
  ),
  ADD CONSTRAINT chk_legal_profile_agent_approval_metadata CHECK (
    approval_source IS DISTINCT FROM 'taqadi_agent'
    OR (approval_job_id IS NOT NULL AND NULLIF(BTRIM(approval_worker_id), '') IS NOT NULL)
  );

ALTER TABLE public.legal_case_memo_snapshots
  ADD CONSTRAINT chk_legal_snapshot_approval_source CHECK (
    approval_source IS NULL OR approval_source IN ('human', 'taqadi_agent')
  ),
  ADD CONSTRAINT chk_legal_snapshot_agent_approval_metadata CHECK (
    approval_source IS DISTINCT FROM 'taqadi_agent'
    OR (approval_job_id IS NOT NULL AND NULLIF(BTRIM(approval_worker_id), '') IS NOT NULL)
  );

-- Keep frozen memo contents immutable. The only permitted update is the
-- service-role transition of the exact reviewed draft to agent-approved.
CREATE OR REPLACE FUNCTION public.prevent_legal_memo_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  old_material jsonb;
  new_material jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_material := to_jsonb(OLD) - ARRAY[
      'case_id', 'readiness_status', 'approved_by', 'approved_at',
      'approval_source', 'approval_job_id', 'approval_worker_id'
    ];
    new_material := to_jsonb(NEW) - ARRAY[
      'case_id', 'readiness_status', 'approved_by', 'approved_at',
      'approval_source', 'approval_job_id', 'approval_worker_id'
    ];

    IF COALESCE(auth.role(), '') = 'service_role'
       AND OLD.readiness_status <> 'approved'
       AND NEW.readiness_status = 'approved'
       AND NEW.approval_source = 'taqadi_agent'
       AND NEW.approval_job_id IS NOT NULL
       AND NULLIF(BTRIM(NEW.approval_worker_id), '') IS NOT NULL
       AND old_material IS NOT DISTINCT FROM new_material THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'legal memo snapshots are immutable; create a new version instead';
END;
$function$;

-- Approved snapshots may no longer be manufactured by the browser-side
-- freeze RPC. Approval is a later worker-owned state transition.
CREATE OR REPLACE FUNCTION public.prevent_direct_legal_memo_snapshot_approval_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF NEW.readiness_status = 'approved' THEN
    RAISE EXCEPTION 'freeze the memo as a draft; the Taqadi worker approves it after portal review'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_direct_legal_memo_snapshot_approval
  ON public.legal_case_memo_snapshots;
CREATE TRIGGER trg_prevent_direct_legal_memo_snapshot_approval
BEFORE INSERT ON public.legal_case_memo_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.prevent_direct_legal_memo_snapshot_approval_v1();

CREATE OR REPLACE FUNCTION public.guard_legal_memo_profile_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  old_material jsonb;
  new_material jsonb;
  approved_snapshot public.legal_case_memo_snapshots;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.legal_review_status = 'approved' THEN
      RAISE EXCEPTION 'create the litigation profile as a draft, then freeze an approved snapshot';
    END IF;
    RETURN NEW;
  END IF;

  old_material := to_jsonb(OLD) - ARRAY[
    'legal_review_status', 'approved_by', 'approved_at', 'approval_source',
    'approval_job_id', 'approval_worker_id', 'updated_at'
  ];
  new_material := to_jsonb(NEW) - ARRAY[
    'legal_review_status', 'approved_by', 'approved_at', 'approval_source',
    'approval_job_id', 'approval_worker_id', 'updated_at'
  ];

  IF OLD.legal_review_status = 'approved' AND old_material IS DISTINCT FROM new_material THEN
    NEW.legal_review_status := 'draft';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.approval_source := NULL;
    NEW.approval_job_id := NULL;
    NEW.approval_worker_id := NULL;
    RETURN NEW;
  END IF;

  IF OLD.legal_review_status = 'approved'
     AND NEW.legal_review_status = 'approved'
     AND (
       NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approval_source IS DISTINCT FROM OLD.approval_source
       OR NEW.approval_job_id IS DISTINCT FROM OLD.approval_job_id
       OR NEW.approval_worker_id IS DISTINCT FROM OLD.approval_worker_id
     ) THEN
    RAISE EXCEPTION 'approved memo metadata is immutable; freeze a new version instead';
  END IF;

  IF NEW.legal_review_status = 'approved' AND OLD.legal_review_status <> 'approved' THEN
    IF COALESCE(auth.role(), '') = 'service_role'
       AND NEW.approval_source = 'taqadi_agent' THEN
      SELECT snapshot.*
      INTO approved_snapshot
      FROM public.legal_case_memo_snapshots snapshot
      WHERE snapshot.company_id = NEW.company_id
        AND snapshot.contract_id = NEW.contract_id
        AND snapshot.readiness_status = 'approved'
        AND snapshot.approval_source = 'taqadi_agent'
        AND snapshot.approval_job_id = NEW.approval_job_id
        AND snapshot.approval_worker_id = NEW.approval_worker_id
      ORDER BY snapshot.version DESC
      LIMIT 1;
    ELSE
      RAISE EXCEPTION 'only the Taqadi worker may approve the legal file after portal review'
        USING ERRCODE = '42501';
    END IF;

    IF approved_snapshot.id IS NULL THEN
      RAISE EXCEPTION 'freeze and approve a current memo snapshot before approving the profile';
    END IF;
    NEW.approved_by := approved_snapshot.approved_by;
    NEW.approved_at := approved_snapshot.approved_at;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.invalidate_legal_memo_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  changed_row jsonb := COALESCE(to_jsonb(NEW), to_jsonb(OLD));
BEGIN
  UPDATE public.legal_case_litigation_profile
  SET legal_review_status = 'draft',
      approved_by = NULL,
      approved_at = NULL,
      approval_source = NULL,
      approval_job_id = NULL,
      approval_worker_id = NULL
  WHERE company_id = (changed_row ->> 'company_id')::uuid
    AND contract_id = (changed_row ->> 'contract_id')::uuid
    AND legal_review_status = 'approved';
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- A newly frozen draft becomes the current filing package. Any older approval
-- must stop being usable immediately, even if it was issued by the agent.
DROP TRIGGER IF EXISTS trg_legal_memo_snapshot_invalidates_approval
  ON public.legal_case_memo_snapshots;
CREATE TRIGGER trg_legal_memo_snapshot_invalidates_approval
AFTER INSERT ON public.legal_case_memo_snapshots
FOR EACH ROW
WHEN (NEW.readiness_status <> 'approved')
EXECUTE FUNCTION public.invalidate_legal_memo_approval();

CREATE OR REPLACE FUNCTION public.approve_taqadi_reviewed_legal_file_v1(
  p_job_id uuid,
  p_worker_id text,
  p_review_details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_profile public.legal_case_litigation_profile%ROWTYPE;
  v_snapshot public.legal_case_memo_snapshots%ROWTYPE;
  v_validation jsonb;
  v_claim numeric;
  v_payload_claim numeric;
  v_snapshot_claim numeric;
  v_address text;
  v_email text;
  v_plate text;
  v_snapshot_id uuid;
  v_approved_at timestamptz := now();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'only the trusted Taqadi worker may approve a reviewed filing package'
      USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_worker_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'worker id is required' USING ERRCODE = '22023';
  END IF;

  SELECT job.*
  INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.id = p_job_id
    AND job.locked_by = BTRIM(p_worker_id)
  FOR UPDATE;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'filing job lock was lost' USING ERRCODE = 'P0001';
  END IF;
  IF v_job.status <> 'reviewing' OR v_job.current_step <> 'final_review' THEN
    RAISE EXCEPTION 'filing package is not at the verified review step' USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_job.final_approval
     OR COALESCE((v_job.payload ->> 'finalApproval')::boolean, false) = false THEN
    RAISE EXCEPTION 'automatic approval is disabled for this filing job' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE((p_review_details ->> 'matched')::boolean, false) = false
     OR COALESCE((p_review_details ->> 'claimAmountMatches')::boolean, false) = false THEN
    RAISE EXCEPTION 'the portal review was not proven to match the filing package' USING ERRCODE = 'P0001';
  END IF;

  v_snapshot_id := NULLIF(v_job.payload ->> 'memoSnapshotId', '')::uuid;
  IF v_snapshot_id IS NULL THEN
    RAISE EXCEPTION 'the filing package does not identify its memo snapshot' USING ERRCODE = 'P0001';
  END IF;

  SELECT legal_case.*
  INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.id = v_job.legal_case_id
    AND legal_case.company_id = v_job.company_id
    AND legal_case.contract_id = v_job.contract_id
  FOR UPDATE;
  IF v_case.id IS NULL OR v_case.workflow_stage <> 'preparation' THEN
    RAISE EXCEPTION 'legal case is no longer at the filing preparation stage' USING ERRCODE = 'P0001';
  END IF;

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_job.contract_id
    AND contract.company_id = v_job.company_id;
  IF v_contract.id IS NULL OR v_contract.vehicle_id IS NULL THEN
    RAISE EXCEPTION 'contract or linked vehicle is missing' USING ERRCODE = 'P0001';
  END IF;

  SELECT customer.*
  INTO v_customer
  FROM public.customers customer
  WHERE customer.id = v_contract.customer_id
    AND customer.company_id = v_job.company_id;
  IF v_customer.id IS NULL OR NULLIF(BTRIM(COALESCE(v_customer.national_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'defendant identity is incomplete' USING ERRCODE = 'P0001';
  END IF;

  SELECT profile.*
  INTO v_profile
  FROM public.legal_case_litigation_profile profile
  WHERE profile.company_id = v_job.company_id
    AND profile.contract_id = v_job.contract_id
  FOR UPDATE;
  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'litigation profile is missing' USING ERRCODE = 'P0001';
  END IF;

  SELECT snapshot.*
  INTO v_snapshot
  FROM public.legal_case_memo_snapshots snapshot
  WHERE snapshot.id = v_snapshot_id
    AND snapshot.company_id = v_job.company_id
    AND snapshot.contract_id = v_job.contract_id
    AND (snapshot.case_id = v_job.legal_case_id OR snapshot.case_id IS NULL)
  FOR UPDATE;
  IF v_snapshot.id IS NULL THEN
    RAISE EXCEPTION 'memo snapshot does not belong to this filing job' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.legal_case_memo_snapshots newer
    WHERE newer.company_id = v_job.company_id
      AND newer.contract_id = v_job.contract_id
      AND newer.version > v_snapshot.version
  ) THEN
    RAISE EXCEPTION 'a newer memo snapshot exists; refresh the filing package' USING ERRCODE = 'P0001';
  END IF;

  v_validation := public.validate_taqadi_filing_payload_v1(
    v_job.company_id,
    v_job.contract_id,
    v_job.payload
  );
  IF COALESCE((v_validation ->> 'ready')::boolean, false) = false THEN
    RAISE EXCEPTION 'filing package is incomplete: %', v_validation -> 'missing'
      USING ERRCODE = 'P0001';
  END IF;

  v_payload_claim := NULLIF(v_job.payload #>> '{case,amount}', '')::numeric;
  v_claim := public.calculate_legal_claim_amount_v1(
    v_job.company_id,
    v_job.contract_id,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date
  );
  v_snapshot_claim := NULLIF(v_snapshot.payload #>> '{customer,total_debt}', '')::numeric;
  IF v_payload_claim IS NULL
     OR ROUND(v_payload_claim, 2) <> ROUND(v_claim, 2)
     OR v_snapshot_claim IS NULL
     OR ROUND(v_snapshot_claim, 2) <> ROUND(v_claim, 2) THEN
    RAISE EXCEPTION 'claim amount changed after the reviewed memo was frozen' USING ERRCODE = 'P0001';
  END IF;

  v_address := COALESCE(
    NULLIF(BTRIM(v_profile.defendant_service_address), ''),
    NULLIF(BTRIM(v_customer.address), '')
  );
  v_email := COALESCE(
    NULLIF(BTRIM(v_profile.defendant_email), ''),
    NULLIF(BTRIM(v_customer.email), '')
  );
  SELECT COALESCE(vehicle.plate_number, v_contract.license_plate)
  INTO v_plate
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_contract.vehicle_id
    AND vehicle.company_id = v_job.company_id;

  IF COALESCE(v_snapshot.payload #>> '{customer,id_number}', '') <> COALESCE(v_customer.national_id, '')
     OR COALESCE(v_snapshot.payload #>> '{customer,address}', '') <> COALESCE(v_address, '')
     OR LOWER(COALESCE(v_snapshot.payload #>> '{customer,email}', '')) <> LOWER(COALESCE(v_email, ''))
     OR COALESCE(v_job.payload #>> '{defendant,idNumber}', '') <> COALESCE(v_customer.national_id, '')
     OR COALESCE(v_job.payload #>> '{defendant,address}', '') <> COALESCE(v_address, '')
     OR LOWER(COALESCE(v_job.payload #>> '{defendant,email}', '')) <> LOWER(COALESCE(v_email, '')) THEN
    RAISE EXCEPTION 'defendant identity or service details changed after review' USING ERRCODE = 'P0001';
  END IF;

  IF regexp_replace(
       translate(COALESCE(v_snapshot.payload #>> '{vehicleInfo,plate}', ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
       '[^0-9A-Za-z]', '', 'g'
     ) <> regexp_replace(
       translate(COALESCE(v_plate, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
       '[^0-9A-Za-z]', '', 'g'
     ) THEN
    RAISE EXCEPTION 'vehicle identity changed after review' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.legal_case_memo_snapshots
  SET case_id = COALESCE(case_id, v_job.legal_case_id),
      readiness_status = 'approved',
      approved_by = v_job.requested_by,
      approved_at = v_approved_at,
      approval_source = 'taqadi_agent',
      approval_job_id = v_job.id,
      approval_worker_id = BTRIM(p_worker_id)
  WHERE id = v_snapshot.id;

  UPDATE public.legal_case_litigation_profile
  SET legal_review_status = 'approved',
      approved_by = v_job.requested_by,
      approved_at = v_approved_at,
      approval_source = 'taqadi_agent',
      approval_job_id = v_job.id,
      approval_worker_id = BTRIM(p_worker_id)
  WHERE id = v_profile.id;

  INSERT INTO public.taqadi_filing_job_events (
    company_id, job_id, event_type, step, status, message, details
  ) VALUES (
    v_job.company_id,
    v_job.id,
    'agent_approved',
    'final_review',
    'reviewing',
    'راجع وكيل تقاضي الحزمة كاملة واعتمد النسخة المطابقة قبل الإرسال',
    COALESCE(p_review_details, '{}'::jsonb) || jsonb_build_object(
      'memoSnapshotId', v_snapshot.id,
      'approvalSource', 'taqadi_agent',
      'workerId', BTRIM(p_worker_id),
      'approvedAt', v_approved_at
    )
  );

  RETURN jsonb_build_object(
    'approved', true,
    'memoSnapshotId', v_snapshot.id,
    'jobId', v_job.id,
    'approvedAt', v_approved_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_taqadi_reviewed_legal_file_v1(uuid,text,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_taqadi_reviewed_legal_file_v1(uuid,text,jsonb)
TO service_role;

COMMENT ON FUNCTION public.approve_taqadi_reviewed_legal_file_v1(uuid,text,jsonb) IS
  'Service-role-only gate that records Taqadi worker approval after deterministic portal review matching.';

COMMIT;
