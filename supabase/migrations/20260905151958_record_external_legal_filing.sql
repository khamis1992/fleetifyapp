-- Records a user-attested external filing, independently of pre-submission approval.
-- Does not approve the legal profile or mark an automation job successful.
CREATE OR REPLACE FUNCTION public.record_external_legal_filing_v1(
 p_company_id uuid, p_case_id uuid, p_reference text, p_filing_date date
) RETURNS public.legal_cases
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_case public.legal_cases; v_actor uuid; v_ref text := btrim(p_reference);
BEGIN
 IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
   RAISE EXCEPTION 'غير مصرح بتسجيل الإيداع' USING ERRCODE='42501';
 END IF;
 v_actor := public.legal_workflow_actor_profile_v1(p_company_id, NULL);
 IF v_actor IS NULL THEN RAISE EXCEPTION 'تعذر تحديد الموظف المسؤول'; END IF;
 IF v_ref IS NULL OR length(v_ref) NOT BETWEEN 1 AND 200 THEN
   RAISE EXCEPTION 'أدخل رقم طلب الإيداع الصحيح';
 END IF;
 IF p_filing_date IS NULL OR p_filing_date > (now() AT TIME ZONE 'Asia/Qatar')::date THEN
   RAISE EXCEPTION 'أدخل تاريخ الإيداع الفعلي دون تاريخ مستقبلي';
 END IF;
 SELECT * INTO v_case FROM public.legal_cases
 WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'القضية غير موجودة'; END IF;
 IF v_case.workflow_stage = 'awaiting_acceptance'
    AND v_case.case_reference = v_ref AND v_case.filing_date = p_filing_date
    AND EXISTS(SELECT 1 FROM public.legal_case_activities WHERE case_id=p_case_id
      AND company_id=p_company_id AND new_values->>'source'='external_filing_attestation') THEN
   RETURN v_case;
 END IF;
 IF v_case.workflow_stage NOT IN ('preparation','filed') THEN
   RAISE EXCEPTION 'لا يمكن تسجيل الإيداع في المرحلة الحالية';
 END IF;
 IF nullif(btrim(v_case.case_reference),'') IS NOT NULL AND v_case.case_reference <> v_ref THEN
   RAISE EXCEPTION 'يوجد مرجع إيداع مختلف مسجل؛ راجع بيانات القضية';
 END IF;
 PERFORM id FROM public.taqadi_filing_jobs WHERE legal_case_id=p_case_id AND company_id=p_company_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.taqadi_filing_jobs WHERE legal_case_id=p_case_id AND company_id=p_company_id
   AND status NOT IN ('failed','cancelled','filed')) THEN
   RAISE EXCEPTION 'أوقف مهمة تقاضي الجارية قبل تسجيل الإيداع الخارجي';
 END IF;
 -- External deposit is a reported historical fact, not permission to submit.
 -- Keep existing readiness checks on ordinary transitions to filed intact.
 INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,
   activity_description,old_values,new_values,created_by)
 VALUES(p_case_id,p_company_id,'workflow_transition','تسجيل إيداع خارجي في تقاضي',
   'تأكيد الموظف إيداع الدعوى برقم الطلب وتاريخه',
   jsonb_build_object('workflow_stage',v_case.workflow_stage,'case_reference',v_case.case_reference,'filing_date',v_case.filing_date),
   jsonb_build_object('workflow_stage','awaiting_acceptance','case_reference',v_ref,'filing_date',p_filing_date,
     'source','external_filing_attestation','actor_user_id',auth.uid()),v_actor);
 UPDATE public.legal_cases SET workflow_stage='awaiting_acceptance',case_status='active',
   case_reference=v_ref,filing_date=p_filing_date,stage_updated_at=now(),updated_at=now()
 WHERE id=p_case_id AND company_id=p_company_id RETURNING * INTO v_case;
 UPDATE public.lawsuit_preparations SET status='submitted',taqadi_reference_number=v_ref,
   submitted_at=p_filing_date::timestamp AT TIME ZONE 'Asia/Qatar',updated_at=now()
 WHERE legal_case_id=p_case_id AND company_id=p_company_id;
 PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,'awaiting_acceptance');
 RETURN v_case;
END;
$$;
REVOKE ALL ON FUNCTION public.record_external_legal_filing_v1(uuid,uuid,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_external_legal_filing_v1(uuid,uuid,text,date) TO authenticated;
