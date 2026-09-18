BEGIN;

DROP TRIGGER IF EXISTS trg_00_resolve_and_guard_contract_vehicle_identity ON public.contracts;
DROP FUNCTION IF EXISTS public.resolve_and_guard_contract_vehicle_identity();

-- Restore the two pre-repair legacy triggers. The canonical trigger remains.
CREATE TRIGGER on_contract_active_sync_vehicle
AFTER INSERT OR UPDATE OF status ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_status_on_contract_active();

CREATE TRIGGER update_vehicle_status_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_status_from_contract();

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_row record;
BEGIN
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  PERFORM set_config('fleetify.vehicle_identity_repair', 'on', true);

  FOR v_row IN
    SELECT history.contract_id AS canonical_id,
           history.old_contract_number AS external_number,
           history.new_contract_number AS canonical_number
    FROM public.contract_number_history history
    JOIN public.contracts canonical ON canonical.id = history.contract_id
    WHERE canonical.company_id = v_company_id
      AND history.old_contract_number IN (
        'LTO20242', 'LTO202416', 'LTO2024280', 'LTO202450',
        'LTO202497', 'LTO202445'
      )
  LOOP
    UPDATE public.contracts external
    SET status = 'active',
        sub_status = NULL,
        suspension_reason = NULL,
        updated_at = now()
    WHERE external.company_id = v_company_id
      AND external.contract_number = v_row.external_number
      AND external.status = 'cancelled'
      AND external.sub_status = 'duplicate_merged';

    UPDATE public.contract_payment_schedules schedule
    SET status = CASE
          WHEN schedule.due_date < date_trunc('month', current_date)::date
            THEN 'overdue'
          ELSE 'pending'
        END,
        notes = NULL,
        updated_at = now()
    FROM public.contracts external
    WHERE external.company_id = v_company_id
      AND external.contract_number = v_row.external_number
      AND schedule.company_id = external.company_id
      AND schedule.contract_id = external.id
      AND schedule.notes = 'Cancelled by contract_vehicle_identity_integrity_repair; canonical contract '
          || v_row.canonical_number;
  END LOOP;

  DELETE FROM public.contract_amendments amendment
  WHERE amendment.company_id = v_company_id
    AND amendment.changes_summary ->> 'source'
        = 'contract_vehicle_identity_integrity_repair';

  DELETE FROM public.contract_number_history history
  USING public.contracts canonical
  WHERE canonical.id = history.contract_id
    AND canonical.company_id = v_company_id
    AND history.old_contract_number IN (
      'LTO20242', 'LTO202416', 'LTO2024280', 'LTO202450',
      'LTO202497', 'LTO202445'
    );
END;
$rollback$;

-- Restore the prior eligibility function without the migration-only bypass.
CREATE OR REPLACE FUNCTION public.trg_enforce_rental_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE v_vehicle_status text; v_count integer; v_total numeric;
BEGIN
  IF TG_TABLE_NAME = 'contracts'
     AND TG_OP = 'UPDATE'
     AND lower(COALESCE(OLD.status::text, '')) = 'under_legal_procedure'
     AND lower(COALESCE(NEW.status::text, '')) = 'active'
     AND NEW.vehicle_id IS NOT DISTINCT FROM OLD.vehicle_id
     AND NEW.customer_id IS NOT DISTINCT FROM OLD.customer_id
     AND NOT EXISTS (
       SELECT 1 FROM public.legal_cases legal_case
       WHERE legal_case.company_id = NEW.company_id
         AND legal_case.contract_id = NEW.id
         AND lower(COALESCE(legal_case.case_status, '')) IN (
           'open', 'active', 'pending', 'on_hold', 'under_review'
         )
     )
  THEN
    RETURN NEW;
  END IF;
  IF lower(COALESCE(NEW.status::text, '')) NOT IN ('active', 'pending', 'confirmed')
     OR NEW.vehicle_id IS NULL
  THEN
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
$function$;

DROP FUNCTION IF EXISTS public.normalize_vehicle_plate(text);

COMMIT;
