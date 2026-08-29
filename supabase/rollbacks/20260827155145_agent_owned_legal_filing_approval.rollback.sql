BEGIN;

DROP FUNCTION IF EXISTS public.approve_taqadi_reviewed_legal_file_v1(uuid,text,jsonb);

DROP TRIGGER IF EXISTS trg_legal_memo_snapshot_invalidates_approval
  ON public.legal_case_memo_snapshots;

DROP TRIGGER IF EXISTS trg_prevent_direct_legal_memo_snapshot_approval
  ON public.legal_case_memo_snapshots;
DROP FUNCTION IF EXISTS public.prevent_direct_legal_memo_snapshot_approval_v1();

CREATE OR REPLACE FUNCTION public.prevent_legal_memo_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  RAISE EXCEPTION 'legal memo snapshots are immutable; create a new version instead';
END;
$function$;

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
    'legal_review_status', 'approved_by', 'approved_at', 'updated_at'
  ];
  new_material := to_jsonb(NEW) - ARRAY[
    'legal_review_status', 'approved_by', 'approved_at', 'updated_at'
  ];

  IF OLD.legal_review_status = 'approved' AND old_material IS DISTINCT FROM new_material THEN
    NEW.legal_review_status := 'draft';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    RETURN NEW;
  END IF;

  IF OLD.legal_review_status = 'approved'
     AND NEW.legal_review_status = 'approved'
     AND (NEW.approved_by IS DISTINCT FROM OLD.approved_by
          OR NEW.approved_at IS DISTINCT FROM OLD.approved_at) THEN
    RAISE EXCEPTION 'approved memo metadata is immutable; freeze a new version instead';
  END IF;

  IF NEW.legal_review_status = 'approved' AND OLD.legal_review_status <> 'approved' THEN
    SELECT snapshot.*
    INTO approved_snapshot
    FROM public.legal_case_memo_snapshots snapshot
    WHERE snapshot.company_id = NEW.company_id
      AND snapshot.contract_id = NEW.contract_id
      AND snapshot.readiness_status = 'approved'
      AND snapshot.approved_by = auth.uid()
      AND snapshot.created_at >= OLD.updated_at
    ORDER BY snapshot.version DESC
    LIMIT 1;
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
  SET legal_review_status = 'draft', approved_by = NULL, approved_at = NULL
  WHERE company_id = (changed_row ->> 'company_id')::uuid
    AND contract_id = (changed_row ->> 'contract_id')::uuid
    AND legal_review_status = 'approved';
  RETURN COALESCE(NEW, OLD);
END;
$function$;

ALTER TABLE public.legal_case_litigation_profile
  DROP CONSTRAINT IF EXISTS chk_legal_profile_agent_approval_metadata,
  DROP CONSTRAINT IF EXISTS chk_legal_profile_approval_source,
  DROP COLUMN IF EXISTS approval_worker_id,
  DROP COLUMN IF EXISTS approval_job_id,
  DROP COLUMN IF EXISTS approval_source;

ALTER TABLE public.legal_case_memo_snapshots
  DROP CONSTRAINT IF EXISTS chk_legal_snapshot_agent_approval_metadata,
  DROP CONSTRAINT IF EXISTS chk_legal_snapshot_approval_source,
  DROP COLUMN IF EXISTS approval_worker_id,
  DROP COLUMN IF EXISTS approval_job_id,
  DROP COLUMN IF EXISTS approval_source;

COMMIT;
