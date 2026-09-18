BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.payments, public.invoices, public.contract_payment_schedules, public.contracts IN ACCESS EXCLUSIVE MODE;
-- Operational rollback preserves reconciliation history and held obligations.
-- Release holds only through an independently reviewed resolution; never silently restore billing.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.contract_payment_schedules WHERE financial_hold_reason IS NOT NULL) THEN
  RAISE EXCEPTION 'Resolve or explicitly preserve held obligations before restoring legacy billing writers; activation rollback can pause processing without losing evidence';
 END IF;
END; $$;
DROP TRIGGER sync_schedule_after_invoice_settlement_v1 ON public.invoices;
DROP TRIGGER guard_financial_schedule_link_insert_v1 ON public.contract_payment_schedules;
DROP TRIGGER guard_financial_schedule_link_update_v1 ON public.contract_payment_schedules;
DROP TRIGGER guard_invoice_held_obligation_insert_v1 ON public.invoices;
DROP TRIGGER guard_invoice_held_obligation_update_v1 ON public.invoices;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.payments;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.payment_allocations;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.invoices;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.contract_payment_schedules;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.contracts;
UPDATE public.contract_financial_reconciliation_controls SET enabled=false,updated_at=now();
REVOKE ALL ON FUNCTION public.request_contract_financial_reconciliation_v1(uuid,uuid) FROM authenticated;
DROP FUNCTION public.sync_schedule_after_invoice_settlement_v1();
CREATE OR REPLACE FUNCTION public.auto_link_invoice_to_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_schedule_id UUID;
BEGIN
  -- فقط للفواتير المرتبطة بعقد
  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- البحث عن قسط غير مرتبط لنفس الشهر
  SELECT id INTO v_schedule_id
  FROM contract_payment_schedules
  WHERE contract_id = NEW.contract_id
    AND invoice_id IS NULL
    AND DATE_TRUNC('month', due_date)::DATE = NEW.invoice_month
  LIMIT 1;
  
  IF v_schedule_id IS NOT NULL THEN
    UPDATE contract_payment_schedules
    SET 
      invoice_id = NEW.id,
      status = CASE 
        WHEN COALESCE(NEW.paid_amount, 0) >= NEW.total_amount THEN 'paid'
        WHEN COALESCE(NEW.paid_amount, 0) > 0 THEN 'partially_paid'
        WHEN NEW.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'pending'
      END,
      paid_amount = COALESCE(NEW.paid_amount, 0),
      updated_at = NOW()
    WHERE id = v_schedule_id;
  END IF;
  
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.cancel_contract_future_schedules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(COALESCE(NEW.status, '')) IN ('cancelled', 'canceled')
     AND lower(COALESCE(OLD.status, '')) NOT IN ('cancelled', 'canceled')
  THEN
    -- Future unpaid unlinked rows become cancelled with the contract.
    UPDATE public.contract_payment_schedules AS schedule
    SET status = 'cancelled',
        invoice_id = NULL,
        updated_at = now()
    WHERE schedule.contract_id = NEW.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND schedule.invoice_id IS NULL
      AND round(COALESCE(schedule.paid_amount, 0)::numeric, 2) <= 0.01;

    -- Rows linked to a dead invoice cannot prove settlement; cancel and detach.
    UPDATE public.contract_payment_schedules AS schedule
    SET status = 'cancelled',
        invoice_id = NULL,
        updated_at = now()
    WHERE schedule.contract_id = NEW.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND EXISTS (
        SELECT 1
        FROM public.invoices AS invoice
        WHERE invoice.id = schedule.invoice_id
          AND lower(COALESCE(invoice.status, '')) IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted'
          )
      );
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.detach_schedules_on_invoice_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.reconcile_contract_rental_schedule_invoice_state(p_company_id uuid, p_contract_id uuid, p_affected_invoice_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_schedule public.contract_payment_schedules%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_candidate_ids uuid[];
  v_paid numeric;
  v_status text;
  v_paid_date date;
  v_updated integer := 0;
  v_relinked integer := 0;
  v_amount_normalized integer := 0;
  v_ambiguous_months date[] := ARRAY[]::date[];
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL THEN
    RETURN jsonb_build_object(
      'updated', 0,
      'relinked', 0,
      'amounts_normalized', 0,
      'ambiguous_months', '[]'::jsonb
    );
  END IF;

  FOR v_schedule IN
    SELECT schedule.*
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = p_company_id
      AND schedule.contract_id = p_contract_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND (
        p_affected_invoice_ids IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.invoices affected
          WHERE affected.id = ANY(COALESCE(p_affected_invoice_ids, ARRAY[]::uuid[]))
            AND affected.company_id = p_company_id
            AND affected.contract_id = p_contract_id
            AND date_trunc(
              'month',
              COALESCE(affected.invoice_month, affected.due_date, affected.invoice_date)::timestamp without time zone
            )::date = date_trunc(
              'month',
              schedule.due_date::timestamp without time zone
            )::date
        )
      )
    ORDER BY schedule.due_date, schedule.installment_number, schedule.id
    FOR UPDATE OF schedule
  LOOP
    SELECT array_agg(invoice.id ORDER BY invoice.created_at, invoice.id)
    INTO v_candidate_ids
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = p_contract_id
      AND invoice.penalty_id IS NULL
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.due_date, invoice.invoice_date)::timestamp without time zone
      )::date = date_trunc(
        'month',
        v_schedule.due_date::timestamp without time zone
      )::date
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );

    IF COALESCE(cardinality(v_candidate_ids), 0) = 0 THEN
      CONTINUE;
    END IF;

    IF cardinality(v_candidate_ids) > 1 THEN
      v_ambiguous_months := array_append(
        v_ambiguous_months,
        date_trunc('month', v_schedule.due_date::timestamp without time zone)::date
      );
      CONTINUE;
    END IF;

    SELECT invoice.*
    INTO STRICT v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_candidate_ids[1]
      AND invoice.company_id = p_company_id
      AND invoice.contract_id = p_contract_id
    FOR UPDATE;

    v_paid := round(
      GREATEST(public.canonical_invoice_paid_amount(v_invoice.id, NULL), 0)::numeric,
      2
    );

    v_status := CASE
      WHEN v_paid >= COALESCE(v_invoice.total_amount, 0) - 0.01 THEN 'paid'
      WHEN v_paid > 0.01 THEN 'partially_paid'
      WHEN v_schedule.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END;

    v_paid_date := NULL;
    IF v_status = 'paid' THEN
      SELECT max(source.payment_date)
      INTO v_paid_date
      FROM (
        SELECT payment.payment_date
        FROM public.payments payment
        WHERE payment.company_id = p_company_id
          AND payment.invoice_id = v_invoice.id
          AND lower(COALESCE(payment.payment_status, '')) IN (
            'completed', 'paid', 'success', 'succeeded', 'cleared'
          )
          AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
          AND NOT EXISTS (
            SELECT 1
            FROM public.payment_allocations allocation
            WHERE allocation.company_id = p_company_id
              AND allocation.payment_id = payment.id
              AND allocation.is_active = true
          )

        UNION ALL

        SELECT payment.payment_date
        FROM public.payment_allocations allocation
        JOIN public.payments payment
          ON payment.id = allocation.payment_id
         AND payment.company_id = p_company_id
        WHERE allocation.company_id = p_company_id
          AND allocation.allocation_type = 'invoice'
          AND allocation.target_id = v_invoice.id
          AND allocation.is_active = true
          AND lower(COALESCE(payment.payment_status, '')) IN (
            'completed', 'paid', 'success', 'succeeded', 'cleared'
          )
          AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      ) source;
    END IF;

    IF v_schedule.invoice_id IS DISTINCT FROM v_invoice.id THEN
      v_relinked := v_relinked + 1;
    END IF;
    IF round(COALESCE(v_schedule.amount, 0)::numeric, 2)
       IS DISTINCT FROM round(COALESCE(v_invoice.total_amount, 0)::numeric, 2)
    THEN
      v_amount_normalized := v_amount_normalized + 1;
    END IF;

    IF v_schedule.invoice_id IS DISTINCT FROM v_invoice.id
       OR round(COALESCE(v_schedule.amount, 0)::numeric, 2)
          IS DISTINCT FROM round(COALESCE(v_invoice.total_amount, 0)::numeric, 2)
       OR round(COALESCE(v_schedule.paid_amount, 0)::numeric, 2)
          IS DISTINCT FROM LEAST(v_paid, COALESCE(v_invoice.total_amount, v_paid))
       OR COALESCE(v_schedule.status, '') IS DISTINCT FROM v_status
       OR v_schedule.paid_date IS DISTINCT FROM v_paid_date
    THEN
      UPDATE public.contract_payment_schedules schedule
      SET invoice_id = v_invoice.id,
          amount = round(v_invoice.total_amount::numeric, 2),
          paid_amount = LEAST(v_paid, COALESCE(v_invoice.total_amount, v_paid)),
          paid_date = v_paid_date,
          status = v_status,
          updated_at = now()
      WHERE schedule.id = v_schedule.id
        AND schedule.company_id = p_company_id
        AND schedule.contract_id = p_contract_id;

      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'relinked', v_relinked,
    'amounts_normalized', v_amount_normalized,
    'ambiguous_months', to_jsonb(v_ambiguous_months)
  );
END;
$function$;
CREATE OR REPLACE FUNCTION public.reconcile_contract_schedules_v1(p_contract_id uuid, p_options jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_company_id uuid;
  v_contract_status text;
  v_rows_linked integer := 0;
  v_rows_detached_dead integer := 0;
  v_rows_cancelled_orphans integer := 0;
  v_rows_settlement_synced integer := 0;
  v_report jsonb;
  v_do_link_repair boolean := COALESCE((p_options ->> 'link_repair')::boolean, true);
  v_do_settlement_sync boolean := COALESCE((p_options ->> 'settlement_sync')::boolean, true);
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'contract id is required' USING ERRCODE = '22023';
  END IF;

  SELECT contract.company_id,
         lower(COALESCE(contract.status, ''))
    INTO v_company_id, v_contract_status
  FROM public.contracts AS contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contract not found' USING ERRCODE = 'P0002';
  END IF;

  -- STEP 1a: re-link unlinked schedules that have a canonical invoice.
  IF v_do_link_repair THEN
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

    -- STEP 1b: detach links to dead invoices.
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

    -- STEP 1c: cancelled contracts — sweep orphan future unpaid unlinked rows.
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

  -- STEP 2: settlement sync from the linked invoice (the authority).
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
$function$;
CREATE OR REPLACE FUNCTION public.contract_financial_self_healing_sweep()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_reconcile_before jsonb;
  v_generation jsonb;
  v_reconcile_after jsonb;
BEGIN
  v_reconcile_before := public.reconcile_all_contract_schedules();
  v_generation := public.generate_due_contract_invoices_v1(
    jsonb_build_object('dry_run', false)
  );
  v_reconcile_after := public.reconcile_all_contract_schedules();

  RETURN jsonb_build_object(
    'reconcile_before', v_reconcile_before,
    'generation', v_generation,
    'reconcile_after', v_reconcile_after
  );
END;
$function$;
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_id uuid;
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_payment_id := NEW.id;
    IF NEW.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, NEW.invoice_id); END IF;
    IF NEW.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, NEW.contract_id); END IF;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_payment_id := OLD.id;
    IF OLD.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, OLD.invoice_id); END IF;
    IF OLD.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, OLD.contract_id); END IF;
  END IF;

  SELECT
    v_invoice_ids || COALESCE(array_agg(DISTINCT allocation.target_id), ARRAY[]::uuid[])
  INTO v_invoice_ids
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = v_payment_id
    AND allocation.allocation_type = 'invoice';

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_invoice_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
    SELECT invoice.contract_id INTO v_contract_id
    FROM public.invoices invoice WHERE invoice.id = v_invoice_id;
    IF v_contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, v_contract_id);
    END IF;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_contract_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.generate_due_contract_invoices_v1(p_options jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_dry_run boolean := COALESCE((p_options ->> 'dry_run')::boolean, false);
  v_contract_filter uuid := NULLIF(p_options ->> 'contract_id', '')::uuid;
  v_contract_id uuid;
  v_schedule record;
  v_invoice_id uuid;
  v_created integer := 0;
  v_linked integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_processed_contracts integer := 0;
BEGIN
  FOR v_contract_id IN
    SELECT DISTINCT contract.id
    FROM public.contracts AS contract
    JOIN public.contract_payment_schedules AS schedule
      ON schedule.contract_id = contract.id
     AND schedule.company_id = contract.company_id
     AND lower(COALESCE(schedule.status, '')) NOT IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
     AND schedule.invoice_id IS NULL
     AND schedule.due_date IS NOT NULL
     AND schedule.due_date <= CURRENT_DATE
     AND round(COALESCE(schedule.amount, 0)::numeric, 2) > 0.01
    WHERE lower(COALESCE(contract.status, '')) IN ('active', 'under_legal_procedure')
      AND (v_contract_filter IS NULL OR contract.id = v_contract_filter)
    ORDER BY contract.id
  LOOP
    v_processed_contracts := v_processed_contracts + 1;

    FOR v_schedule IN
      SELECT schedule.id, schedule.due_date, schedule.amount, schedule.company_id
      FROM public.contract_payment_schedules AS schedule
      WHERE schedule.contract_id = v_contract_id
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND schedule.invoice_id IS NULL
        AND schedule.due_date IS NOT NULL
        AND schedule.due_date <= CURRENT_DATE
        AND round(COALESCE(schedule.amount, 0)::numeric, 2) > 0.01
      ORDER BY schedule.due_date
    LOOP
      IF EXISTS (
        SELECT 1
        FROM public.contract_payment_schedules AS other
        WHERE other.contract_id = v_contract_id
          AND other.id <> v_schedule.id
          AND date_trunc('month', other.due_date) = date_trunc('month', v_schedule.due_date)
          AND lower(COALESCE(other.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
      ) THEN
        v_skipped := v_skipped || jsonb_build_object(
          'contract_id', v_contract_id,
          'schedule_id', v_schedule.id,
          'reason', 'duplicate_month_requires_review'
        );
        CONTINUE;
      END IF;

      IF public.system_agent_date_in_closed_period(
           v_schedule.company_id, v_schedule.due_date
         )
      THEN
        v_skipped := v_skipped || jsonb_build_object(
          'contract_id', v_contract_id,
          'schedule_id', v_schedule.id,
          'reason', 'closed_accounting_period'
        );
        CONTINUE;
      END IF;

      IF v_dry_run THEN
        v_created := v_created + 1;
        CONTINUE;
      END IF;

      BEGIN
        v_invoice_id := public.system_generate_invoice_for_contract_month_core(
          v_contract_id,
          date_trunc('month', v_schedule.due_date)::date
        );

        IF v_invoice_id IS NULL THEN
          v_skipped := v_skipped || jsonb_build_object(
            'contract_id', v_contract_id,
            'schedule_id', v_schedule.id,
            'reason', 'core_returned_no_invoice'
          );
        ELSE
          IF NOT EXISTS (
            SELECT 1
            FROM public.invoices AS invoice
            WHERE invoice.id = v_invoice_id
              AND invoice.contract_id = v_contract_id
              AND invoice.penalty_id IS NULL
              AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
              AND date_trunc(
                    'month',
                    COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
                  )::date = date_trunc('month', v_schedule.due_date)::date
              AND abs(invoice.total_amount - v_schedule.amount) <= 0.01
              AND lower(COALESCE(invoice.status, '')) NOT IN (
                'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
              )
          ) THEN
            RAISE EXCEPTION 'generated invoice identity or amount mismatch';
          END IF;

          IF NOT public.system_invoice_has_single_balanced_posted_journal(
               v_schedule.company_id, v_invoice_id, v_schedule.amount
             )
          THEN
            RAISE EXCEPTION 'generated invoice lacks a balanced posted journal';
          END IF;

          UPDATE public.contract_payment_schedules AS schedule
          SET invoice_id = v_invoice_id,
              updated_at = now()
          WHERE schedule.id = v_schedule.id
            AND schedule.invoice_id IS NULL;

          IF FOUND THEN
            v_linked := v_linked + 1;
          END IF;

          v_created := v_created + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors || jsonb_build_object(
          'contract_id', v_contract_id,
          'schedule_id', v_schedule.id,
          'error', SQLERRM
        );
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'contracts_processed', v_processed_contracts,
    'invoices_created', v_created,
    'schedules_linked', v_linked,
    'skipped', v_skipped,
    'errors', v_errors
  );
END;
$function$;
CREATE TRIGGER contract_payment_delete_trigger AFTER DELETE ON public.payments FOR EACH ROW WHEN ((old.contract_id IS NOT NULL)) EXECUTE FUNCTION update_contract_payment_totals();
CREATE TRIGGER contract_payment_insert_trigger AFTER INSERT ON public.payments FOR EACH ROW WHEN ((new.contract_id IS NOT NULL)) EXECUTE FUNCTION update_contract_payment_totals();
CREATE TRIGGER contract_payment_update_trigger AFTER UPDATE ON public.payments FOR EACH ROW WHEN ((((old.contract_id IS NOT NULL) OR (new.contract_id IS NOT NULL)) AND ((old.payment_status <> new.payment_status) OR (old.amount <> new.amount) OR (old.contract_id <> new.contract_id) OR (old.company_id <> new.company_id)))) EXECUTE FUNCTION update_contract_payment_totals();
CREATE TRIGGER invoice_payment_delete_trigger AFTER DELETE ON public.payments FOR EACH ROW WHEN ((old.invoice_id IS NOT NULL)) EXECUTE FUNCTION update_invoice_payment_totals();
CREATE TRIGGER invoice_payment_insert_trigger AFTER INSERT ON public.payments FOR EACH ROW WHEN ((new.invoice_id IS NOT NULL)) EXECUTE FUNCTION update_invoice_payment_totals();
CREATE TRIGGER invoice_payment_update_trigger AFTER UPDATE ON public.payments FOR EACH ROW WHEN ((((old.invoice_id IS NOT NULL) OR (new.invoice_id IS NOT NULL)) AND ((old.payment_status <> new.payment_status) OR (old.amount <> new.amount) OR (old.invoice_id <> new.invoice_id) OR (old.company_id <> new.company_id)))) EXECUTE FUNCTION update_invoice_payment_totals();
CREATE TRIGGER payments_update_contract_balance AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_contract_balance();
CREATE TRIGGER trg_sync_payment_invoice BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION sync_payment_with_invoice();
CREATE TRIGGER trigger_update_invoice_on_payment AFTER INSERT OR UPDATE OF amount, payment_status ON public.payments FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();
CREATE TRIGGER trigger_update_schedule_on_payment AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW WHEN (((new.invoice_id IS NOT NULL) AND (new.payment_status = 'completed'::text))) EXECUTE FUNCTION update_schedule_on_payment();
CREATE TRIGGER trg_sync_receipt_on_invoice_update AFTER UPDATE OF payment_status, paid_amount ON public.invoices FOR EACH ROW EXECUTE FUNCTION sync_receipt_on_invoice_update();
COMMIT;
