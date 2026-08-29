-- Repair active contract/vehicle identity drift and prevent recurrence.
--
-- The repair distinguishes canonical financial contracts from document-only
-- desktop imports. Six imported LTO rows duplicate an existing billable rental;
-- they are retained as cancelled aliases with their signed documents intact.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_vehicle_plate(p_plate text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO ''
AS $function$
  SELECT upper(regexp_replace(
    translate(
      COALESCE(p_plate, ''),
      '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
      '01234567890123456789'
    ),
    '[^0-9A-Za-z]',
    '',
    'g'
  ));
$function$;

REVOKE ALL ON FUNCTION public.normalize_vehicle_plate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_vehicle_plate(text) TO authenticated, service_role;

-- Permit only a privileged, transaction-local historical identity repair to
-- bypass new-rental eligibility checks. Browser/authenticator sessions cannot
-- activate this path even if they set the same custom GUC.
CREATE OR REPLACE FUNCTION public.trg_enforce_rental_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE v_vehicle_status text; v_count integer; v_total numeric;
BEGIN
  IF COALESCE(current_setting('fleetify.vehicle_identity_repair', true), '') = 'on'
     AND session_user IN ('postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'contracts'
     AND TG_OP = 'UPDATE'
     AND lower(COALESCE(OLD.status::text, '')) = 'under_legal_procedure'
     AND lower(COALESCE(NEW.status::text, '')) = 'active'
     AND NEW.vehicle_id IS NOT DISTINCT FROM OLD.vehicle_id
     AND NEW.customer_id IS NOT DISTINCT FROM OLD.customer_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.legal_cases legal_case
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
    RAISE EXCEPTION 'لا يمكن إنشاء الحجز دون اختيار عميل مسجل للتحقق من المخالفات'
      USING ERRCODE = 'P0001';
  END IF;
  SELECT lower(COALESCE(vehicle.status::text, '')) INTO v_vehicle_status
  FROM public.vehicles vehicle
  WHERE vehicle.id = NEW.vehicle_id AND vehicle.company_id = NEW.company_id;
  IF v_vehicle_status IN ('street_52', 'police_station', 'stolen') THEN
    RAISE EXCEPTION 'لا يمكن تأجير هذه المركبة لأنها محجوزة أو غير متاحة قانونياً (%)', v_vehicle_status
      USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*), COALESCE(sum(penalty.amount), 0) INTO v_count, v_total
  FROM public.penalties penalty
  WHERE penalty.company_id = NEW.company_id
    AND penalty.vehicle_id = NEW.vehicle_id
    AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed');
  IF v_count >= 3 OR v_total >= 500 THEN
    RAISE EXCEPTION 'لا يمكن تأجير هذه المركبة: عليها % مخالفة غير مسددة بإجمالي % ر.ق', v_count, trim(to_char(v_total, 'FM999G999G999G990D00'))
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.customer_id IS NOT NULL THEN
    SELECT count(*), COALESCE(sum(penalty.amount), 0) INTO v_count, v_total
    FROM public.penalties penalty
    WHERE penalty.company_id = NEW.company_id
      AND penalty.customer_id = NEW.customer_id
      AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed');
    IF v_count > 0 THEN
      RAISE EXCEPTION 'لا يمكن بدء الإيجار: العميل عليه % مخالفة غير مسددة بإجمالي % ر.ق', v_count, trim(to_char(v_total, 'FM999G999G999G990D00'))
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DO $repair$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_pair_count integer;
  v_candidate_count integer;
  v_row record;
BEGIN
  CREATE TEMP TABLE contract_alias_merge_map (
    external_number text PRIMARY KEY,
    canonical_number text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO contract_alias_merge_map (external_number, canonical_number) VALUES
    ('LTO20242', 'C-ALF-0083'),
    ('LTO202416', 'C-ALF-0033'),
    ('LTO2024280', 'C-ALF-0051'),
    ('LTO202450', 'C-ALF-0066'),
    ('LTO202497', 'C-ALF-0104'),
    ('LTO202445', 'C-ALF-0106');

  SELECT count(*) INTO v_pair_count
  FROM contract_alias_merge_map map
  JOIN public.contracts external
    ON external.company_id = v_company_id
   AND external.contract_number = map.external_number
   AND external.status = 'active'
   AND external.created_via = 'desktop_folder_import'
  JOIN public.contracts canonical
    ON canonical.company_id = external.company_id
   AND canonical.contract_number = map.canonical_number
   AND canonical.status IN ('active', 'under_legal_procedure')
   AND canonical.vehicle_id IS NOT NULL
   AND external.vehicle_id = canonical.vehicle_id
   AND canonical.start_date = external.start_date
  JOIN public.vehicles vehicle
    ON vehicle.id = canonical.vehicle_id
   AND vehicle.company_id = canonical.company_id
   AND public.normalize_vehicle_plate(vehicle.plate_number)
       = public.normalize_vehicle_plate(external.license_plate)
  JOIN public.customers external_customer ON external_customer.id = external.customer_id
  JOIN public.customers canonical_customer ON canonical_customer.id = canonical.customer_id
  WHERE lower(regexp_replace(
          concat_ws('', external_customer.first_name, external_customer.last_name),
          '[^[:alnum:]]', '', 'g'
        )) = lower(regexp_replace(
          concat_ws('', canonical_customer.first_name, canonical_customer.last_name),
          '[^[:alnum:]]', '', 'g'
        ))
    AND NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.contract_id = external.id)
    AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.contract_id = external.id)
    AND NOT EXISTS (SELECT 1 FROM public.legal_cases lc WHERE lc.contract_id = external.id)
    AND NOT EXISTS (SELECT 1 FROM public.delinquent_customers dc WHERE dc.contract_id = external.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.penalties penalty
      WHERE penalty.contract_id = external.id
        AND lower(COALESCE(penalty.status, '')) NOT IN (
          'handled', 'resolved', 'waived', 'transferred', 'cancelled',
          'canceled', 'void', 'voided'
        )
    );

  IF v_pair_count <> 6 THEN
    RAISE EXCEPTION 'Expected 6 proven document-only contract aliases, found %', v_pair_count;
  END IF;

  FOR v_row IN
    SELECT external.*, canonical.id AS canonical_id,
           canonical.contract_number AS canonical_number
    FROM contract_alias_merge_map map
    JOIN public.contracts external
      ON external.company_id = v_company_id
     AND external.contract_number = map.external_number
    JOIN public.contracts canonical
      ON canonical.company_id = v_company_id
     AND canonical.contract_number = map.canonical_number
    ORDER BY external.contract_number
  LOOP
    INSERT INTO public.contract_number_history (
      contract_id, old_contract_number, new_contract_number
    )
    SELECT v_row.canonical_id, v_row.contract_number, v_row.canonical_number
    WHERE NOT EXISTS (
      SELECT 1 FROM public.contract_number_history history
      WHERE history.contract_id = v_row.canonical_id
        AND history.old_contract_number = v_row.contract_number
        AND history.new_contract_number = v_row.canonical_number
    );

    INSERT INTO public.contract_amendments (
      company_id, contract_id, amendment_number, amendment_type,
      amendment_reason, original_values, new_values, changes_summary,
      amount_difference, requires_payment_adjustment, status, approved_at,
      approval_notes, requires_customer_signature, customer_signed,
      effective_date, applied_at
    ) VALUES (
      v_company_id,
      v_row.canonical_id,
      v_row.canonical_number || '-IDENTITY-' || v_row.contract_number,
      'other',
      'دمج هوية عقد مستورد من المستندات مع العقد المالي المرجعي بعد إثبات تطابق العميل والمركبة وتاريخ البداية وعدم وجود حركة مالية مستقلة.',
      jsonb_build_object('external_contract_number', NULL),
      jsonb_build_object(
        'external_contract_number', v_row.contract_number,
        'external_contract_id', v_row.id
      ),
      jsonb_build_object(
        'source', 'contract_vehicle_identity_integrity_repair',
        'external_contract_number', v_row.contract_number,
        'canonical_contract_number', v_row.canonical_number,
        'signed_documents_retained_on_alias', true
      ),
      0, false, 'approved', now(),
      'اعتماد تقني لهوية بديلة فقط؛ لم تُنقل أو تُضاعف الفواتير أو الدفعات أو المديونية.',
      false, false, current_date, now()
    ) ON CONFLICT (company_id, amendment_number) DO NOTHING;

    UPDATE public.contract_payment_schedules schedule
    SET status = 'cancelled',
        notes = 'Cancelled by contract_vehicle_identity_integrity_repair; canonical contract '
          || v_row.canonical_number,
        updated_at = now()
    WHERE schedule.company_id = v_company_id
      AND schedule.contract_id = v_row.id
      AND COALESCE(schedule.paid_amount, 0) = 0
      AND schedule.paid_date IS NULL
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );

    UPDATE public.contracts external
    SET status = 'cancelled',
        sub_status = 'duplicate_merged',
        suspension_reason = 'Document-only alias retained for '
          || v_row.canonical_number || '; see contract_number_history',
        updated_at = now()
    WHERE external.id = v_row.id
      AND external.company_id = v_company_id
      AND external.status = 'active';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Alias contract % changed concurrently', v_row.contract_number;
    END IF;
  END LOOP;

  CREATE TEMP TABLE contract_vehicle_backfill_candidates ON COMMIT DROP AS
  SELECT contract.id AS contract_id, contract.company_id, vehicle.id AS vehicle_id,
         contract.contract_number, contract.license_plate, contract.updated_at AS linked_at
  FROM public.contracts contract
  JOIN LATERAL (
    SELECT (array_agg(candidate.id ORDER BY candidate.id))[1] AS id,
           count(*) AS match_count
    FROM public.vehicles candidate
    WHERE candidate.company_id = contract.company_id
      AND candidate.is_active = true
      AND public.normalize_vehicle_plate(candidate.plate_number)
          = public.normalize_vehicle_plate(contract.license_plate)
  ) matched ON matched.match_count = 1
  JOIN public.vehicles vehicle ON vehicle.id = matched.id
  WHERE contract.company_id = v_company_id
    AND contract.status = 'active'
    AND contract.created_via = 'desktop_folder_import'
    AND contract.vehicle_id = vehicle.id
    AND public.normalize_vehicle_plate(contract.license_plate) <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.contracts occupied
      WHERE occupied.company_id = contract.company_id
        AND occupied.vehicle_id = vehicle.id
        AND (
          occupied.status IN ('active', 'pending', 'confirmed')
          OR (occupied.status = 'under_legal_procedure'
              AND COALESCE(occupied.vehicle_returned, false) = false)
        )
        AND occupied.id <> contract.id
        AND daterange(
          COALESCE(occupied.start_date, '-infinity'::date),
          COALESCE(occupied.end_date, 'infinity'::date), '[]'
        ) && daterange(
          COALESCE(contract.start_date, '-infinity'::date),
          COALESCE(contract.end_date, 'infinity'::date), '[]'
        )
    );

  SELECT count(*) INTO v_candidate_count FROM contract_vehicle_backfill_candidates;
  IF v_candidate_count <> 29 THEN
    RAISE EXCEPTION 'Expected 29 unambiguous non-overlapping vehicle links, found %', v_candidate_count;
  END IF;

  INSERT INTO public.contract_amendments (
    company_id, contract_id, amendment_number, amendment_type,
    amendment_reason, original_values, new_values, changes_summary,
    amount_difference, requires_payment_adjustment, status, approved_at,
    approval_notes, requires_customer_signature, customer_signed,
    effective_date
  )
  SELECT candidate.company_id, candidate.contract_id,
    candidate.contract_number || '-VEHICLE-LINK-20260827',
    'other',
    'اعتماد تدقيقي لرابط مركبة طبقه النظام آلياً بعد تطابق لوحة وحيد داخل الشركة وعدم وجود عقد متداخل على المركبة.',
    jsonb_build_object('vehicle_id', candidate.vehicle_id),
    jsonb_build_object('vehicle_id', candidate.vehicle_id),
    jsonb_build_object(
      'source', 'contract_vehicle_identity_integrity_repair',
      'plate_match', candidate.license_plate,
      'audit_backfill', true,
      'link_already_applied_at', candidate.linked_at
    ),
    0, false, 'approved', now(),
    'تصحيح هوية بيانات فقط بلا تغيير مالي أو زمني.',
    false, false, current_date
  FROM contract_vehicle_backfill_candidates candidate
  ON CONFLICT (company_id, amendment_number) DO NOTHING;

  UPDATE public.contract_amendments amendment
  SET applied_at = now(), updated_at = now()
  FROM contract_vehicle_backfill_candidates candidate
  WHERE amendment.company_id = candidate.company_id
    AND amendment.contract_id = candidate.contract_id
    AND amendment.amendment_number = candidate.contract_number || '-VEHICLE-LINK-20260827';

  -- Recompute ordinary statuses after the identity graph is repaired. The
  -- canonical function returns NULL for protected legal/operational statuses.
  WITH derived AS (
    SELECT vehicle.id, vehicle.company_id,
           public.system_agent_vehicle_derived_state(vehicle.id, vehicle.company_id) AS state
    FROM public.vehicles vehicle
    WHERE vehicle.company_id = v_company_id
      AND vehicle.is_active = true
  )
  UPDATE public.vehicles vehicle
  SET status = NULLIF(derived.state ->> 'target_status', '')::public.vehicle_status,
      updated_at = now()
  FROM derived
  WHERE vehicle.id = derived.id
    AND NULLIF(derived.state ->> 'target_status', '') IS NOT NULL
    AND vehicle.status IS DISTINCT FROM
        NULLIF(derived.state ->> 'target_status', '')::public.vehicle_status;

  IF EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.status = 'active'
      AND contract.vehicle_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: an active contract still lacks vehicle_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.company_id = v_company_id
      AND vehicle.is_active = true
      AND vehicle.status = 'rented'
      AND NOT EXISTS (
        SELECT 1 FROM public.contracts contract
        WHERE contract.company_id = vehicle.company_id
          AND contract.vehicle_id = vehicle.id
          AND (
            contract.status = 'active'
            OR (contract.status = 'under_legal_procedure'
                AND COALESCE(contract.vehicle_returned, false) = false)
          )
          AND (contract.start_date IS NULL OR contract.start_date <= current_date)
          AND (contract.end_date IS NULL OR contract.end_date >= current_date)
      )
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: rented vehicle without a current contract';
  END IF;
END;
$repair$;

-- Retire two legacy status triggers so only the protected canonical derivation
-- trigger controls vehicle status after contract changes.
DROP TRIGGER IF EXISTS on_contract_active_sync_vehicle ON public.contracts;
DROP TRIGGER IF EXISTS update_vehicle_status_trigger ON public.contracts;

CREATE OR REPLACE FUNCTION public.resolve_and_guard_contract_vehicle_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_vehicle_id uuid;
  v_match_count integer;
BEGIN
  IF lower(COALESCE(NEW.status, '')) NOT IN ('active', 'pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  IF NEW.vehicle_id IS NULL THEN
    IF public.normalize_vehicle_plate(NEW.license_plate) = '' THEN
      RAISE EXCEPTION 'لا يمكن حفظ عقد نشط دون مركبة أو لوحة قابلة للمطابقة'
        USING ERRCODE = '23514';
    END IF;

    SELECT count(*), (array_agg(vehicle.id ORDER BY vehicle.id))[1]
    INTO v_match_count, v_vehicle_id
    FROM public.vehicles vehicle
    WHERE vehicle.company_id = NEW.company_id
      AND vehicle.is_active = true
      AND public.normalize_vehicle_plate(vehicle.plate_number)
          = public.normalize_vehicle_plate(NEW.license_plate);

    IF v_match_count <> 1 OR v_vehicle_id IS NULL THEN
      RAISE EXCEPTION 'تعذر تحديد مركبة واحدة نشطة للعقد من اللوحة (%)؛ عدد المطابقات: %',
        NEW.license_plate, v_match_count USING ERRCODE = '23514';
    END IF;
    NEW.vehicle_id := v_vehicle_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts occupied
    WHERE occupied.company_id = NEW.company_id
      AND occupied.vehicle_id = NEW.vehicle_id
      AND occupied.id IS DISTINCT FROM NEW.id
      AND (
        occupied.status IN ('active', 'pending', 'confirmed')
        OR (occupied.status = 'under_legal_procedure'
            AND COALESCE(occupied.vehicle_returned, false) = false)
      )
      AND daterange(
        COALESCE(occupied.start_date, '-infinity'::date),
        COALESCE(occupied.end_date, 'infinity'::date), '[]'
      ) && daterange(
        COALESCE(NEW.start_date, '-infinity'::date),
        COALESCE(NEW.end_date, 'infinity'::date), '[]'
      )
  ) THEN
    RAISE EXCEPTION 'المركبة مرتبطة بعقد قائم أو متداخل خلال المدة المطلوبة'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_00_resolve_and_guard_contract_vehicle_identity ON public.contracts;
CREATE TRIGGER trg_00_resolve_and_guard_contract_vehicle_identity
BEFORE INSERT OR UPDATE OF status, vehicle_id, license_plate, company_id, start_date, end_date
ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.resolve_and_guard_contract_vehicle_identity();

REVOKE ALL ON FUNCTION public.resolve_and_guard_contract_vehicle_identity() FROM PUBLIC;

COMMIT;
