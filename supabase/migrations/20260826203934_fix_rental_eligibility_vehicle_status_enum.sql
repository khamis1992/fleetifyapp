-- Compare enum-backed statuses as text before supplying an empty fallback.
-- Otherwise PostgreSQL attempts to cast '' to public.vehicle_status while
-- cancelling a legal case and reactivating its contract.
CREATE OR REPLACE FUNCTION public.trg_enforce_rental_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE v_vehicle_status text; v_count integer; v_total numeric;
BEGIN
  IF lower(COALESCE(NEW.status::text, '')) NOT IN ('active', 'pending', 'confirmed') OR NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'vehicle_reservations' AND NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'لا يمكن إنشاء الحجز دون اختيار عميل مسجل للتحقق من المخالفات' USING ERRCODE = 'P0001';
  END IF;
  SELECT lower(COALESCE(vehicle.status::text, '')) INTO v_vehicle_status
  FROM public.vehicles vehicle
  WHERE vehicle.id = NEW.vehicle_id AND vehicle.company_id = NEW.company_id;
  IF v_vehicle_status IN ('street_52', 'police_station', 'stolen') THEN
    RAISE EXCEPTION 'لا يمكن تأجير هذه المركبة لأنها محجوزة أو غير متاحة قانونياً (%)', v_vehicle_status USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*), COALESCE(sum(penalty.amount), 0) INTO v_count, v_total
  FROM public.penalties penalty
  WHERE penalty.company_id = NEW.company_id
    AND penalty.vehicle_id = NEW.vehicle_id
    AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed');
  IF v_count >= 3 OR v_total >= 500 THEN
    RAISE EXCEPTION 'لا يمكن تأجير هذه المركبة: عليها % مخالفة غير مسددة بإجمالي % ر.ق', v_count, trim(to_char(v_total, 'FM999G999G999G990D00')) USING ERRCODE = 'P0001';
  END IF;
  IF NEW.customer_id IS NOT NULL THEN
    SELECT count(*), COALESCE(sum(penalty.amount), 0) INTO v_count, v_total
    FROM public.penalties penalty
    WHERE penalty.company_id = NEW.company_id
      AND penalty.customer_id = NEW.customer_id
      AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed');
    IF v_count > 0 THEN
      RAISE EXCEPTION 'لا يمكن بدء الإيجار: العميل عليه % مخالفة غير مسددة بإجمالي % ر.ق', v_count, trim(to_char(v_total, 'FM999G999G999G990D00')) USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
