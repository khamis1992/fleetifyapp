-- Rollback: correct_vehicle_2773_police_station_contracts_20260830
-- Restores the single non-cancelled contract for vehicle 2773 and clears
-- the police-station operational correction markers. Financial rows were
-- never touched by the forward migration.

DO $$
DECLARE
  v_company CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID;
  v_vehicle CONSTANT UUID := 'bb7fa11f-b9f4-4492-82a4-002993abaedc'::UUID;
  v_reason CONSTANT TEXT := 'تصحيح تشغيلي معتمد بتاريخ 2026-08-30: المركبة 2773 موجودة حالياً في مركز الشرطة. آخر مستأجر فعلي هو حسام الدين إبراهيم ولم يُسجل في النظام بعد وسيتم تسجيله لاحقاً. ألغيت العقود القديمة المرتبطة بالمركبة دون تغيير الفواتير أو المخالفات أو القيود المحاسبية.';
BEGIN
  UPDATE public.contracts
  SET status='active',
      vehicle_status=NULL,
      vehicle_returned=NULL,
      suspension_reason=NULL,
      updated_at=now()
  WHERE company_id=v_company
    AND vehicle_id=v_vehicle
    AND suspension_reason=v_reason;

  UPDATE public.vehicles
  SET status='rented'::public.vehicle_status,
      location=NULL,
      notes=replace(replace(COALESCE(notes,''), E'\n[تصحيح تشغيلي 2773 - 2026-08-30] المركبة موجودة حالياً في مركز الشرطة. آخر مستأجر فعلي: حسام الدين إبراهيم (غير مسجل في النظام بعد؛ سيُسجل لاحقاً). جميع العقود القديمة على المركبة ملغاة.', ''), '[تصحيح تشغيلي 2773 - 2026-08-30] المركبة موجودة حالياً في مركز الشرطة. آخر مستأجر فعلي: حسام الدين إبراهيم (غير مسجل في النظام بعد؛ سيُسجل لاحقاً). جميع العقود القديمة على المركبة ملغاة.', ''),
      updated_at=now()
  WHERE id=v_vehicle AND company_id=v_company;
END $$;