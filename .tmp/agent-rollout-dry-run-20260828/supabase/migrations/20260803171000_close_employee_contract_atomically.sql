-- Close an employee-assigned contract only after authoritative, transactional
-- checks. The browser remains a convenience layer; the database owns the
-- financial and operational invariant.

BEGIN;
CREATE OR REPLACE FUNCTION public.employee_close_assigned_contract(
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_profile_id uuid;
  v_contract public.contracts%ROWTYPE;
  v_schedule_preview jsonb;
  v_now timestamptz := now();
BEGIN
  IF v_actor IS NULL OR p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user and contract are required'
      USING ERRCODE = '42501';
  END IF;

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT profile.id
  INTO v_profile_id
  FROM public.profiles profile
  WHERE profile.user_id = v_actor
    AND profile.company_id = v_contract.company_id
    AND COALESCE(profile.is_active, true)
  ORDER BY profile.created_at
  LIMIT 1;

  IF v_profile_id IS NULL
     OR v_contract.assigned_to_profile_id IS DISTINCT FROM v_profile_id
  THEN
    RAISE EXCEPTION 'Contract is not assigned to the current employee'
      USING ERRCODE = '42501';
  END IF;

  IF lower(COALESCE(v_contract.status, '')) <> 'active' THEN
    RAISE EXCEPTION 'Only active contracts can be closed' USING ERRCODE = 'P0001';
  END IF;

  -- A zero balance is not proof that billing exists. Validate the complete
  -- expected schedule graph without writing, then require every positive
  -- schedule month to have a matching positive invoice with one balanced,
  -- posted journal. This prevents direct RPC calls from closing a contract
  -- whose missing invoices happen to leave balance_due at zero.
  IF COALESCE(v_contract.contract_amount, 0) > 0.01
     OR COALESCE(v_contract.monthly_amount, 0) > 0.01
  THEN
    v_schedule_preview := public.generate_payment_schedules_for_contract(
      v_contract.id,
      true
    );

    IF COALESCE((v_schedule_preview ->> 'success')::boolean, false) IS NOT TRUE
       OR COALESCE((v_schedule_preview ->> 'schedules_created')::integer, 0) > 0
    THEN
      RAISE EXCEPTION 'Contract billing schedule graph is incomplete'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
    FOR UPDATE OF schedule;

    IF NOT EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.company_id = v_contract.company_id
        AND schedule.contract_id = v_contract.id
        AND COALESCE(schedule.amount, 0) > 0.01
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    ) OR EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.company_id = v_contract.company_id
        AND schedule.contract_id = v_contract.id
        AND COALESCE(schedule.amount, 0) > 0.01
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.invoices invoice
          WHERE invoice.company_id = v_contract.company_id
            AND invoice.contract_id = v_contract.id
            AND date_trunc(
              'month',
              COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
            )::date = date_trunc(
              'month',
              schedule.due_date::timestamp without time zone
            )::date
            AND abs(COALESCE(invoice.total_amount, 0) - schedule.amount) <= 0.01
            AND COALESCE(invoice.total_amount, 0) > 0.01
            AND lower(COALESCE(invoice.status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
            AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
            AND public.system_invoice_has_single_balanced_posted_journal(
              v_contract.company_id,
              invoice.id,
              invoice.total_amount
            )
        )
    ) THEN
      RAISE EXCEPTION 'Contract billing graph has a missing or unjournaled invoice month'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- The canonical invoice generator also locks the contract row, preventing a
  -- new monthly invoice from racing this close operation.
  PERFORM 1
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
  FOR UPDATE OF invoice;

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND (
        COALESCE(
          invoice.balance_due,
          GREATEST(COALESCE(invoice.total_amount, 0) - COALESCE(invoice.paid_amount, 0), 0)
        ) > 0.01
        OR lower(COALESCE(invoice.payment_status, '')) NOT IN (
          'paid', 'completed', 'cleared', 'cancelled', 'canceled',
          'void', 'voided', 'deleted', 'inactive'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Contract has an active unsettled invoice' USING ERRCODE = 'P0001';
  END IF;

  -- A residual contract balance without an active collectible invoice is a
  -- billing-graph problem, not permission to close the contract.
  IF COALESCE(v_contract.balance_due, 0) > 0.01 THEN
    RAISE EXCEPTION 'Contract balance requires billing reconciliation before closure'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.penalties penalty
    WHERE penalty.company_id = v_contract.company_id
      AND penalty.contract_id = v_contract.id
      AND lower(COALESCE(penalty.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(penalty.payment_status, '')) NOT IN (
        'paid', 'completed', 'cleared', 'cancelled', 'canceled',
        'void', 'voided', 'deleted', 'inactive'
      )
  ) THEN
    RAISE EXCEPTION 'Contract has open traffic penalties' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employee_tasks task
    WHERE task.company_id = v_contract.company_id
      AND task.contract_id = v_contract.id
      AND lower(COALESCE(task.status, '')) IN ('pending', 'in_progress', 'on_hold')
  ) THEN
    RAISE EXCEPTION 'Contract has open tasks' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = v_contract.company_id
      AND document.contract_id = v_contract.id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
  ) THEN
    RAISE EXCEPTION 'Signed contract document is required' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_contract.vehicle_returned, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Vehicle return must be confirmed before closure' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.contracts contract
  SET status = 'expired',
      assignment_notes = concat_ws(
        E'\n',
        NULLIF(BTRIM(COALESCE(contract.assignment_notes, '')), ''),
        'Closed atomically from employee workspace by profile '
          || v_profile_id::text || ' at ' || v_now::text
      ),
      updated_at = v_now
  WHERE contract.id = v_contract.id
    AND contract.company_id = v_contract.company_id
    AND contract.status = 'active'
    AND contract.assigned_to_profile_id = v_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract changed while it was being closed'
      USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract.id,
    'company_id', v_contract.company_id,
    'status', 'expired',
    'closed_by_profile_id', v_profile_id,
    'closed_at', v_now
  );
END;
$$;
REVOKE ALL ON FUNCTION public.employee_close_assigned_contract(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.employee_close_assigned_contract(uuid)
  TO authenticated;
COMMENT ON FUNCTION public.employee_close_assigned_contract(uuid) IS
  'Atomically closes an employee-assigned active contract after authoritative billing-graph, journal, balance, penalty, task, document, and vehicle-return checks.';
COMMIT;
