BEGIN;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS penalty_id uuid REFERENCES public.penalties(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_penalty_id
  ON public.invoices(penalty_id)
  WHERE penalty_id IS NOT NULL;

ALTER TABLE public.penalties
  ADD COLUMN IF NOT EXISTS case_follow_up boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS case_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS case_follow_up_source text;

CREATE OR REPLACE FUNCTION public.ensure_penalty_contract_invoice(p_penalty_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_penalty public.penalties%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_date date;
  v_invoice_number text;
BEGIN
  SELECT penalty.* INTO v_penalty
  FROM public.penalties penalty
  WHERE penalty.id = p_penalty_id;

  IF NOT FOUND OR v_penalty.contract_id IS NULL OR COALESCE(v_penalty.amount, 0) <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT invoice.id INTO v_invoice_id
  FROM public.invoices invoice
  WHERE invoice.penalty_id = v_penalty.id;
  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.invoices invoice
    SET subtotal = v_penalty.amount,
        total_amount = v_penalty.amount,
        balance_due = GREATEST(v_penalty.amount - COALESCE(invoice.paid_amount, 0), 0),
        notes = 'مخالفة مرورية ' || COALESCE(v_penalty.penalty_number, v_penalty.id::text),
        updated_at = now()
    WHERE invoice.id = v_invoice_id
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN ('paid', 'completed');
    RETURN v_invoice_id;
  END IF;

  SELECT contract.* INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_penalty.contract_id
    AND contract.company_id = v_penalty.company_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_invoice_date := COALESCE(v_penalty.penalty_date, CURRENT_DATE);
  v_invoice_number := 'TV-' || v_penalty.id::text;

  INSERT INTO public.invoices (
    company_id, customer_id, contract_id, penalty_id, invoice_number,
    invoice_date, invoice_month, due_date, subtotal, total_amount,
    tax_amount, discount_amount, paid_amount, balance_due, status,
    payment_status, invoice_type, notes, currency, created_by,
    manual_idempotency_key, created_at, updated_at
  ) VALUES (
    v_penalty.company_id,
    COALESCE(v_penalty.customer_id, v_contract.customer_id),
    v_penalty.contract_id,
    v_penalty.id,
    v_invoice_number,
    v_invoice_date,
    date_trunc('month', v_invoice_date)::date,
    date_trunc('month', v_invoice_date)::date,
    v_penalty.amount,
    v_penalty.amount,
    0, 0, 0, v_penalty.amount,
    'sent', 'unpaid', 'service',
    'مخالفة مرورية ' || COALESCE(v_penalty.penalty_number, v_penalty.id::text),
    'QAR', v_penalty.created_by,
    'traffic-penalty:' || v_penalty.id::text,
    now(), now()
  )
  ON CONFLICT (penalty_id) WHERE penalty_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_invoice_id;

  IF v_invoice_id IS NULL THEN
    SELECT invoice.id INTO v_invoice_id FROM public.invoices invoice WHERE invoice.penalty_id = v_penalty.id;
  END IF;
  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_penalty_invoice_and_case_follow_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF lower(COALESCE(NEW.status, '')) = 'case_pending'
     OR COALESCE(NEW.reason, '') ILIKE '%تحويل المخالفات المرورية لمتابعة القضايا%'
     OR COALESCE(NEW.notes, '') ILIKE '%تحويل المخالفات المرورية لمتابعة القضايا%'
  THEN
    NEW.case_follow_up := true;
    NEW.case_follow_up_at := COALESCE(NEW.case_follow_up_at, now());
    NEW.case_follow_up_source := COALESCE(NEW.case_follow_up_source, 'moi_notice');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_penalty_case_follow_up_before_write ON public.penalties;
CREATE TRIGGER trg_penalty_case_follow_up_before_write
BEFORE INSERT OR UPDATE OF status, reason, notes, case_follow_up
ON public.penalties FOR EACH ROW
EXECUTE FUNCTION public.trg_penalty_invoice_and_case_follow_up();

CREATE OR REPLACE FUNCTION public.trg_penalty_contract_invoice_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.contract_id IS NOT NULL AND COALESCE(NEW.amount, 0) > 0
     AND (TG_OP = 'INSERT' OR OLD.contract_id IS DISTINCT FROM NEW.contract_id OR OLD.amount IS DISTINCT FROM NEW.amount)
  THEN
    PERFORM public.ensure_penalty_contract_invoice(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_penalty_contract_invoice_after_write ON public.penalties;
CREATE TRIGGER trg_penalty_contract_invoice_after_write
AFTER INSERT OR UPDATE OF contract_id, amount
ON public.penalties FOR EACH ROW
EXECUTE FUNCTION public.trg_penalty_contract_invoice_after_write();

REVOKE ALL ON FUNCTION public.ensure_penalty_contract_invoice(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_penalty_contract_invoice_after_write() FROM PUBLIC, anon, authenticated;

-- Known company-level MOI QID: link any matching imported notices to the customer.
UPDATE public.penalties penalty
SET customer_id = customer.id,
    case_follow_up = true,
    case_follow_up_at = COALESCE(penalty.case_follow_up_at, now()),
    case_follow_up_source = COALESCE(penalty.case_follow_up_source, 'moi_qid_29263400736')
FROM public.customers customer
WHERE customer.company_id = penalty.company_id
  AND regexp_replace(COALESCE(customer.national_id, ''), '\D', '', 'g') = '29263400736'
  AND (
    regexp_replace(COALESCE(penalty.reason, ''), '\D', '', 'g') LIKE '%29263400736%'
    OR regexp_replace(COALESCE(penalty.notes, ''), '\D', '', 'g') LIKE '%29263400736%'
  )
  AND penalty.customer_id IS NULL;

UPDATE public.penalties penalty
SET case_follow_up = true,
    case_follow_up_at = COALESCE(penalty.case_follow_up_at, now()),
    case_follow_up_source = COALESCE(penalty.case_follow_up_source, 'moi_notice')
WHERE lower(COALESCE(penalty.status, '')) = 'case_pending'
   OR COALESCE(penalty.reason, '') ILIKE '%تحويل المخالفات المرورية لمتابعة القضايا%'
   OR COALESCE(penalty.notes, '') ILIKE '%تحويل المخالفات المرورية لمتابعة القضايا%';

-- Propagate the MOI marker into the existing legal-case workflow.
UPDATE public.legal_cases legal_case
SET tags = CASE
      WHEN COALESCE(legal_case.tags, '[]'::jsonb) @> '["moi_case_follow_up"]'::jsonb THEN legal_case.tags
      ELSE COALESCE(legal_case.tags, '[]'::jsonb) || '["moi_case_follow_up"]'::jsonb
    END,
    notes = concat_ws(E'\n', NULLIF(BTRIM(COALESCE(legal_case.notes, '')), ''), 'محوّلة لمتابعة القضايا — إشعار وزارة الداخلية'),
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.penalties penalty
  WHERE penalty.company_id = legal_case.company_id
    AND penalty.case_follow_up
    AND (
      penalty.contract_id = legal_case.contract_id
      OR penalty.customer_id = legal_case.client_id
    )
);

CREATE OR REPLACE FUNCTION public.trg_propagate_penalty_case_follow_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.case_follow_up IS NOT TRUE THEN RETURN NEW; END IF;
  UPDATE public.legal_cases legal_case
  SET tags = CASE
        WHEN COALESCE(legal_case.tags, '[]'::jsonb) @> '["moi_case_follow_up"]'::jsonb THEN legal_case.tags
        ELSE COALESCE(legal_case.tags, '[]'::jsonb) || '["moi_case_follow_up"]'::jsonb
      END,
      notes = CASE
        WHEN COALESCE(legal_case.notes, '') LIKE '%محوّلة لمتابعة القضايا%' THEN legal_case.notes
        ELSE concat_ws(E'\n', NULLIF(BTRIM(COALESCE(legal_case.notes, '')), ''), 'محوّلة لمتابعة القضايا — إشعار وزارة الداخلية')
      END,
      updated_at = now()
  WHERE legal_case.company_id = NEW.company_id
    AND (legal_case.contract_id = NEW.contract_id OR legal_case.client_id = NEW.customer_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_penalty_case_follow_up ON public.penalties;
CREATE TRIGGER trg_propagate_penalty_case_follow_up
AFTER INSERT OR UPDATE OF case_follow_up, contract_id, customer_id
ON public.penalties FOR EACH ROW
EXECUTE FUNCTION public.trg_propagate_penalty_case_follow_up();

-- Backfill missing invoices in bounded batches inside the migration transaction.
DO $$
DECLARE v_penalty_id uuid;
BEGIN
  FOR v_penalty_id IN
    SELECT penalty.id
    FROM public.penalties penalty
    WHERE penalty.contract_id IS NOT NULL
      AND COALESCE(penalty.amount, 0) > 0
      AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed')
      AND NOT EXISTS (SELECT 1 FROM public.invoices invoice WHERE invoice.penalty_id = penalty.id)
    ORDER BY penalty.created_at NULLS LAST, penalty.id
  LOOP
    PERFORM public.ensure_penalty_contract_invoice(v_penalty_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_block_contract_close_with_unpaid_penalties()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE v_count integer; v_total numeric;
BEGIN
  IF lower(COALESCE(OLD.status, '')) = 'active'
     AND lower(COALESCE(NEW.status, '')) IN ('cancelled', 'canceled', 'expired', 'completed', 'closed', 'terminated')
  THEN
    SELECT count(*), COALESCE(sum(penalty.amount), 0)
    INTO v_count, v_total
    FROM public.penalties penalty
    WHERE penalty.company_id = OLD.company_id
      AND penalty.contract_id = OLD.id
      AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed')
      AND lower(COALESCE(penalty.status, '')) NOT IN ('handled', 'resolved', 'waived', 'transferred', 'cancelled', 'canceled', 'void', 'voided');
    IF v_count > 0 THEN
      RAISE EXCEPTION 'لا يمكن إغلاق العقد: توجد % مخالفة غير مسددة بإجمالي % ر.ق. يجب سدادها أو معالجتها صراحةً أولاً', v_count, trim(to_char(v_total, 'FM999G999G999G990D00'))
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_contract_close_with_unpaid_penalties ON public.contracts;
CREATE TRIGGER trg_block_contract_close_with_unpaid_penalties
BEFORE UPDATE OF status ON public.contracts FOR EACH ROW
EXECUTE FUNCTION public.trg_block_contract_close_with_unpaid_penalties();

CREATE OR REPLACE FUNCTION public.trg_enforce_rental_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE v_vehicle_status text; v_count integer; v_total numeric;
BEGIN
  IF lower(COALESCE(NEW.status, '')) NOT IN ('active', 'pending', 'confirmed') OR NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'vehicle_reservations' AND NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'لا يمكن إنشاء الحجز دون اختيار عميل مسجل للتحقق من المخالفات' USING ERRCODE = 'P0001';
  END IF;
  SELECT lower(COALESCE(vehicle.status, '')) INTO v_vehicle_status
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

DROP TRIGGER IF EXISTS trg_enforce_contract_rental_eligibility ON public.contracts;
CREATE TRIGGER trg_enforce_contract_rental_eligibility
BEFORE INSERT OR UPDATE OF status, vehicle_id, customer_id ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_rental_eligibility();

DROP TRIGGER IF EXISTS trg_enforce_reservation_rental_eligibility ON public.vehicle_reservations;
CREATE TRIGGER trg_enforce_reservation_rental_eligibility
BEFORE INSERT OR UPDATE OF status, vehicle_id, customer_id ON public.vehicle_reservations
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_rental_eligibility();

CREATE OR REPLACE FUNCTION public.save_vehicle_reservation_v2(
  p_company_id uuid,
  p_reservation_id uuid,
  p_vehicle_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_start_date date,
  p_end_date date,
  p_status text,
  p_notes text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.vehicle_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid;
  v_vehicle public.vehicles%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_row public.vehicle_reservations%ROWTYPE;
  v_id uuid := COALESCE(p_reservation_id, gen_random_uuid());
BEGIN
  v_actor_id := COALESCE(auth.uid(), p_actor_id);
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF p_customer_id IS NULL OR p_start_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'العميل وتواريخ الحجز مطلوبة' USING ERRCODE = 'P0001';
  END IF;
  SELECT vehicle.* INTO v_vehicle FROM public.vehicles vehicle
  WHERE vehicle.id = p_vehicle_id AND vehicle.company_id = p_company_id AND vehicle.is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'المركبة غير موجودة أو غير نشطة' USING ERRCODE = 'P0001'; END IF;
  SELECT customer.* INTO v_customer FROM public.customers customer
  WHERE customer.id = p_customer_id AND customer.company_id = p_company_id AND COALESCE(customer.is_active, true);
  IF NOT FOUND THEN RAISE EXCEPTION 'العميل غير موجود أو غير نشط' USING ERRCODE = 'P0001'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':reservation:' || p_vehicle_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.vehicle_reservations reservation
    WHERE reservation.company_id = p_company_id AND reservation.vehicle_id = p_vehicle_id AND reservation.id <> v_id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN ('cancelled', 'canceled', 'completed', 'expired')
      AND daterange(reservation.start_date, reservation.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  ) OR EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = p_company_id AND contract.vehicle_id = p_vehicle_id
      AND lower(COALESCE(contract.status::text, '')) IN ('active', 'under_legal_procedure')
      AND daterange(contract.start_date, COALESCE(contract.end_date, 'infinity'::date), '[]') && daterange(p_start_date, p_end_date, '[]')
  ) THEN
    RAISE EXCEPTION 'المركبة لديها حجز أو عقد متداخل' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.vehicle_reservations (
    id, company_id, vehicle_id, customer_id, customer_name, vehicle_plate, vehicle_make, vehicle_model,
    start_date, end_date, hold_until, status, notes
  ) VALUES (
    v_id, p_company_id, p_vehicle_id, p_customer_id, COALESCE(NULLIF(BTRIM(p_customer_name), ''), v_customer.company_name_ar, v_customer.company_name, v_customer.first_name_ar, v_customer.first_name),
    v_vehicle.plate_number, v_vehicle.make, v_vehicle.model, p_start_date, p_end_date, now() + interval '24 hours',
    COALESCE(NULLIF(BTRIM(p_status), ''), 'pending'), NULLIF(BTRIM(COALESCE(p_notes, '')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    vehicle_id = EXCLUDED.vehicle_id, customer_id = EXCLUDED.customer_id, customer_name = EXCLUDED.customer_name,
    vehicle_plate = EXCLUDED.vehicle_plate, vehicle_make = EXCLUDED.vehicle_make, vehicle_model = EXCLUDED.vehicle_model,
    start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = EXCLUDED.status,
    notes = EXCLUDED.notes, updated_at = now()
  WHERE vehicle_reservations.company_id = p_company_id
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'الحجز خارج الشركة الحالية' USING ERRCODE = '42501'; END IF;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.save_vehicle_reservation_v2(uuid, uuid, uuid, uuid, text, date, date, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_vehicle_reservation_v2(uuid, uuid, uuid, uuid, text, date, date, text, text, uuid) TO authenticated, service_role;

COMMENT ON COLUMN public.invoices.penalty_id IS 'Traffic penalty that generated this normal collectible contract invoice; unique for idempotency.';
COMMENT ON COLUMN public.penalties.case_follow_up IS 'MOI notice converted this violation to legal case follow-up.';

COMMIT;
