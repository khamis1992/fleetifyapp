do $$
declare
  v_company constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_vehicle constant uuid := 'bb7fa11f-b9f4-4492-82a4-002993abaedc'::uuid;
  v_contract_count integer;
  v_reason constant text := 'تصحيح تشغيلي معتمد بتاريخ 2026-08-30: المركبة 2773 موجودة حالياً في مركز الشرطة. آخر مستأجر فعلي هو حسام الدين إبراهيم ولم يُسجل في النظام بعد وسيتم تسجيله لاحقاً. ألغيت العقود القديمة المرتبطة بالمركبة دون تغيير الفواتير أو المخالفات أو القيود المحاسبية.';
begin
  perform 1
  from public.vehicles
  where id=v_vehicle
    and company_id=v_company
    and plate_number='2773'
    and registration_number='2773'
  for update;
  if not found then
    raise exception 'تعذر مطابقة المركبة 2773 داخل الشركة';
  end if;

  select count(*) into v_contract_count
  from public.contracts
  where company_id=v_company
    and vehicle_id=v_vehicle
    and lower(coalesce(status,'')) not in ('cancelled','canceled');

  if v_contract_count <> 1 then
    raise exception 'توقع عقداً واحداً غير ملغى على المركبة 2773، لكن العدد الفعلي هو %', v_contract_count;
  end if;

  update public.contracts
  set status='cancelled',
      vehicle_status='police_station',
      vehicle_returned=false,
      suspension_reason=v_reason,
      updated_at=now()
  where company_id=v_company
    and vehicle_id=v_vehicle
    and lower(coalesce(status,'')) not in ('cancelled','canceled');

  update public.vehicles
  set status='police_station'::public.vehicle_status,
      location='مركز الشرطة',
      notes=case
        when coalesce(notes,'') like '%[تصحيح تشغيلي 2773 - 2026-08-30]%'
          then notes
        else concat_ws(
          E'\n',
          nullif(notes,''),
          '[تصحيح تشغيلي 2773 - 2026-08-30] المركبة موجودة حالياً في مركز الشرطة. آخر مستأجر فعلي: حسام الدين إبراهيم (غير مسجل في النظام بعد؛ سيُسجل لاحقاً). جميع العقود القديمة على المركبة ملغاة.'
        )
      end,
      updated_at=now()
  where id=v_vehicle and company_id=v_company;
end $$;