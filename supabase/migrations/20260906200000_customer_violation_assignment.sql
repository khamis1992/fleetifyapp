BEGIN;

-- A preview never writes data. Ambiguous history is deliberately left for review.
CREATE OR REPLACE FUNCTION public.preview_customer_violation_assignments_v1(
  p_company_id uuid, p_ids uuid[] DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
      AND company_id = p_company_id AND COALESCE(is_active, true)
  ) THEN RAISE EXCEPTION 'غير مصرح بالوصول إلى بيانات هذه الشركة' USING ERRCODE = '42501'; END IF;

  WITH source AS (
    SELECT p.*, v.ids vehicle_ids FROM public.penalties p
    CROSS JOIN LATERAL (
      SELECT array_agg(v.id ORDER BY v.id) ids FROM public.vehicles v
      WHERE v.company_id = p_company_id AND (
        (p.vehicle_id IS NOT NULL AND v.id = p.vehicle_id) OR
        (p.vehicle_id IS NULL AND NULLIF(regexp_replace(upper(p.vehicle_plate), '\s', '', 'g'), '') IS NOT NULL
          AND regexp_replace(upper(v.plate_number), '\s', '', 'g') = regexp_replace(upper(p.vehicle_plate), '\s', '', 'g'))
      )
    ) v
    WHERE p.company_id = p_company_id AND p.customer_id IS NULL
      AND (p_ids IS NULL OR p.id = ANY(p_ids))
  ), matches AS (
    SELECT p.*, COALESCE(m.candidates, '[]'::jsonb) candidates,
      EXISTS (SELECT 1 FROM public.contract_amendments a
        JOIN public.contracts c ON c.id = a.contract_id AND c.company_id = p_company_id
        WHERE a.company_id = p_company_id AND a.status NOT IN ('rejected', 'cancelled')
          AND (a.original_values->>'vehicle_id' IS DISTINCT FROM a.new_values->>'vehicle_id')
          AND (a.original_values ? 'vehicle_id' OR a.new_values ? 'vehicle_id')
          AND (c.vehicle_id = ANY(p.vehicle_ids) OR a.original_values->>'vehicle_id' = ANY(p.vehicle_ids::text[])
            OR a.new_values->>'vehicle_id' = ANY(p.vehicle_ids::text[]))
      ) changed_vehicle,
      EXISTS (SELECT 1 FROM public.invoices i WHERE i.company_id = p_company_id AND i.penalty_id = p.id
          AND COALESCE(i.status::text, '') NOT IN ('cancelled', 'canceled', 'void', 'voided'))
      OR EXISTS (SELECT 1 FROM public.traffic_violation_payments pay WHERE pay.company_id = p_company_id
          AND pay.traffic_violation_id = p.id AND pay.status <> 'cancelled') financial_document
    FROM source p
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('contract_id', c.id, 'contract_number', c.contract_number,
        'customer_id', c.customer_id, 'customer_name', COALESCE(NULLIF(cu.company_name, ''),
          NULLIF(trim(concat_ws(' ', cu.first_name_ar, cu.last_name_ar)), ''),
          NULLIF(trim(concat_ws(' ', cu.first_name, cu.last_name)), ''), 'عميل'),
        'start_date', c.start_date, 'end_date', c.end_date, 'status', c.status,
        'version', md5(to_jsonb(c)::text),
        'return_review', EXISTS (SELECT 1 FROM public.contract_vehicle_returns r
          WHERE r.company_id = p_company_id AND r.contract_id = c.id AND r.vehicle_id = ANY(p.vehicle_ids)
            AND r.status <> 'rejected' AND r.return_date <= p.penalty_date)
      ) ORDER BY c.id) candidates
      FROM public.contracts c JOIN public.customers cu ON cu.id = c.customer_id AND cu.company_id = p_company_id
      WHERE c.company_id = p_company_id AND c.vehicle_id = ANY(p.vehicle_ids)
        AND p.penalty_date BETWEEN c.start_date AND c.end_date
    ) m
  ), classified AS (
    SELECT m.*, CASE
      WHEN COALESCE(status, '') NOT IN ('pending', 'confirmed') THEN 'حالة المخالفة لا تسمح بالإسناد'
      WHEN COALESCE(payment_status, '') <> 'unpaid' OR COALESCE(paid_by_company, false)
        OR COALESCE(customer_payment_status, 'unpaid') NOT IN ('unpaid', 'pending')
        THEN 'توجد تسوية أو بيانات سداد تحتاج مراجعة'
      WHEN responsibility_party = 'company' OR responsible_customer_id IS NOT NULL THEN 'سبق تحديد المسؤولية؛ تحتاج مراجعة منفصلة'
      WHEN financial_document THEN 'مرتبطة بمستند مالي؛ راجع المستند قبل تغيير العميل'
      WHEN penalty_date IS NULL THEN 'تاريخ المخالفة غير محدد'
      WHEN COALESCE(cardinality(vehicle_ids), 0) = 0 THEN 'لم يتم العثور على المركبة'
      WHEN cardinality(vehicle_ids) > 1 THEN 'رقم اللوحة مطابق لأكثر من مركبة'
      WHEN vehicle_id IS NOT NULL AND NULLIF(trim(vehicle_plate), '') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.company_id = p_company_id
          AND regexp_replace(upper(v.plate_number), '\s', '', 'g') = regexp_replace(upper(vehicle_plate), '\s', '', 'g')
      ) THEN 'اللوحة لا تطابق المركبة المسجلة؛ راجع بيانات المخالفة'
      WHEN changed_vehicle THEN 'يوجد تبديل مركبة؛ راجع سجل التسليم والاستلام'
      WHEN jsonb_array_length(candidates) = 0 THEN 'لا يوجد عقد يغطي تاريخ المخالفة'
      WHEN jsonb_array_length(candidates) > 1 THEN 'توجد عقود متداخلة في تاريخ المخالفة'
      WHEN candidates->0->>'status' NOT IN ('active', 'expired', 'completed', 'under_legal_procedure') THEN 'حالة العقد تحتاج مراجعة قبل الإسناد'
      WHEN (candidates->0->>'return_review')::boolean THEN 'المخالفة في يوم الإرجاع أو بعده؛ راجع وقت الاستلام'
      WHEN contract_id IS NOT NULL AND contract_id::text <> candidates->0->>'contract_id' THEN 'العقد المسجل يختلف عن العقد المطابق'
      ELSE NULL END review_reason
    FROM matches m
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'penalty_number', penalty_number, 'penalty_date', penalty_date,
    'amount', amount, 'vehicle_plate', vehicle_plate, 'vehicle_id', vehicle_ids[1],
    'candidates', candidates, 'ready', review_reason IS NULL,
    'reason', COALESCE(review_reason, 'عقد واحد يغطي تاريخ المخالفة للمركبة نفسها'),
    'token', md5(to_jsonb(classified)::text)
  ) ORDER BY penalty_date DESC, id), '[]'::jsonb) INTO v_result FROM classified;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_customer_violations_v1(p_company_id uuid, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item jsonb; v_preview jsonb; v_row jsonb; v_old public.penalties%ROWTYPE; v_ids uuid[]; v_count integer := 0;
BEGIN
  -- Same company membership as the existing penalties write policy, including active membership.
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
    AND company_id = p_company_id AND COALESCE(is_active, true)) THEN
    RAISE EXCEPTION 'غير مصرح بالإسناد لهذه الشركة' USING ERRCODE = '42501'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'قائمة الإسناد غير صحيحة'; END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'اختر من 1 إلى 50 مخالفة في كل دفعة'; END IF;
  SELECT array_agg((x->>'id')::uuid) INTO v_ids FROM jsonb_array_elements(p_items) x;
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) x) <> cardinality(v_ids) THEN RAISE EXCEPTION 'معرفات مكررة أو غير صحيحة'; END IF;

  -- Lock parent rows too: contract edits and new FK-backed histories cannot race the validation.
  PERFORM id FROM public.vehicles WHERE company_id = p_company_id ORDER BY id FOR UPDATE;
  PERFORM id FROM public.contracts WHERE company_id = p_company_id ORDER BY id FOR UPDATE;
  PERFORM contract_id FROM public.contract_amendments WHERE company_id = p_company_id ORDER BY contract_id FOR UPDATE;
  PERFORM contract_id FROM public.contract_vehicle_returns WHERE company_id = p_company_id ORDER BY contract_id FOR UPDATE;
  PERFORM id FROM public.penalties WHERE company_id = p_company_id AND id = ANY(v_ids) ORDER BY id FOR UPDATE;
  PERFORM penalty_id FROM public.invoices WHERE company_id = p_company_id AND penalty_id = ANY(v_ids) ORDER BY penalty_id FOR UPDATE;
  PERFORM traffic_violation_id FROM public.traffic_violation_payments WHERE company_id = p_company_id
    AND traffic_violation_id = ANY(v_ids) ORDER BY traffic_violation_id FOR UPDATE;
  v_preview := public.preview_customer_violation_assignments_v1(p_company_id, v_ids);
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT value INTO v_row FROM jsonb_array_elements(v_preview) WHERE value->>'id' = v_item->>'id';
    IF v_row IS NULL OR NOT (v_row->>'ready')::boolean OR v_row->>'token' IS DISTINCT FROM v_item->>'token' THEN
      RAISE EXCEPTION 'تغيرت بيانات إحدى المخالفات أو العقود. حدّث المعاينة وأعد الاختيار.'; END IF;
    SELECT * INTO STRICT v_old FROM public.penalties WHERE id = (v_item->>'id')::uuid AND company_id = p_company_id;
    UPDATE public.penalties SET customer_id = (v_row->'candidates'->0->>'customer_id')::uuid,
      contract_id = (v_row->'candidates'->0->>'contract_id')::uuid, vehicle_id = (v_row->>'vehicle_id')::uuid,
      responsibility_party = 'customer', responsible_customer_id = (v_row->'candidates'->0->>'customer_id')::uuid,
      responsibility_reason = v_row->>'reason', responsibility_decided_at = now(), responsibility_decided_by = auth.uid()
    WHERE id = v_old.id AND company_id = p_company_id;
    INSERT INTO public.audit_logs(company_id,user_id,action,resource_type,resource_id,old_values,new_values)
      VALUES(p_company_id,auth.uid(),'customer_violation_assignment','penalties',v_old.id,to_jsonb(v_old),
        jsonb_build_object('customer_id',v_row->'candidates'->0->>'customer_id',
          'contract_id',v_row->'candidates'->0->>'contract_id','vehicle_id',v_row->>'vehicle_id','reason',v_row->>'reason'));
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('assigned', v_count);
END;
$$;
REVOKE ALL ON FUNCTION public.preview_customer_violation_assignments_v1(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_customer_violations_v1(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_customer_violation_assignments_v1(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_customer_violations_v1(uuid, jsonb) TO authenticated;
COMMIT;
