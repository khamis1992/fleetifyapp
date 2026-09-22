-- Integrity batch (user audit 2026-09-22, items 1/3/4/5):
--  1. payment_method='received' repaired from the journals' cash account
--     (bank debit => bank_transfer; no journal => cash) + allowed-value check;
--  3. demo-named assets blocked in production (fixed_assets + vehicles checks),
--     the one existing demo asset retired, and monthly depreciation + due-draft
--     posting scheduled through pg_cron (idempotent daily runs);
--  4. the July closing over-sweep of revenue 4101 reversed against 3100;
--  5. stale past-dated misc drafts cancelled; due invoice drafts posted.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. payment_method repair + allowed values (completed rows are immutable
--    outside the documented bypass).
-- ---------------------------------------------------------------------------
SET LOCAL app.financial_controls_bypass = 'on';

WITH bank_paid AS (
  SELECT DISTINCT p.id
  FROM public.payments p
  JOIN public.journal_entries e ON e.id = p.journal_entry_id AND e.status = 'posted'
  JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id AND l.debit_amount > 0
  JOIN public.account_mappings m ON m.chart_of_accounts_id = l.account_id AND m.company_id = p.company_id
  JOIN public.default_account_types t ON t.id = m.default_account_type_id AND t.type_code = 'BANK'
  WHERE p.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND p.payment_method = 'received'
)
UPDATE public.payments p
SET payment_method = 'bank_transfer', updated_at = now()
FROM bank_paid b WHERE p.id = b.id;

UPDATE public.payments
SET payment_method = 'cash', updated_at = now()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND payment_method = 'received';

SET LOCAL app.financial_controls_bypass = '';

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_allowed;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_allowed
  CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'credit_card', 'debit_card'));

-- ---------------------------------------------------------------------------
-- 3a. Demo asset retired + demo-name guards.
-- ---------------------------------------------------------------------------
DO $demo$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT fa.id,
      EXISTS (SELECT 1 FROM public.journal_entry_lines l WHERE l.asset_id = fa.id) AS has_lines
    FROM public.fixed_assets fa
    WHERE fa.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND (fa.asset_name ~* '(^|[^[:alpha:]])(test|demo)([^[:alpha:]]|$)'
        OR COALESCE(fa.asset_name_ar, '') LIKE '%تجرب%'
        OR COALESCE(fa.asset_name_ar, '') LIKE '%اختبار%')
  LOOP
    IF r.has_lines THEN
      UPDATE public.fixed_assets SET is_active = false, updated_at = now(),
        notes = CONCAT_WS(' | ', notes, 'RETIRED demo asset by migration 20260921160000')
      WHERE id = r.id;
    ELSE
      DELETE FROM public.fixed_assets WHERE id = r.id;
    END IF;
  END LOOP;
END
$demo$;

ALTER TABLE public.fixed_assets DROP CONSTRAINT IF EXISTS fixed_assets_no_demo_names;
ALTER TABLE public.fixed_assets
  ADD CONSTRAINT fixed_assets_no_demo_names CHECK (
    NOT (COALESCE(asset_name, '') ~* '(^|[^[:alpha:]])(test|demo)([^[:alpha:]]|$)'
      OR COALESCE(asset_name_ar, '') LIKE '%تجرب%'
      OR COALESCE(asset_name_ar, '') LIKE '%اختبار%'));

-- Remove obvious demo vehicles (plate/make/model/vin markers): delete when
-- unreferenced, otherwise sanitize the offending identifiers and deactivate.
DO $demo_vehicles$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM public.vehicles
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND (COALESCE(vin, '') ~* '(^|[^[:alpha:]])(test|demo)([^[:alpha:]]|$)'
        OR COALESCE(vin_number, '') ~* '(^|[^[:alpha:]])(test|demo)([^[:alpha:]]|$)'
        OR COALESCE(model, '') ~* '(^|[^[:alpha:]])(test|demo)([^[:alpha:]]|$)'
        OR plate_number ~* '^(test|demo)')
  LOOP
    BEGIN
      DELETE FROM public.vehicles WHERE id = r.id;
    EXCEPTION WHEN foreign_key_violation THEN
      UPDATE public.vehicles
      SET is_active = false, model = '(retired)', vin = NULL, vin_number = NULL,
        notes = CASE WHEN COALESCE(btrim(notes), '') = ''
          THEN 'RETIRED demo vehicle by migration 20260921160000'
          ELSE notes || E'\n' || 'RETIRED demo vehicle by migration 20260921160000' END,
        updated_at = now()
      WHERE id = r.id;
    END;
  END LOOP;
END
$demo_vehicles$;

ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_no_demo_names;
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_no_demo_names CHECK (
    NOT (COALESCE(vin, '') ~* '(^|[^[:alpha:]])(test|demo)([^[:alpha:]]|$)'
      OR COALESCE(vin_number, '') ~* '(^|[^[:alpha:]])(test|demo)([^[:alpha:]]|$)'
      OR COALESCE(model, '') ~* '(^|[^[:alpha:]])(test|demo)([^[:alpha:]]|$)'
      OR COALESCE(notes, '') LIKE '%تجربة%'));

-- ---------------------------------------------------------------------------
-- 3b. Cron-scheduled depreciation + due-draft posting (idempotent daily).
--     post_due_journal_drafts_v1 first learns to accept the cron runner.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_due_journal_drafts_v1(
  p_company_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_count integer := 0;
  v_amount numeric := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND v_actor IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF v_actor IS NULL AND COALESCE(auth.role(), '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  WITH due AS (
    SELECT id FROM public.journal_entries
    WHERE (p_company_id IS NULL OR company_id = p_company_id)
      AND status = 'draft' AND reference_type = 'invoice'
      AND entry_date IS NOT NULL AND entry_date <= v_today
    ORDER BY entry_date, id
    LIMIT 500
  ), posted AS (
    UPDATE public.journal_entries e
    SET status = 'posted', posted_by = v_actor, posted_at = now(), updated_at = now()
    FROM due WHERE e.id = due.id
    RETURNING e.id, e.total_debit
  )
  SELECT count(*), COALESCE(sum(total_debit), 0) INTO v_count, v_amount FROM posted;

  RETURN jsonb_build_object('postedCount', v_count, 'postedAmount', v_amount, 'asOf', v_today);
END;
$fn$;
REVOKE ALL ON FUNCTION public.post_due_journal_drafts_v1(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_due_journal_drafts_v1(uuid, uuid) TO authenticated, service_role;

DO $cron$
BEGIN
  PERFORM cron.unschedule('fleetify-post-due-invoice-drafts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fleetify-post-due-invoice-drafts');
  PERFORM cron.unschedule('fleetify-vehicle-depreciation-monthly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fleetify-vehicle-depreciation-monthly');
  PERFORM cron.schedule('fleetify-post-due-invoice-drafts', '15 0 * * *',
    $$SELECT public.post_due_journal_drafts_v1(NULL)$$);
  PERFORM cron.schedule('fleetify-vehicle-depreciation-monthly', '30 0 * * *',
    $$SELECT count(*) FROM public.process_vehicle_depreciation_monthly(c.id, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date) FROM public.companies c$$);
END
$cron$;

-- ---------------------------------------------------------------------------
-- 5. Stale past-dated misc drafts cancelled; due invoice drafts posted.
-- ---------------------------------------------------------------------------
DO $drafts$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_cancelled integer;
  v_posted integer;
BEGIN
  SET LOCAL app.financial_controls_bypass = 'on';
  ALTER TABLE public.journal_entries DISABLE TRIGGER trg_recalc_balances_on_journal_status;

  WITH dropped AS (
    UPDATE public.journal_entries
    SET status = 'cancelled', updated_at = now(),
      workflow_notes = CASE
        WHEN COALESCE(btrim(workflow_notes), '') = ''
          THEN 'STALE_DRAFT_CANCELLED by migration 20260921160000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
        ELSE workflow_notes || E'\n' || 'STALE_DRAFT_CANCELLED by migration 20260921160000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
      END
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'draft' AND reference_type <> 'invoice'
      AND entry_date <= v_today
    RETURNING 1
  )
  SELECT count(*) INTO v_cancelled FROM dropped;

  WITH posted AS (
    UPDATE public.journal_entries
    SET status = 'posted', posted_at = now(), updated_at = now()
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'draft' AND reference_type = 'invoice'
      AND entry_date <= v_today
    RETURNING 1
  )
  SELECT count(*) INTO v_posted FROM posted;

  ALTER TABLE public.journal_entries ENABLE TRIGGER trg_recalc_balances_on_journal_status;
  SET LOCAL app.financial_controls_bypass = '';

  PERFORM public.recalculate_account_current_balance(t.account_id)
  FROM (SELECT DISTINCT account_id FROM public.journal_entry_lines l
        JOIN public.journal_entries e ON e.id = l.journal_entry_id
        WHERE e.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
          AND (e.workflow_notes LIKE '%STALE_DRAFT_CANCELLED%'
            OR (e.status = 'posted' AND e.reference_type = 'invoice' AND e.entry_date <= v_today
              AND e.posted_at::date = v_today))) t;

  INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
  VALUES ('stale_drafts_cleaned_and_due_invoices_posted', '24bc0b21-4e2d-4413-9842-31719a3669f4', 'journal_entries', 'journal_entry', 'info',
    'Stale past-dated misc drafts cancelled and due invoice drafts posted (migration 20260921160000).',
    jsonb_build_object('cancelled', v_cancelled, 'posted', v_posted, 'at', now()));
  RAISE NOTICE 'drafts: cancelled=% posted=%', v_cancelled, v_posted;
END
$drafts$;

-- ---------------------------------------------------------------------------
-- 4. Reverse the July closing over-sweep of revenue 4101 into 3100.
-- ---------------------------------------------------------------------------
DO $revenue$
DECLARE
  v_4101 uuid;
  v_3100 uuid;
  v_pre_close_credits numeric;
  v_closing_debits numeric;
  v_adj numeric;
  v_je uuid;
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
BEGIN
  SELECT id INTO v_4101 FROM public.chart_of_accounts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND account_code = '4101';
  SELECT id INTO v_3100 FROM public.chart_of_accounts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND account_code = '3100';
  IF v_4101 IS NULL OR v_3100 IS NULL THEN RAISE NOTICE '4101/3100 not found; skip'; RETURN; END IF;

  SELECT COALESCE(sum(l.credit_amount), 0) INTO v_pre_close_credits
  FROM public.journal_entry_lines l JOIN public.journal_entries e ON e.id = l.journal_entry_id
  WHERE e.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND e.status = 'posted'
    AND l.account_id = v_4101 AND l.credit_amount > 0
    AND e.entry_date < DATE '2026-07-01';

  SELECT COALESCE(sum(l.debit_amount), 0) INTO v_closing_debits
  FROM public.journal_entry_lines l JOIN public.journal_entries e ON e.id = l.journal_entry_id
  WHERE e.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND e.status = 'posted'
    AND e.reference_type IN ('closing', 'annual_close', 'annual_close_opening')
    AND l.account_id = v_4101 AND l.debit_amount > 0;

  v_adj := v_closing_debits - v_pre_close_credits;
  IF v_adj > 0.01 THEN
    v_je := gen_random_uuid();
    INSERT INTO public.journal_entries (
      id, company_id, entry_number, entry_date, description, reference_type, reference_id,
      total_debit, total_credit, status, workflow_notes
    ) VALUES (
      v_je, '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'REV-CLOSE-ADJ-' || to_char(v_today, 'YYYYMMDD'), v_today,
      'عكس فرط كنس إقفال 2026-07 لإيراد الخدمة 4101 إلى الأرباح المحتجزة',
      'closing_over_sweep_reversal', v_je,
      v_adj, v_adj, 'draft',
      'REVERSAL by migration 20260921160000: July close swept more 4101 revenue than existed'
    );
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
    VALUES (v_je, v_3100, 1, 'عكس فرط كنس الإقفال — الأرباح المحتجزة', v_adj, 0),
           (v_je, v_4101, 2, 'استعادة إيراد الخدمة المكنوس زيادة', 0, v_adj);
    UPDATE public.journal_entries SET status = 'posted', posted_at = now(), updated_at = now() WHERE id = v_je;

    INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
    VALUES ('revenue_closing_oversweep_reversed', '24bc0b21-4e2d-4413-9842-31719a3669f4', 'chart_of_accounts/4101', 'journal_entry', 'warning',
      'July 2026 closing swept more service-revenue (4101) than had accumulated; over-sweep reversed to retained earnings (3100).',
      jsonb_build_object('closingDebits', v_closing_debits, 'preCloseCredits', v_pre_close_credits, 'adjustment', v_adj, 'journalEntry', v_je));
    RAISE NOTICE '4101 over-sweep reversed: %', v_adj;
  END IF;
END
$revenue$;

NOTIFY pgrst,'reload schema';
COMMIT;
