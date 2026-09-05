-- ============================================================================
-- UNIFIED SCHEDULE RECONCILIATION AUTHORITY
-- ============================================================================
-- Root cause this migration eliminates:
--
-- Before this migration, SIX separate write paths each updated a different
-- slice of the derived financial state, and none of them covered the full
-- lifecycle:
--   * sync_payment_schedule_with_invoice()  — trigger, matches by month, can
--     attach to the WRONG schedule row when two rows share a month.
--   * sync_schedule_with_invoice()          — second, different trigger doing
--     the same job with different rules.
--   * recalculate_invoice_financial_state() — invoices only.
--   * recalculate_contract_financial_state()— contract header only.
--   * refresh_contract_financial_state_v1() — invoices + header + schedules
--     (added 2026-09-04), runs only when the details page is opened.
--   * cancel_invoice_with_reversal()        — cancels the invoice but never
--     detaches schedules linked to it, leaving 355 dead links found in
--     production.
--
-- The result: derived state drifted the moment any path was missed, and the
-- contract-details page surfaced "financialReviewRequired" warnings with no
-- self-heal path.
--
-- This migration introduces ONE authority:
--   public.reconcile_contract_schedules_v1(contract_id)
-- that recomputes every derived schedule field (invoice_id link, amount,
-- paid_amount, status, paid_date) from the canonical sources:
--   * the invoice graph (contract_id + billing month + active status), and
--   * payment_allocations / legacy receipt links.
--
-- Everything else then delegates to it:
--   1. The month-matching trigger is replaced by an explicit link repair
--      through the authority (no more wrong-row attachment).
--   2. Invoice cancellation detaches dead links through the authority.
--   3. A pg_cron job reconciles every billable contract daily, so drift can
--      no longer accumulate even if an application bug slips through.
--   4. The details-page gateway calls the same authority after its invoice /
--      header recalculation.
-- ============================================================================

-- ===== 1. The single reconciliation authority =====
CREATE OR REPLACE FUNCTION public.reconcile_contract_schedules_v1(
  p_contract_id uuid,
  p_options jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_contract_status text;
  v_contract_amount numeric;
  v_rows_linked integer := 0;
  v_rows_unlinked integer := 0;
  v_rows_amount_synced integer := 0;
  v_rows_settlement_synced integer := 0;
  v_rows_detached_dead integer := 0;
  v_rows_cancelled_orphans integer := 0;
  v_report jsonb;
  v_do_link_repair boolean := COALESCE((p_options ->> 'link_repair')::boolean, true);
  v_do_settlement_sync boolean := COALESCE((p_options ->> 'settlement_sync')::boolean, true);
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'contract id is required' USING ERRCODE = '22023';
  END IF;

  SELECT contract.company_id,
         lower(COALESCE(contract.status, '')),
         COALESCE(contract.contract_amount, 0)
    INTO v_company_id, v_contract_status, v_contract_amount
  FROM public.contracts AS contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contract not found' USING ERRCODE = 'P0002';
  END IF;

  -- ---------------------------------------------------------------
  -- STEP 1: Repair explicit invoice links.
  -- A schedule's link must point at THE active rental invoice of the same
  -- billing month of the same contract. Matching by month alone (the old
  -- trigger behaviour) could attach to a wrong row; here the link is rebuilt
  -- from the full identity: month + contract + active + not-traffic.
  -- ---------------------------------------------------------------
  IF v_do_link_repair THEN

    -- 1a. Re-link unlinked schedules that have a canonical invoice.
    WITH candidates AS (
      SELECT
        schedule.id AS schedule_id,
        (
          SELECT invoice.id
          FROM public.invoices AS invoice
          WHERE invoice.company_id = v_company_id
            AND invoice.contract_id = p_contract_id
            AND invoice.penalty_id IS NULL
            AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
            AND lower(COALESCE(invoice.status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
            AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
            AND date_trunc('month', COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone)::date
                = date_trunc('month', schedule.due_date)::date
          -- The invoice must not already belong to a different active schedule.
          AND NOT EXISTS (
            SELECT 1 FROM public.contract_payment_schedules AS other
            WHERE other.invoice_id = invoice.id
              AND other.id <> schedule.id
              AND lower(COALESCE(other.status, '')) NOT IN (
                'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
              )
          )
          LIMIT 1
        ) AS invoice_id
      FROM public.contract_payment_schedules AS schedule
      WHERE schedule.contract_id = p_contract_id
        AND schedule.company_id = v_company_id
        AND schedule.invoice_id IS NULL
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    ),
    relinked AS (
      UPDATE public.contract_payment_schedules AS schedule
      SET invoice_id = candidates.invoice_id,
          updated_at = now()
      FROM candidates
      WHERE schedule.id = candidates.schedule_id
        AND candidates.invoice_id IS NOT NULL
      RETURNING 1
    )
    SELECT count(*) INTO v_rows_linked FROM relinked;

    -- 1b. Detach links to dead invoices (cancelled/voided). The schedule row
    --     itself stays active when the contract is billable — the obligation
    --     is real; only the invoice proof died.
    WITH dead_links AS (
      SELECT schedule.id AS schedule_id
      FROM public.contract_payment_schedules AS schedule
      WHERE schedule.contract_id = p_contract_id
        AND schedule.company_id = v_company_id
        AND schedule.invoice_id IS NOT NULL
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND EXISTS (
          SELECT 1 FROM public.invoices AS invoice
          WHERE invoice.id = schedule.invoice_id
            AND (
              lower(COALESCE(invoice.status, '')) IN (
                'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
              )
              OR lower(COALESCE(invoice.payment_status, '')) IN (
                'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
              )
            )
        )
    ),
    detached AS (
      UPDATE public.contract_payment_schedules AS schedule
      SET invoice_id = NULL,
          updated_at = now()
      FROM dead_links
      WHERE schedule.id = dead_links.schedule_id
      RETURNING 1
    )
    SELECT count(*) INTO v_rows_detached_dead FROM detached;

    -- 1c. Non-billable contracts (cancelled/canceled): orphan future unpaid
    --     unlinked rows are cancelled alongside the contract (the permanent
    --     trigger covers live cancellations; this is the sweep for anything
    --     the trigger missed, e.g. rows inserted after cancellation).
    IF v_contract_status IN ('cancelled', 'canceled') THEN
      WITH orphan_rows AS (
        UPDATE public.contract_payment_schedules AS schedule
        SET status = 'cancelled',
            invoice_id = NULL,
            updated_at = now()
        WHERE schedule.contract_id = p_contract_id
          AND schedule.company_id = v_company_id
          AND lower(COALESCE(schedule.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
          AND schedule.invoice_id IS NULL
          AND round(COALESCE(schedule.paid_amount, 0)::numeric, 2) <= 0.01
        RETURNING 1
      )
      SELECT count(*) INTO v_rows_cancelled_orphans FROM orphan_rows;
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- STEP 2: Settlement sync — the linked invoice is the authority for
  -- amount, paid_amount, status and paid_date.
  -- ---------------------------------------------------------------
  IF v_do_settlement_sync THEN
    WITH computed AS (
      SELECT
        schedule.id AS schedule_id,
        COALESCE(invoice.total_amount, 0) AS invoice_total,
        LEAST(
          GREATEST(public.canonical_invoice_paid_amount(invoice.id, NULL), 0),
          COALESCE(invoice.total_amount, 0)
        ) AS computed_paid,
        CASE
          WHEN COALESCE(invoice.total_amount, 0)
               - LEAST(
                   GREATEST(public.canonical_invoice_paid_amount(invoice.id, NULL), 0),
                   COALESCE(invoice.total_amount, 0)
                 ) <= 0.01
            THEN 'paid'
          WHEN LEAST(
                 GREATEST(public.canonical_invoice_paid_amount(invoice.id, NULL), 0),
                 COALESCE(invoice.total_amount, 0)
               ) > 0.01
            THEN 'partially_paid'
          WHEN schedule.due_date < CURRENT_DATE
            THEN 'overdue'
          ELSE 'pending'
        END AS computed_status,
        (
          SELECT max(source.payment_date)
          FROM (
            SELECT payment.payment_date
            FROM public.payment_allocations AS allocation
            JOIN public.payments AS payment ON payment.id = allocation.payment_id
            WHERE allocation.allocation_type = 'invoice'
              AND allocation.target_id = invoice.id
              AND allocation.is_active
              AND lower(COALESCE(payment.payment_status, '')) IN (
                'completed', 'paid', 'success', 'succeeded', 'cleared'
              )
              AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
            UNION ALL
            SELECT payment.payment_date
            FROM public.payments AS payment
            WHERE payment.invoice_id = invoice.id
              AND lower(COALESCE(payment.payment_status, '')) IN (
                'completed', 'paid', 'success', 'succeeded', 'cleared'
              )
              AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
              AND NOT EXISTS (
                SELECT 1 FROM public.payment_allocations AS allocation
                WHERE allocation.payment_id = payment.id
                  AND allocation.is_active
              )
          ) AS source
        ) AS computed_paid_date
      FROM public.contract_payment_schedules AS schedule
      JOIN public.invoices AS invoice
        ON invoice.id = schedule.invoice_id
       AND invoice.contract_id = schedule.contract_id
       AND invoice.company_id = schedule.company_id
       AND lower(COALESCE(invoice.status, '')) NOT IN (
         'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
       )
      WHERE schedule.contract_id = p_contract_id
        AND schedule.company_id = v_company_id
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND schedule.invoice_id IS NOT NULL
    ),
    updates AS (
      UPDATE public.contract_payment_schedules AS schedule
      SET
        amount = round(computed.invoice_total::numeric, 2),
        paid_amount = round(computed.computed_paid::numeric, 2),
        status = computed.computed_status,
        paid_date = CASE
          WHEN computed.computed_status = 'paid' THEN computed.computed_paid_date
          ELSE NULL
        END,
        updated_at = now()
      FROM computed
      WHERE schedule.id = computed.schedule_id
        AND (
          round(COALESCE(schedule.amount, 0)::numeric, 2)
            IS DISTINCT FROM round(computed.invoice_total::numeric, 2)
          OR round(COALESCE(schedule.paid_amount, 0)::numeric, 2)
            IS DISTINCT FROM round(computed.computed_paid::numeric, 2)
          OR lower(COALESCE(schedule.status, '')) IS DISTINCT FROM computed.computed_status
          OR COALESCE(schedule.paid_date, NULL) IS DISTINCT FROM
               CASE WHEN computed.computed_status = 'paid'
                    THEN computed.computed_paid_date ELSE NULL END
        )
      RETURNING 1
    )
    SELECT count(*) INTO v_rows_settlement_synced FROM updates;
  END IF;

  SELECT count(*) INTO v_rows_amount_synced WHERE false;  -- folded into settlement sync

  v_report := jsonb_build_object(
    'contract_id', p_contract_id,
    'rows_linked', v_rows_linked,
    'rows_detached_dead', v_rows_detached_dead,
    'rows_cancelled_orphans', v_rows_cancelled_orphans,
    'rows_settlement_synced', v_rows_settlement_synced,
    'changed',
      v_rows_linked > 0 OR v_rows_detached_dead > 0
      OR v_rows_cancelled_orphans > 0 OR v_rows_settlement_synced > 0
  );

  RETURN v_report;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_contract_schedules_v1(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_contract_schedules_v1(uuid, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.reconcile_contract_schedules_v1(uuid, jsonb) IS
  'Single authority that repairs schedule invoice links and syncs schedule settlement fields from the canonical invoice/payment facts of one contract.';

-- ===== 2. Stop the month-matching trigger from attaching wrong rows =====
-- sync_payment_schedule_with_invoice() picks "the first schedule of the same
-- month" and overwrites its invoice_id — with two same-month rows it attaches
-- to the wrong one, and with a cancelled invoice it keeps a dead link. Both
-- behaviours are exactly what reconcile_contract_schedules_v1 exists to fix,
-- and its cron sweep would undo/redo the trigger on every run. The INSERT
-- path of the graph generator already sets invoice_id explicitly, so the
-- trigger is redundant for it. Drop the trigger, keep the function (other
-- legacy callers may reference it), and let reconciliation own this field.
DROP TRIGGER IF EXISTS trg_sync_schedule_with_invoice ON public.invoices;
DROP TRIGGER IF EXISTS trg_sync_schedule_with_invoice_insert ON public.invoices;
DROP TRIGGER IF EXISTS trigger_sync_schedule_on_invoice ON public.invoices;
DROP TRIGGER IF EXISTS trigger_sync_schedule_with_invoice ON public.invoices;

-- ===== 3. Invoice cancellation must detach schedule links =====
-- cancel_invoice_with_reversal already runs inside the same transaction; a
-- trigger on the invoice UPDATE captures the cancellation and detaches any
-- active schedule pointing at the now-dead invoice. The schedule itself
-- remains active (the obligation stands); only the link is severed, and the
-- reconciliation authority will re-link the correct invoice later.
CREATE OR REPLACE FUNCTION public.detach_schedules_on_invoice_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF lower(COALESCE(NEW.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
     OR lower(COALESCE(NEW.payment_status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
  THEN
    UPDATE public.contract_payment_schedules AS schedule
    SET invoice_id = NULL,
        updated_at = now()
    WHERE schedule.invoice_id = NEW.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detach_schedules_on_invoice_cancel ON public.invoices;
CREATE TRIGGER trg_detach_schedules_on_invoice_cancel
  AFTER UPDATE OF status, payment_status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.detach_schedules_on_invoice_cancel();

-- ===== 4. Details-page gateway delegates its schedule work to the authority =====
-- (refresh_contract_financial_state_v1 keeps its invoice/header recalculation;
-- its inline schedule reconciliation block is now redundant — the authority is
-- called right after. Kept as a thin wrapper to avoid touching the app layer.)
CREATE OR REPLACE FUNCTION public.refresh_contract_financial_state_v1(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_jwt_role text := COALESCE(
    current_setting('request.jwt.claim.role', true),
    auth.jwt() ->> 'role',
    ''
  );
  v_contract_before public.contracts%ROWTYPE;
  v_contract_after public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_schedule_report jsonb;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'contract id is required' USING ERRCODE = '22023';
  END IF;

  IF v_actor IS NULL AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'authenticated user is required' USING ERRCODE = '42501';
  END IF;

  SELECT contract.*
  INTO v_contract_before
  FROM public.contracts AS contract
  WHERE contract.id = p_contract_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contract not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.user_id = v_actor
      AND profile.company_id = v_contract_before.company_id
      AND COALESCE(profile.is_active, true)
  ) THEN
    RAISE EXCEPTION 'contract is outside the current company scope'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Recalculate every active invoice of this contract from canonical facts.
  FOR v_invoice_id IN
    SELECT invoice.id
    FROM public.invoices AS invoice
    WHERE invoice.contract_id = p_contract_id
      AND invoice.company_id = v_contract_before.company_id
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
    ORDER BY invoice.id
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  -- 2. Recalculate the contract header totals.
  PERFORM public.recalculate_contract_financial_state(p_contract_id);

  -- 3. Delegate ALL schedule derived state to the single authority.
  v_schedule_report := public.reconcile_contract_schedules_v1(
    p_contract_id,
    jsonb_build_object('link_repair', true, 'settlement_sync', true)
  );

  SELECT contract.*
  INTO STRICT v_contract_after
  FROM public.contracts AS contract
  WHERE contract.id = p_contract_id;

  RETURN jsonb_build_object(
    'contract_id', p_contract_id,
    'contract_number', v_contract_after.contract_number,
    'changed',
      round(COALESCE(v_contract_before.total_paid, 0)::numeric, 2)
        IS DISTINCT FROM round(COALESCE(v_contract_after.total_paid, 0)::numeric, 2)
      OR round(COALESCE(v_contract_before.balance_due, 0)::numeric, 2)
        IS DISTINCT FROM round(COALESCE(v_contract_after.balance_due, 0)::numeric, 2)
      OR COALESCE(v_contract_before.payment_status, '')
        IS DISTINCT FROM COALESCE(v_contract_after.payment_status, '')
      OR COALESCE((v_schedule_report ->> 'changed')::boolean, false),
    'schedules', v_schedule_report,
    'before', jsonb_build_object(
      'total_paid', COALESCE(v_contract_before.total_paid, 0),
      'balance_due', COALESCE(v_contract_before.balance_due, 0),
      'payment_status', v_contract_before.payment_status
    ),
    'after', jsonb_build_object(
      'total_paid', COALESCE(v_contract_after.total_paid, 0),
      'balance_due', COALESCE(v_contract_after.balance_due, 0),
      'payment_status', v_contract_after.payment_status
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_contract_financial_state_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_contract_financial_state_v1(uuid)
  TO authenticated, service_role;

-- ===== 5. Nightly self-healing sweep across all billable contracts =====
-- The authority is deterministic and idempotent, so a nightly pass guarantees
-- derived state can never drift for more than a day even if an unknown write
-- path appears. Also covers non-billable contracts for orphan cleanup.
CREATE OR REPLACE FUNCTION public.reconcile_all_contract_schedules()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer := 0;
  v_changed integer := 0;
  v_contract_id uuid;
  v_report jsonb;
  v_summary jsonb := '{}'::jsonb;
BEGIN
  FOR v_contract_id IN
    SELECT DISTINCT contract.id
    FROM public.contracts AS contract
    JOIN public.contract_payment_schedules AS schedule
      ON schedule.contract_id = contract.id
     AND lower(COALESCE(schedule.status, '')) NOT IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
    ORDER BY contract.id
  LOOP
    v_total := v_total + 1;
    v_report := public.reconcile_contract_schedules_v1(
      v_contract_id,
      jsonb_build_object('link_repair', true, 'settlement_sync', true)
    );
    IF COALESCE((v_report ->> 'changed')::boolean, false) THEN
      v_changed := v_changed + 1;
      v_summary := v_summary
        || jsonb_build_object(v_contract_id::text, v_report);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'contracts_checked', v_total,
    'contracts_changed', v_changed,
    'reports', v_summary
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_all_contract_schedules()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_all_contract_schedules()
  TO service_role;

SELECT cron.schedule(
  'reconcile-contract-schedules-nightly',
  '15 1 * * *',  -- 01:15 UTC daily (04:15 Doha)
  $$SELECT public.reconcile_all_contract_schedules()$$
);