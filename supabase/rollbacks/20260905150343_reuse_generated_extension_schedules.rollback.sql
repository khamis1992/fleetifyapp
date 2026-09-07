BEGIN;
CREATE OR REPLACE FUNCTION public.amend_contract_vehicle_and_extension_atomic(p_company_id uuid, p_contract_id uuid, p_expected_updated_at timestamp with time zone, p_vehicle_id uuid, p_end_date date, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_after public.contracts%ROWTYPE;
  v_vehicle public.vehicles%ROWTYPE;
  v_amendment_id uuid;
  v_month date;
  v_added_months integer;
  v_amount numeric;
  v_invoice_id uuid;
  v_schedule_id uuid;
  v_installment integer;
  v_guard text := current_setting('fleetify.atomic_contract_creation', true);
BEGIN
  IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id
     OR NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()
       AND r.role::text IN ('company_admin', 'manager', 'super_admin')) THEN
    RAISE EXCEPTION 'صلاحية مدير الشركة مطلوبة لتعديل العقد' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_contract FROM public.contracts
  WHERE id = p_contract_id AND company_id = p_company_id FOR UPDATE;
  IF NOT FOUND OR p_expected_updated_at IS NULL
     OR v_contract.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'تغير العقد؛ أعد تحميله قبل حفظ التعديل' USING ERRCODE = '40001';
  END IF;
  IF v_contract.status <> 'active' OR v_contract.monthly_amount <= 0 THEN
    RAISE EXCEPTION 'هذا التعديل متاح للعقود النشطة ذات الإيجار الشهري';
  END IF;
  IF p_end_date IS NULL OR p_end_date < v_contract.end_date THEN
    RAISE EXCEPTION 'تقليص المدة يحتاج تسوية مالية؛ اختر تاريخ انتهاء لا يسبق التاريخ الحالي';
  END IF;
  -- Serialize competing assignments to the destination vehicle.
  SELECT * INTO v_vehicle FROM public.vehicles
  WHERE id = p_vehicle_id AND company_id = p_company_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'المركبة غير موجودة أو غير نشطة في الشركة'; END IF;
  IF v_vehicle.status IN ('street_52', 'police_station', 'stolen') THEN
    RAISE EXCEPTION 'المركبة محجوزة أو مسروقة ولا يمكن تأجيرها';
  END IF;
  v_added_months := (extract(year from p_end_date)::int - extract(year from v_contract.end_date)::int) * 12
    + extract(month from p_end_date)::int - extract(month from v_contract.end_date)::int;
  v_amount := round(v_contract.contract_amount + v_added_months * v_contract.monthly_amount, 2);
  INSERT INTO public.contract_amendments (
    company_id, contract_id, amendment_number, amendment_type, amendment_reason,
    original_values, new_values, amount_difference, requires_payment_adjustment,
    status, created_by, approved_by, approved_at, effective_date
  ) VALUES (
    p_company_id, p_contract_id, public.generate_amendment_number(p_company_id, p_contract_id),
    CASE WHEN v_added_months > 0 THEN 'extend_duration' ELSE 'change_vehicle' END,
    'تعديل المركبة أو تمديد المدة من شاشة تعديل العقد',
    jsonb_build_object('vehicle_id', v_contract.vehicle_id, 'end_date', v_contract.end_date,
      'contract_amount', v_contract.contract_amount, 'description', v_contract.description),
    jsonb_build_object('vehicle_id', p_vehicle_id, 'end_date', p_end_date,
      'contract_amount', v_amount, 'description', p_description),
    v_amount - v_contract.contract_amount, v_added_months > 0,
    'approved', auth.uid(), auth.uid(), now(), CURRENT_DATE
  ) RETURNING id INTO v_amendment_id;
  PERFORM set_config('fleetify.manager_vehicle_amendment', p_contract_id::text, true);
  PERFORM set_config('fleetify.manager_vehicle_amendment_company', p_company_id::text, true);
  PERFORM set_config('fleetify.manager_vehicle_amendment_vehicle', p_vehicle_id::text, true);
  PERFORM set_config('fleetify.manager_vehicle_amendment_actor', auth.uid()::text, true);
  PERFORM public.apply_contract_amendment(v_amendment_id);
  PERFORM set_config('fleetify.manager_vehicle_amendment', '', true);
  UPDATE public.contracts SET license_plate = v_vehicle.plate_number
  WHERE id = p_contract_id AND company_id = p_company_id;

  v_month := (date_trunc('month', v_contract.end_date) + interval '1 month')::date;
  SELECT COALESCE(max(installment_number), 0) INTO v_installment
  FROM public.contract_payment_schedules WHERE contract_id = p_contract_id AND company_id = p_company_id;
  WHILE v_month <= date_trunc('month', p_end_date)::date LOOP
    IF EXISTS (SELECT 1 FROM public.contract_payment_schedules s
      WHERE s.company_id = p_company_id AND s.contract_id = p_contract_id
        AND date_trunc('month', s.due_date)::date = v_month
        AND lower(COALESCE(s.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive')) THEN
      RAISE EXCEPTION 'يوجد قسط سابق خارج مدة العقد للشهر %؛ راجع الجدول قبل التمديد', v_month;
    END IF;
    v_installment := v_installment + 1;
    INSERT INTO public.contract_payment_schedules
      (company_id, contract_id, installment_number, due_date, amount, status, paid_amount, created_by, description)
    VALUES (p_company_id, p_contract_id, v_installment, v_month, v_contract.monthly_amount,
      'pending', 0, auth.uid(), 'تمديد العقد - ' || to_char(v_month, 'YYYY-MM'))
    RETURNING id INTO v_schedule_id;
    v_invoice_id := public.generate_invoice_for_contract_month(p_contract_id, v_month);
    IF v_invoice_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.invoices i
      WHERE i.id = v_invoice_id AND i.company_id = p_company_id AND i.contract_id = p_contract_id
        AND abs(i.total_amount - v_contract.monthly_amount) < 0.01
        AND i.penalty_id IS NULL AND upper(COALESCE(i.invoice_number, '')) NOT LIKE 'TV-%'
        AND i.due_date = v_month AND i.invoice_month = v_month
        AND lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive')) THEN
      RAISE EXCEPTION 'تعذر التحقق من فاتورة شهر التمديد %', v_month;
    END IF;
    UPDATE public.contract_payment_schedules SET invoice_id = v_invoice_id
    WHERE id = v_schedule_id AND company_id = p_company_id;
    v_month := (v_month + interval '1 month')::date;
  END LOOP;
  PERFORM set_config('fleetify.atomic_contract_creation', COALESCE(v_guard, ''), true);
  SELECT * INTO v_after FROM public.contracts WHERE id = p_contract_id AND company_id = p_company_id;
  IF v_after.vehicle_id IS DISTINCT FROM p_vehicle_id OR v_after.end_date IS DISTINCT FROM p_end_date
     OR abs(v_after.contract_amount - v_amount) > 0.01 THEN
    RAISE EXCEPTION 'لم تتطابق نتيجة تعديل العقد مع القيم المطلوبة';
  END IF;
  RETURN jsonb_build_object('success', true, 'contract_id', p_contract_id,
    'amendment_id', v_amendment_id, 'vehicle_id', v_after.vehicle_id,
    'end_date', v_after.end_date, 'contract_amount', v_after.contract_amount,
    'updated_at', v_after.updated_at, 'added_months', v_added_months);
END;
$function$;
COMMIT;
