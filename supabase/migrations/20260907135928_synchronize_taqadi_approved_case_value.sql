-- Synchronize the case register with the exact package already approved by the
-- worker. This does not change invoices, payments, frozen memos or filing guards.
BEGIN;
CREATE OR REPLACE FUNCTION public.sync_taqadi_approved_case_value_v1(p_job_id uuid, p_worker_id text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_snapshot public.legal_case_memo_snapshots%ROWTYPE;
  v_amount numeric;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only the trusted worker may synchronize an approved case' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_job FROM public.taqadi_filing_jobs
  WHERE id = p_job_id AND locked_by = BTRIM(p_worker_id) FOR UPDATE;
  IF NOT FOUND OR v_job.status NOT IN ('reviewing', 'submitting') THEN
    RAISE EXCEPTION 'Approved filing job lock or stage is invalid';
  END IF;
  SELECT * INTO v_case FROM public.legal_cases
  WHERE id = v_job.legal_case_id AND company_id = v_job.company_id
    AND contract_id = v_job.contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found'; END IF;
  -- Never rewrite the value of a case which has already left preparation.
  IF v_case.workflow_stage <> 'preparation' THEN RETURN; END IF;
  IF NULLIF(BTRIM(v_case.case_reference), '') IS NOT NULL THEN
    RAISE EXCEPTION 'A referenced legal case cannot be synchronized';
  END IF;
  SELECT * INTO v_snapshot FROM public.legal_case_memo_snapshots
  WHERE id = NULLIF(v_job.payload ->> 'memoSnapshotId', '')::uuid
    AND company_id = v_job.company_id AND contract_id = v_job.contract_id
    AND case_id = v_job.legal_case_id
    AND readiness_status = 'approved' AND approval_source = 'taqadi_agent'
    AND approval_job_id = v_job.id AND approval_worker_id = BTRIM(p_worker_id)
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The exact filing memo was not approved by this worker'; END IF;
  v_amount := NULLIF(v_job.payload #>> '{case,amount}', '')::numeric;
  IF v_amount IS NULL OR v_amount <= 0 OR
     ROUND(v_amount, 2) IS DISTINCT FROM ROUND(NULLIF(v_snapshot.payload #>> '{customer,total_debt}', '')::numeric, 2) THEN
    RAISE EXCEPTION 'Approved memo and filing package amounts do not match';
  END IF;
  IF v_case.case_value IS DISTINCT FROM v_amount THEN
    UPDATE public.legal_cases SET case_value = v_amount, updated_at = now()
    WHERE id = v_case.id AND company_id = v_job.company_id;
    INSERT INTO public.legal_case_activities (
      case_id, company_id, activity_type, activity_title, activity_description, old_values, new_values, created_by
    ) VALUES (
      v_case.id, v_job.company_id, 'taqadi_claim_synchronized', 'مطابقة قيمة القضية مع الحزمة المعتمدة',
      'تم تحديث سجل القضية من نسخة المذكرة التي اعتمدها وكيل تقاضي، مع الاحتفاظ بفحوص الرفع.',
      jsonb_build_object('case_value', v_case.case_value),
      jsonb_build_object('case_value', v_amount, 'job_id', v_job.id, 'memo_snapshot_id', v_snapshot.id),
      v_job.requested_by
    );
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.sync_taqadi_approved_case_value_v1(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_taqadi_approved_case_value_v1(uuid,text) TO service_role;

-- Patch only the verified insertion points, preserving the deployed guards.
DO $patch$
DECLARE original text; anchor text; addition text;
BEGIN
  original := pg_get_functiondef('public.approve_taqadi_reviewed_legal_file_v1(uuid,text,jsonb)'::regprocedure);
  anchor := '  INSERT INTO public.taqadi_filing_job_events (';
  addition := E'  PERFORM public.sync_taqadi_approved_case_value_v1(v_job.id, p_worker_id);\n  IF public.legal_case_filing_block_reason_v1(v_job.company_id, v_job.legal_case_id, v_payload_claim) IS NOT NULL THEN\n    RAISE EXCEPTION ''The approved case did not pass the final filing readiness check'';\n  END IF;\n\n';
  IF (length(original) - length(replace(original, anchor, ''))) / length(anchor) <> 1 THEN
    RAISE EXCEPTION 'Approval function changed; review the migration';
  END IF;
  EXECUTE replace(original, anchor, addition || anchor);
  original := pg_get_functiondef('public.complete_taqadi_filing_job_v1(uuid,text,text,text,numeric,jsonb)'::regprocedure);
  anchor := E'  IF v_case.workflow_stage = ''preparation'' THEN';
  addition := E'    PERFORM public.sync_taqadi_approved_case_value_v1(v_job.id, p_worker_id);\n';
  IF (length(original) - length(replace(original, anchor, ''))) / length(anchor) <> 1 THEN
    RAISE EXCEPTION 'Completion function changed; review the migration';
  END IF;
  EXECUTE replace(original, anchor, anchor || E'\n' || addition);
END;
$patch$;
COMMIT;
