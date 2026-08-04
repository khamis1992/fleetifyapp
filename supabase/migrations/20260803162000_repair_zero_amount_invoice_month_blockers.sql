-- Retire truly empty active invoice placeholders and reissue them through the
-- canonical INSERT path. This preserves the original audit row and lets the
-- invoice journal trigger post the correct positive receivable/revenue entry.
-- Anything with financial, approval, or review history remains manual-only.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.generate_invoice_for_contract_month(uuid,date)') IS NULL THEN
    RAISE EXCEPTION 'generate_invoice_for_contract_month(uuid,date) is required';
  END IF;
  IF to_regprocedure('public.generate_invoice_for_contract_month_before_zero_repair(uuid,date)') IS NOT NULL THEN
    RAISE EXCEPTION 'zero-amount invoice repair wrapper is already installed';
  END IF;
END;
$$;

ALTER FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  RENAME TO generate_invoice_for_contract_month_before_zero_repair;

CREATE FUNCTION public.system_invoice_has_single_balanced_posted_journal(
  p_company_id uuid,
  p_invoice_id uuid,
  p_expected_amount numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    count(*) = 1
    AND bool_and(
      lower(COALESCE(entry.status, '')) = 'posted'
      AND abs(COALESCE(entry.total_debit, 0) - p_expected_amount) <= 0.01
      AND abs(COALESCE(entry.total_credit, 0) - p_expected_amount) <= 0.01
      AND (
        SELECT count(*)
        FROM public.journal_entry_lines line
        WHERE line.journal_entry_id = entry.id
      ) >= 2
      AND abs(
        COALESCE((
          SELECT sum(COALESCE(line.debit_amount, 0))
          FROM public.journal_entry_lines line
          WHERE line.journal_entry_id = entry.id
        ), 0) - p_expected_amount
      ) <= 0.01
      AND abs(
        COALESCE((
          SELECT sum(COALESCE(line.credit_amount, 0))
          FROM public.journal_entry_lines line
          WHERE line.journal_entry_id = entry.id
        ), 0) - p_expected_amount
      ) <= 0.01
    ),
    false
  )
  FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id
    AND entry.reference_type = 'invoice'
    AND entry.reference_id = p_invoice_id;
$$;

REVOKE ALL ON FUNCTION public.system_invoice_has_single_balanced_posted_journal(uuid, uuid, numeric)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.system_agent_resolve_invoice_month_findings(
  p_company_id uuid,
  p_contract_id uuid,
  p_invoice_id uuid,
  p_invoice_month date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_month date := date_trunc('month', p_invoice_month)::date;
  v_invoice_amount numeric;
  v_updated integer := 0;
BEGIN
  SELECT invoice.total_amount
  INTO v_invoice_amount
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
    AND invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date = v_month
    AND COALESCE(invoice.total_amount, 0) > 0.01
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF NOT FOUND
     OR NOT public.system_invoice_has_single_balanced_posted_journal(
       p_company_id,
       p_invoice_id,
       v_invoice_amount
     )
  THEN
    RETURN 0;
  END IF;

  -- The canonical generator is the common success boundary used by the
  -- monthly reconciler, scheduled generator, historical backfill, and UI.
  -- Resolve only findings whose exact contract/month postcondition is now
  -- proven, so a repair through any path cannot leave a stale human task.
  UPDATE public.system_agent_findings finding
  SET status = 'repaired',
      error = NULL,
      details = CASE finding.code
        WHEN 'contract.missing_billing_graph'
          THEN 'The canonical billing graph now contains a positive journaled invoice.'
        WHEN 'invoice.zero_amount_blocks_billing_month'
          THEN 'The zero-amount month blocker was safely replaced by a positive journaled invoice.'
        ELSE 'A positive active invoice with a balanced posted journal now exists for the canonical month.'
      END,
      evidence = COALESCE(finding.evidence, '{}'::jsonb) || jsonb_build_object(
        'resolved_invoice_id', p_invoice_id,
        'resolved_target_month', v_month,
        'resolved_by', 'generate_invoice_for_contract_month',
        'resolved_at', now()
      ),
      updated_at = now()
  WHERE finding.company_id = p_company_id
    AND finding.status IN ('detected', 'planned', 'repairing', 'review', 'failed')
    AND (
      (
        finding.code = 'invoice.month_reconciliation_needs_review'
        AND finding.entity_type IN ('contract', 'contracts')
        AND finding.entity_id = p_contract_id::text
        AND finding.evidence ->> 'target_month' = v_month::text
      )
      OR (
        finding.code = 'invoice.zero_amount_blocks_billing_month'
        AND finding.evidence ->> 'contractId' = p_contract_id::text
        AND left(COALESCE(finding.evidence ->> 'invoiceMonth', ''), 7) = to_char(v_month, 'YYYY-MM')
      )
      OR (
        finding.code = 'contract.missing_billing_graph'
        AND finding.entity_type IN ('contract', 'contracts')
        AND finding.entity_id = p_contract_id::text
      )
    );
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_resolve_invoice_month_findings(uuid, uuid, uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;

-- Authorization belongs to the public wrapper below. This implementation is
-- deliberately ungranted and can only run with the wrapper owner's effective
-- privileges, so nested employee-workspace calls do not hit the legacy
-- finance-only authorization check a second time.
CREATE FUNCTION public.system_generate_invoice_for_contract_month_core(
  p_contract_id uuid,
  p_invoice_month date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_total_amount numeric(15,3);
  v_invoice_date date;
  v_schedule_id uuid;
  v_actor uuid := auth.uid();
  v_company_currency text;
  v_month date := date_trunc('month', p_invoice_month)::date;
BEGIN
  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id USING ERRCODE = 'P0001';
  END IF;

  IF v_contract.start_date > (v_month + interval '1 month - 1 day')::date
     OR v_contract.end_date < v_month
  THEN
    RETURN NULL;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_contract.company_id::text || ':invoice:' || to_char(v_month, 'YYYY-MM'),
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = v_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT schedule.id, schedule.amount, schedule.due_date
  INTO v_schedule_id, v_total_amount, v_invoice_date
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = v_contract.id
    AND schedule.company_id = v_contract.company_id
    AND date_trunc('month', schedule.due_date)::date = v_month
    AND COALESCE(schedule.amount, 0) > 0.01
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY schedule.installment_number NULLS LAST, schedule.due_date, schedule.id
  LIMIT 1
  FOR UPDATE OF schedule;

  IF v_schedule_id IS NULL OR COALESCE(v_total_amount, 0) <= 0.01 THEN
    RAISE EXCEPTION 'Contract month requires one positive active schedule'
      USING ERRCODE = 'P0001';
  END IF;

  v_invoice_date := greatest(v_invoice_date, v_contract.start_date);

  SELECT COALESCE(NULLIF(company.currency, ''), 'QAR')
  INTO v_company_currency
  FROM public.companies company
  WHERE company.id = v_contract.company_id;

  SELECT 'INV-' || to_char(v_month, 'YYYYMM') || '-' ||
         lpad((COALESCE(MAX(CAST(substring(invoice.invoice_number FROM 'INV-[0-9]{6}-([0-9]+)') AS integer)), 0) + 1)::text, 5, '0')
  INTO v_invoice_number
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.invoice_number LIKE 'INV-' || to_char(v_month, 'YYYYMM') || '-%';

  INSERT INTO public.invoices (
    company_id, customer_id, contract_id, cost_center_id, invoice_number,
    invoice_date, invoice_month, due_date, total_amount, subtotal, tax_amount,
    discount_amount, paid_amount, balance_due, status, payment_status,
    invoice_type, currency, notes, created_by, created_at, updated_at
  ) VALUES (
    v_contract.company_id, v_contract.customer_id, v_contract.id, v_contract.cost_center_id,
    v_invoice_number, v_invoice_date, v_month, v_invoice_date,
    v_total_amount, v_total_amount, 0, 0, 0, v_total_amount,
    'sent', 'unpaid', 'service', COALESCE(v_company_currency, 'QAR'),
    'Generated for contract billing month ' || to_char(v_month, 'YYYY-MM'),
    v_actor, now(), now()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, line_number, item_description, item_description_ar,
    quantity, unit_price, line_total, tax_rate, tax_amount, cost_center_id
  ) VALUES (
    v_invoice_id, 1,
    'Monthly rental payment - ' || to_char(v_month, 'YYYY-MM'),
    'قسط إيجار شهري - ' || to_char(v_month, 'YYYY-MM'),
    1, v_total_amount, v_total_amount, 0, 0, v_contract.cost_center_id
  );

  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = v_invoice_id,
      updated_at = now()
  WHERE schedule.id = v_schedule_id
    AND schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id;

  RETURN v_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.system_generate_invoice_for_contract_month_core(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.generate_invoice_for_contract_month(
  p_contract_id uuid,
  p_invoice_month date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_result uuid;
  v_invoice public.invoices%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_schedule_id uuid;
  v_amount numeric(15,3);
  v_schedule_due_date date;
  v_item_count integer;
  v_journal_count integer;
  v_affected_rows integer;
  v_month date;
  v_zero_month date;
  v_replacement_id uuid;
  v_repaired_target_id uuid;
  v_validated_zero_count integer := 0;
  v_repaired_count integer := 0;
  v_actor uuid := auth.uid();
  v_jwt_role text := COALESCE(auth.jwt() ->> 'role', '');
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_allowed boolean := false;
  v_employee_workspace_allowed boolean := false;
  v_contract_start_month date;
  v_first_billing_month date;
  v_contract_end_month date;
  v_expected_last_month date;
  v_has_active_start_month boolean := false;
  v_available_months integer;
  v_installment_count integer;
  v_schedule_preview jsonb;
BEGIN
  IF p_contract_id IS NULL OR p_invoice_month IS NULL THEN
    RAISE EXCEPTION 'Contract and invoice month are required' USING ERRCODE = 'P0001';
  END IF;

  v_month := date_trunc('month', p_invoice_month)::date;
  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session AND v_jwt_role <> 'service_role' THEN
    v_allowed := v_actor IS NOT NULL
      AND public.get_user_company_id() IS NOT DISTINCT FROM v_contract.company_id
      AND public.is_finance_action_authorized(
         v_actor,
         v_contract.company_id,
         ARRAY['finance.invoice.create', 'finance.invoices.write'],
         ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
      );

    IF NOT COALESCE(v_allowed, false) THEN
      -- Match the outer schedule/bulk RPC: an active assigned employee may
      -- repair only their own active contract from Employee Workspace.
      v_employee_workspace_allowed :=
        v_jwt_role = 'authenticated'
        AND lower(COALESCE(v_contract.status, '')) = 'active'
        AND EXISTS (
          SELECT 1
          FROM public.profiles profile
          WHERE profile.user_id = v_actor
            AND profile.company_id = v_contract.company_id
            AND COALESCE(profile.is_active, false) = true
            AND profile.id = v_contract.assigned_to_profile_id
        );
    END IF;

    IF NOT COALESCE(v_allowed, false)
       AND NOT COALESCE(v_employee_workspace_allowed, false)
    THEN
      RAISE EXCEPTION 'Not authorized to generate contract invoices'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF lower(COALESCE(v_contract.status, '')) NOT IN ('active', 'under_legal_procedure')
     OR v_contract.start_date IS NULL
     OR v_contract.end_date IS NULL
     OR v_contract.end_date < v_contract.start_date
     OR v_contract.customer_id IS NULL
  THEN
    RAISE EXCEPTION 'contract_month_is_not_billable:%:%', p_contract_id, v_month
      USING ERRCODE = 'P0001';
  END IF;

  v_contract_start_month := date_trunc('month', v_contract.start_date)::date;
  v_contract_end_month := date_trunc('month', v_contract.end_date)::date;
  v_has_active_start_month := EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND date_trunc('month', schedule.due_date)::date = v_contract_start_month
      AND COALESCE(schedule.amount, 0) > 0.01
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = v_contract_start_month
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  );

  v_first_billing_month := CASE
    WHEN v_has_active_start_month THEN v_contract_start_month
    ELSE (v_contract_start_month + INTERVAL '1 month')::date
  END;
  -- A contract fully contained in its start month still has one installment.
  IF v_first_billing_month > v_contract_end_month THEN
    v_first_billing_month := v_contract_start_month;
  END IF;

  v_available_months := (
    (EXTRACT(YEAR FROM v_contract_end_month) - EXTRACT(YEAR FROM v_first_billing_month)) * 12
    + EXTRACT(MONTH FROM v_contract_end_month)
    - EXTRACT(MONTH FROM v_first_billing_month)
    + 1
  )::integer;
  v_installment_count := CASE
    WHEN COALESCE(v_contract.contract_amount, 0) > 0
         AND COALESCE(v_contract.monthly_amount, 0) > 0
      THEN GREATEST(
        1,
        CEIL(
          GREATEST(
            round(v_contract.contract_amount::numeric, 2) - 0.01,
            0
          ) / round(v_contract.monthly_amount::numeric, 2)
        )::integer
      )
    ELSE v_available_months
  END;

  IF v_available_months <= 0
     OR v_installment_count <= 0
     OR v_installment_count > v_available_months
  THEN
    RAISE EXCEPTION 'contract_billing_graph_requires_manual_review:%', p_contract_id
      USING ERRCODE = 'P0001';
  END IF;

  v_expected_last_month := (
    v_first_billing_month + ((v_installment_count - 1)::text || ' months')::interval
  )::date;
  IF v_month < v_first_billing_month OR v_month > v_expected_last_month THEN
    RAISE EXCEPTION
      'invoice_month_outside_expected_contract_graph:%:%:%',
      v_month, v_first_billing_month, v_expected_last_month
      USING ERRCODE = 'P0001';
  END IF;

  -- Pass one locks and validates every active zero placeholder before any row
  -- changes. A later exception rolls back the complete contract repair.
  FOR v_invoice IN
    SELECT invoice.*
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date BETWEEN v_first_billing_month AND v_expected_last_month
      AND abs(COALESCE(invoice.total_amount, 0)) <= 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY
      date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date,
      invoice.created_at,
      invoice.id
    FOR UPDATE OF invoice
  LOOP
    v_validated_zero_count := v_validated_zero_count + 1;
    v_zero_month := date_trunc(
      'month',
      COALESCE(v_invoice.invoice_month, v_invoice.invoice_date)::timestamp without time zone
    )::date;

    IF v_invoice.customer_id IS DISTINCT FROM v_contract.customer_id
       OR v_invoice.cost_center_id IS DISTINCT FROM v_contract.cost_center_id
       OR abs(COALESCE(v_invoice.total_amount, 0)) > 0.01
       OR abs(COALESCE(v_invoice.subtotal, 0)) > 0.01
       OR abs(COALESCE(v_invoice.tax_amount, 0)) > 0.01
       OR abs(COALESCE(v_invoice.discount_amount, 0)) > 0.01
       OR abs(COALESCE(v_invoice.paid_amount, 0)) > 0.01
       OR abs(COALESCE(v_invoice.balance_due, 0)) > 0.01
       OR v_invoice.payment_id IS NOT NULL
       OR COALESCE(v_invoice.manual_review_required, false)
       OR v_invoice.manual_idempotency_key IS NOT NULL
       OR COALESCE(v_invoice.is_legacy, false)
       OR v_invoice.scanned_image_url IS NOT NULL
       OR v_invoice.ocr_data IS NOT NULL
       OR v_invoice.ocr_confidence IS NOT NULL
       OR v_invoice.vendor_id IS NOT NULL
       OR v_invoice.fixed_asset_id IS NOT NULL
       OR v_invoice.approved_at IS NOT NULL
       OR v_invoice.approved_by IS NOT NULL
       OR v_invoice.submitted_for_approval_at IS NOT NULL
       OR v_invoice.submitted_for_approval_by IS NOT NULL
       OR v_invoice.rejected_at IS NOT NULL
       OR v_invoice.rejected_by IS NOT NULL
       OR NULLIF(BTRIM(COALESCE(v_invoice.approval_notes, '')), '') IS NOT NULL
       OR lower(COALESCE(v_invoice.status, '')) <> 'draft'
       OR lower(COALESCE(v_invoice.payment_status, '')) <> 'unpaid'
       OR lower(COALESCE(v_invoice.invoice_type, 'service')) NOT IN (
         'service', 'rental', 'monthly'
       )
    THEN
      RAISE EXCEPTION
        'zero_amount_invoice_requires_manual_review:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM 1
    FROM public.invoice_items item
    WHERE item.invoice_id = v_invoice.id
    FOR UPDATE OF item;

    SELECT count(*)
    INTO v_item_count
    FROM public.invoice_items item
    WHERE item.invoice_id = v_invoice.id;

    IF v_item_count > 1 OR EXISTS (
      SELECT 1
      FROM public.invoice_items item
      WHERE item.invoice_id = v_invoice.id
        AND (
          abs(COALESCE(item.unit_price, 0)) > 0.01
          OR abs(COALESCE(item.line_total, 0)) > 0.01
          OR abs(COALESCE(item.tax_amount, 0)) > 0.01
        )
    ) THEN
      RAISE EXCEPTION
        'zero_amount_invoice_has_nonempty_items:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    -- Any payment/allocation history, including reversed or inactive history,
    -- makes retirement a manual accounting decision.
    PERFORM 1
    FROM public.payments payment
    WHERE payment.company_id = v_contract.company_id
      AND payment.invoice_id = v_invoice.id
    LIMIT 1
    FOR UPDATE OF payment;
    IF FOUND THEN
      RAISE EXCEPTION
        'zero_amount_invoice_has_payment_history:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM 1
    FROM public.payment_allocations allocation
    WHERE allocation.company_id = v_contract.company_id
      AND allocation.allocation_type = 'invoice'
      AND allocation.target_id = v_invoice.id
    LIMIT 1
    FOR UPDATE OF allocation;
    IF FOUND THEN
      RAISE EXCEPTION
        'zero_amount_invoice_has_allocation_history:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    -- Historical approval/OCR rows remain material audit evidence even when
    -- the denormalized invoice flags are empty. Never retire such an invoice
    -- automatically.
    PERFORM 1
    FROM public.invoice_approval_history approval
    WHERE approval.company_id = v_contract.company_id
      AND approval.invoice_id = v_invoice.id
    LIMIT 1
    FOR UPDATE OF approval;
    IF FOUND THEN
      RAISE EXCEPTION
        'zero_amount_invoice_has_approval_history:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM 1
    FROM public.invoice_ocr_logs ocr_log
    WHERE ocr_log.company_id = v_contract.company_id
      AND ocr_log.invoice_id = v_invoice.id
    LIMIT 1
    FOR UPDATE OF ocr_log;
    IF FOUND THEN
      RAISE EXCEPTION
        'zero_amount_invoice_has_ocr_history:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    -- The AFTER INSERT trigger can post a zero journal while leaving the
    -- invoice.journal_entry_id column null. Zero journals are retained as audit
    -- history; any non-zero, reviewed, or reversed journal blocks automation.
    PERFORM 1
    FROM public.journal_entries entry
    WHERE entry.company_id = v_contract.company_id
      AND entry.reference_type = 'invoice'
      AND entry.reference_id = v_invoice.id
    FOR UPDATE OF entry;

    PERFORM 1
    FROM public.journal_entry_status_history history
    JOIN public.journal_entries entry
      ON entry.id = history.journal_entry_id
    WHERE entry.company_id = v_contract.company_id
      AND entry.reference_type = 'invoice'
      AND entry.reference_id = v_invoice.id
    FOR UPDATE OF history;

    SELECT count(*)
    INTO v_journal_count
    FROM public.journal_entries entry
    WHERE entry.company_id = v_contract.company_id
      AND entry.reference_type = 'invoice'
      AND entry.reference_id = v_invoice.id;

    IF v_journal_count > 1 OR EXISTS (
      SELECT 1
      FROM public.journal_entries entry
      WHERE entry.company_id = v_contract.company_id
        AND entry.reference_type = 'invoice'
        AND entry.reference_id = v_invoice.id
        AND (
          abs(COALESCE(entry.total_debit, 0)) > 0.01
          OR abs(COALESCE(entry.total_credit, 0)) > 0.01
          OR entry.reversal_entry_id IS NOT NULL
          OR entry.reversed_at IS NOT NULL
          OR entry.reversed_by IS NOT NULL
          OR entry.reviewed_at IS NOT NULL
          OR entry.reviewed_by IS NOT NULL
          OR entry.updated_by IS NOT NULL
          OR NULLIF(BTRIM(COALESCE(entry.workflow_notes, '')), '') IS NOT NULL
          OR NULLIF(BTRIM(COALESCE(entry.rejection_reason, '')), '') IS NOT NULL
          OR entry.manual_idempotency_key IS NOT NULL
          OR lower(COALESCE(entry.status, '')) = 'reversed'
          OR EXISTS (
            SELECT 1
            FROM public.journal_entry_status_history history
            WHERE history.journal_entry_id = entry.id
          )
          OR EXISTS (
            SELECT 1
            FROM public.journal_entry_lines line
            WHERE line.journal_entry_id = entry.id
              AND (
                abs(COALESCE(line.debit_amount, 0)) > 0.01
                OR abs(COALESCE(line.credit_amount, 0)) > 0.01
              )
          )
        )
    ) OR (
      v_invoice.journal_entry_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.journal_entries entry
        WHERE entry.id = v_invoice.journal_entry_id
          AND entry.company_id = v_contract.company_id
          AND entry.reference_type = 'invoice'
          AND entry.reference_id = v_invoice.id
      )
    ) THEN
      RAISE EXCEPTION
        'zero_amount_invoice_has_nonzero_or_mismatched_journal:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    v_schedule_id := NULL;
    v_amount := NULL;
    v_schedule_due_date := NULL;
    SELECT schedule.id, schedule.amount, schedule.due_date
    INTO v_schedule_id, v_amount, v_schedule_due_date
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND date_trunc('month', schedule.due_date)::date = v_zero_month
      AND COALESCE(schedule.amount, 0) > 0.01
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY schedule.installment_number NULLS LAST, schedule.due_date, schedule.id
    LIMIT 1
    FOR UPDATE OF schedule;

    IF v_schedule_id IS NULL OR COALESCE(v_amount, 0) <= 0.01 THEN
      RAISE EXCEPTION
        'zero_amount_invoice_has_no_positive_schedule:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.id = v_schedule_id
        AND schedule.company_id = v_contract.company_id
        AND (
          abs(COALESCE(schedule.paid_amount, 0)) > 0.01
          OR schedule.paid_date IS NOT NULL
          OR lower(COALESCE(schedule.status, '')) NOT IN (
            'pending', 'unpaid', 'due', 'overdue', 'scheduled'
          )
        )
    ) THEN
      RAISE EXCEPTION
        'zero_amount_invoice_schedule_has_payment_history:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    IF public.system_agent_date_in_closed_period(
      v_contract.company_id,
      v_schedule_due_date
    ) THEN
      RAISE EXCEPTION
        'zero_amount_invoice_month_is_closed:%:%', v_invoice.id, v_zero_month
        USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.company_id = v_contract.company_id
        AND schedule.contract_id = v_contract.id
        AND date_trunc('month', schedule.due_date)::date = v_zero_month
        AND schedule.id <> v_schedule_id
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    ) OR EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.id = v_schedule_id
        AND schedule.company_id = v_contract.company_id
        AND schedule.invoice_id IS NOT NULL
        AND schedule.invoice_id IS DISTINCT FROM v_invoice.id
    ) THEN
      RAISE EXCEPTION
        'zero_amount_invoice_schedule_graph_requires_manual_review:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- Pass two retires each validated placeholder, detaches its schedule, and
  -- creates a new invoice so the INSERT-only journal trigger runs correctly.
  FOR v_invoice IN
    SELECT invoice.*
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date BETWEEN v_first_billing_month AND v_expected_last_month
      AND abs(COALESCE(invoice.total_amount, 0)) <= 0.01
      AND lower(COALESCE(invoice.status, '')) = 'draft'
      AND lower(COALESCE(invoice.payment_status, '')) = 'unpaid'
    ORDER BY
      date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date,
      invoice.created_at,
      invoice.id
    FOR UPDATE OF invoice
  LOOP
    v_zero_month := date_trunc(
      'month',
      COALESCE(v_invoice.invoice_month, v_invoice.invoice_date)::timestamp without time zone
    )::date;

    v_schedule_id := NULL;
    v_amount := NULL;
    v_schedule_due_date := NULL;
    SELECT schedule.id, schedule.amount, schedule.due_date
    INTO v_schedule_id, v_amount, v_schedule_due_date
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND date_trunc('month', schedule.due_date)::date = v_zero_month
      AND COALESCE(schedule.amount, 0) > 0.01
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY schedule.installment_number NULLS LAST, schedule.due_date, schedule.id
    LIMIT 1
    FOR UPDATE OF schedule;

    UPDATE public.invoices invoice
    SET status = 'cancelled',
        payment_status = 'cancelled',
        notes = concat_ws(
          E'\n',
          NULLIF(BTRIM(COALESCE(invoice.notes, '')), ''),
          'Retired empty invoice placeholder; replacement generated for billing month '
            || to_char(v_zero_month, 'YYYY-MM')
        ),
        updated_at = now()
    WHERE invoice.id = v_invoice.id
      AND invoice.company_id = v_contract.company_id
      AND abs(COALESCE(invoice.total_amount, 0)) <= 0.01
      AND lower(COALESCE(invoice.status, '')) = 'draft'
      AND lower(COALESCE(invoice.payment_status, '')) = 'unpaid';
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    IF v_affected_rows <> 1 THEN
      RAISE EXCEPTION 'zero_amount_invoice_changed_during_repair:%', v_invoice.id
        USING ERRCODE = '40001';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = NULL,
        updated_at = now()
    WHERE schedule.id = v_schedule_id
      AND schedule.company_id = v_contract.company_id
      AND (schedule.invoice_id IS NULL OR schedule.invoice_id = v_invoice.id)
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    IF v_affected_rows <> 1 THEN
      RAISE EXCEPTION 'zero_amount_schedule_changed_during_repair:%', v_schedule_id
        USING ERRCODE = '40001';
    END IF;

    v_replacement_id := public.system_generate_invoice_for_contract_month_core(
      p_contract_id,
      v_zero_month
    );
    IF v_replacement_id IS NULL THEN
      RAISE EXCEPTION 'zero_amount_invoice_reissue_failed:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.invoices replacement
      JOIN public.contract_payment_schedules schedule
        ON schedule.id = v_schedule_id
       AND schedule.company_id = v_contract.company_id
       AND schedule.contract_id = v_contract.id
       AND schedule.invoice_id = replacement.id
      WHERE replacement.id = v_replacement_id
        AND replacement.company_id = v_contract.company_id
        AND replacement.contract_id = v_contract.id
        AND date_trunc(
          'month',
          COALESCE(replacement.invoice_month, replacement.invoice_date)::timestamp without time zone
        )::date = v_zero_month
        AND abs(COALESCE(replacement.total_amount, 0) - v_amount) <= 0.01
        AND replacement.due_date = v_schedule_due_date
        AND lower(COALESCE(replacement.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    ) THEN
      RAISE EXCEPTION 'zero_amount_invoice_reissue_postcondition_failed:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    -- The invoice journal trigger deliberately skips companies without valid
    -- mappings. Treat that as a hard accounting failure: a collectible invoice
    -- must never survive this repair without one balanced posted journal.
    IF NOT public.system_invoice_has_single_balanced_posted_journal(
      v_contract.company_id,
      v_replacement_id,
      v_amount
    ) THEN
      RAISE EXCEPTION 'zero_amount_invoice_reissue_journal_postcondition_failed:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM public.system_agent_resolve_invoice_month_findings(
      v_contract.company_id,
      v_contract.id,
      v_replacement_id,
      v_zero_month
    );

    v_repaired_count := v_repaired_count + 1;
    IF v_zero_month = v_month THEN
      v_repaired_target_id := v_replacement_id;
    END IF;
  END LOOP;

  IF v_repaired_count <> v_validated_zero_count THEN
    RAISE EXCEPTION 'zero_amount_invoice_set_changed_during_repair:%', p_contract_id
      USING ERRCODE = '40001';
  END IF;

  IF v_repaired_count > 0 THEN
    v_schedule_preview := public.generate_payment_schedules_for_contract(
      p_contract_id,
      true
    );
    IF COALESCE((v_schedule_preview ->> 'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'contract_schedule_preview_failed:%', p_contract_id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT invoice.*
  INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date = v_month
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY invoice.created_at, invoice.id
  LIMIT 1
  FOR UPDATE OF invoice;

  IF FOUND THEN
    IF COALESCE(v_invoice.total_amount, 0) <= 0.01 THEN
      RAISE EXCEPTION 'zero_amount_invoice_repair_postcondition_failed:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    IF NOT public.system_invoice_has_single_balanced_posted_journal(
      v_contract.company_id,
      v_invoice.id,
      v_invoice.total_amount
    ) THEN
      RAISE EXCEPTION 'existing_positive_invoice_journal_postcondition_failed:%', v_invoice.id
        USING ERRCODE = 'P0001';
    END IF;

    IF v_repaired_count = 0 THEN
      v_schedule_preview := public.generate_payment_schedules_for_contract(
        p_contract_id,
        true
      );
      IF COALESCE((v_schedule_preview ->> 'success')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'contract_schedule_preview_failed:%', p_contract_id
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

    PERFORM public.system_agent_resolve_invoice_month_findings(
      v_contract.company_id,
      v_contract.id,
      v_invoice.id,
      v_month
    );

    RETURN COALESCE(v_repaired_target_id, v_invoice.id);
  END IF;

  -- Materialize the canonical schedule graph before ordinary invoice creation
  -- so the exact installment, including the final remainder, is used.
  v_schedule_preview := public.generate_payment_schedules_for_contract(
    p_contract_id,
    false
  );
  IF COALESCE((v_schedule_preview ->> 'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'contract_schedule_preview_failed:%', p_contract_id
      USING ERRCODE = 'P0001';
  END IF;

  v_schedule_due_date := NULL;
  SELECT schedule.due_date
  INTO v_schedule_due_date
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND date_trunc('month', schedule.due_date)::date = v_month
    AND COALESCE(schedule.amount, 0) > 0.01
    AND abs(COALESCE(schedule.paid_amount, 0)) <= 0.01
    AND schedule.paid_date IS NULL
    AND lower(COALESCE(schedule.status, '')) IN (
      'pending', 'unpaid', 'due', 'overdue', 'scheduled'
    )
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY schedule.installment_number NULLS LAST, schedule.due_date, schedule.id
  LIMIT 1;

  IF v_schedule_due_date IS NULL THEN
    RAISE EXCEPTION 'contract_month_has_no_unpaid_positive_schedule:%:%', p_contract_id, v_month
      USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(
    v_contract.company_id,
    v_schedule_due_date
  ) THEN
    RAISE EXCEPTION 'contract_invoice_month_is_closed:%:%', p_contract_id, v_month
      USING ERRCODE = 'P0001';
  END IF;

  v_result := public.system_generate_invoice_for_contract_month_core(
    p_contract_id,
    v_month
  );
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'contract_invoice_generation_returned_null:%:%', p_contract_id, v_month
      USING ERRCODE = 'P0001';
  END IF;

  SELECT invoice.*
  INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = v_result
    AND invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date = v_month
    AND COALESCE(invoice.total_amount, 0) > 0.01
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  FOR UPDATE OF invoice;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contract_invoice_generation_postcondition_failed:%:%', p_contract_id, v_month
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.system_invoice_has_single_balanced_posted_journal(
    v_contract.company_id,
    v_result,
    v_invoice.total_amount
  ) THEN
    RAISE EXCEPTION 'contract_invoice_journal_postcondition_failed:%', v_result
      USING ERRCODE = 'P0001';
  END IF;
  PERFORM public.system_agent_resolve_invoice_month_findings(
    v_contract.company_id,
    v_contract.id,
    v_result,
    v_month
  );
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month_before_zero_repair(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.system_invoice_has_single_balanced_posted_journal(uuid, uuid, numeric) IS
  'Internal postcondition used by canonical invoice generation to require exactly one balanced posted reference journal.';

COMMENT ON FUNCTION public.system_agent_resolve_invoice_month_findings(uuid, uuid, uuid, date) IS
  'Internal lifecycle hook that closes exact billing findings only after a positive active invoice and balanced posted journal are proven.';

COMMENT ON FUNCTION public.system_generate_invoice_for_contract_month_core(uuid, date) IS
  'Internal ungranted invoice insertion core; all authorization, zero repair, schedule validation, and journal postconditions are enforced by generate_invoice_for_contract_month.';

COMMENT ON FUNCTION public.generate_invoice_for_contract_month(uuid, date) IS
  'Authorized canonical invoice generator that atomically retires safe draft zero placeholders and reissues positive invoices through the journal-triggered INSERT path; any financial or approval history requires manual review.';

COMMIT;
