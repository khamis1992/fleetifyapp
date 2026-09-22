-- Vehicle installment integrity repair:
--  * backfill payment records + balanced bank journals for the 163 schedules
--    historically marked paid without payment rows (debit the installment
--    payable role account mapped in 20260921150000, credit the bank);
--  * close agreements whose schedule is fully paid;
--  * guard the schedule table against paid-state writes without payment rows.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Backfill payment rows + journals for paid schedules lacking records.
-- ---------------------------------------------------------------------------
DO $backfill$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_payable uuid;
  v_bank uuid;
  r record;
  v_payment_id uuid;
  v_je_id uuid;
  v_date date;
  v_count integer := 0;
  v_amount numeric := 0;
BEGIN
  SELECT m.chart_of_accounts_id INTO v_payable
  FROM public.account_mappings m JOIN public.default_account_types t ON t.id = m.default_account_type_id
  WHERE m.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND t.type_code = 'VEHICLE_INSTALLMENT_PAYABLE' AND COALESCE(m.is_active, true)
  LIMIT 1;
  SELECT m.chart_of_accounts_id INTO v_bank
  FROM public.account_mappings m JOIN public.default_account_types t ON t.id = m.default_account_type_id
  WHERE m.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND t.type_code = 'BANK' AND COALESCE(m.is_active, true)
  LIMIT 1;

  IF v_payable IS NULL OR v_bank IS NULL THEN
    RAISE EXCEPTION 'Installment payable and bank role mappings are required before backfilling payments';
  END IF;

  FOR r IN
    SELECT s.id, s.installment_id, s.installment_number, s.amount, COALESCE(s.paid_amount, s.amount) AS paid,
      LEAST(COALESCE(s.paid_date, s.due_date), v_today) AS pay_date,
      a.agreement_number
    FROM public.vehicle_installment_schedules s
    JOIN public.vehicle_installments a ON a.id = s.installment_id
    WHERE s.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND s.status = 'paid'
      AND NOT EXISTS (SELECT 1 FROM public.vehicle_installment_payments p WHERE p.schedule_id = s.id)
    ORDER BY s.due_date, s.id
  LOOP
    v_payment_id := gen_random_uuid();
    v_je_id := gen_random_uuid();
    v_date := r.pay_date;
    v_count := v_count + 1;
    v_amount := v_amount + r.paid;

    INSERT INTO public.journal_entries (
      id, company_id, entry_number, entry_date, description, reference_type, reference_id,
      total_debit, total_credit, status, created_by, workflow_notes
    ) VALUES (
      v_je_id, '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'VIP-BF-' || to_char(v_date, 'YYYYMMDD') || '-' || left(r.id::text, 8),
      v_date,
      'سداد قسط مركبة (تسوية تاريخية) - ' || COALESCE(r.agreement_number, r.installment_id::text) || ' - قسط ' || r.installment_number,
      'vehicle_installment_payment', v_payment_id,
      r.paid, r.paid, 'draft', NULL,
      'BACKFILLED by migration 20260921151000: schedule marked paid without a payment record'
    );

    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
    VALUES
      (v_je_id, v_payable, 1, 'سداد أصل قسط مركبات - ' || COALESCE(r.agreement_number, ''), r.paid, 0),
      (v_je_id, v_bank, 2, 'صرف بنكي لقسط مركبة - ' || COALESCE(r.agreement_number, ''), 0, r.paid);

    UPDATE public.journal_entries
    SET status = 'posted', posted_at = now(), updated_at = now()
    WHERE id = v_je_id;

    INSERT INTO public.vehicle_installment_payments (
      id, company_id, installment_id, schedule_id, payment_date, amount,
      principal_amount, interest_amount, payment_method, payment_reference, notes,
      status, journal_entry_id, created_by
    ) VALUES (
      v_payment_id, '24bc0b21-4e2d-4413-9842-31719a3669f4', r.installment_id, r.id, v_date, r.paid,
      r.paid, 0, 'bank_transfer', NULL,
      'BACKFILLED by migration 20260921151000 from schedule paid state',
      'completed', v_je_id, NULL
    );

    UPDATE public.vehicle_installment_schedules
    SET journal_entry_id = COALESCE(journal_entry_id, v_je_id), updated_at = now()
    WHERE id = r.id;
  END LOOP;

  INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
  VALUES (
    'vehicle_installment_payments_backfilled',
    '24bc0b21-4e2d-4413-9842-31719a3669f4',
    'vehicle_installment_schedules',
    'vehicle_installment_payment',
    'warning',
    'Paid schedules lacking payment rows received backfilled payment records and bank journals (migration 20260921151000).',
    jsonb_build_object('count', v_count, 'amount', v_amount, 'payableAccount', v_payable, 'bankAccount', v_bank)
  );

  RAISE NOTICE 'installment backfill: % payments, % total', v_count, v_amount;
END
$backfill$;

-- ---------------------------------------------------------------------------
-- 2. Close agreements whose schedule is fully paid.
-- ---------------------------------------------------------------------------
UPDATE public.vehicle_installments a
SET status = 'completed', updated_at = now()
WHERE a.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND a.status IN ('draft', 'active')
  AND EXISTS (SELECT 1 FROM public.vehicle_installment_schedules s WHERE s.installment_id = a.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.vehicle_installment_schedules s
    WHERE s.installment_id = a.id AND s.company_id = a.company_id AND s.status <> 'paid'
  );

-- ---------------------------------------------------------------------------
-- 3. Guard: schedules cannot be marked paid (or have paid_amount raised)
--    without covering payment rows, outside the documented bypass.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_installment_schedule_paid_state()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF COALESCE(current_setting('app.financial_controls_bypass', true), '') = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'UPDATE'
     AND (NEW.status = 'paid' OR COALESCE(NEW.paid_amount, 0) > COALESCE(OLD.paid_amount, 0))
     AND OLD.status <> 'paid'
     AND NOT EXISTS (
       SELECT 1 FROM public.vehicle_installment_payments p
       WHERE p.schedule_id = NEW.id AND p.status = 'completed'
     ) THEN
    RAISE EXCEPTION 'Installment paid state requires a completed payment record; use process_vehicle_installment_payment_v1'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.guard_installment_schedule_paid_state() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS guard_installment_schedule_paid_state ON public.vehicle_installment_schedules;
CREATE TRIGGER guard_installment_schedule_paid_state
  BEFORE UPDATE OF status, paid_amount ON public.vehicle_installment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.guard_installment_schedule_paid_state();

NOTIFY pgrst,'reload schema';
COMMIT;
