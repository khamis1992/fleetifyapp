DO $correct$
DECLARE
  v_case_id uuid;
BEGIN
  SELECT lc.id INTO v_case_id
  FROM public.legal_cases lc
  WHERE lc.company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
    AND lc.case_number='CASE-26-0031'
    AND lc.workflow_stage='filed'
    AND lc.case_status='active'
    AND lc.outcome_type='won'
    AND EXISTS (
      SELECT 1 FROM public.legal_case_activities a
      WHERE a.case_id=lc.id
        AND a.activity_type='judgment_recorded'
        AND a.created_at < '2026-08-26 22:05:40.765321+00'::timestamptz
    )
  FOR UPDATE;

  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Safety check failed for CASE-26-0031 stage correction';
  END IF;

  UPDATE public.legal_cases
  SET workflow_stage='judgment_issued',case_status='active',
      stage_updated_at=now(),updated_at=now()
  WHERE id=v_case_id;

  UPDATE public.legal_case_activities
  SET new_values=jsonb_set(new_values,'{workflow_stage}','"judgment_issued"'::jsonb)
  WHERE case_id=v_case_id
    AND activity_type='cancellation_reversed'
    AND new_values->>'source'='restore_cancelled_legal_cases_20260827';

  INSERT INTO public.legal_case_activities(
    case_id,company_id,activity_type,activity_title,activity_description,new_values,created_by
  ) VALUES (
    v_case_id,'24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
    'restoration_stage_corrected','تصحيح مرحلة الاستعادة',
    'تم اعتماد مرحلة صدور الحكم لأنها أحدث من انتقال القضية السابق إلى مرحلة الرفع',
    jsonb_build_object('workflow_stage','judgment_issued',
      'source','restore_cancelled_legal_cases_20260827'),
    '320f8030-ee98-4f9f-bab8-7341e80cd588'::uuid
  );
END
$correct$;
