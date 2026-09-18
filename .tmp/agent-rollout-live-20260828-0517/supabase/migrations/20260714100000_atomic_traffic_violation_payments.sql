-- Atomic company payment of a traffic violation with a balanced journal entry.
-- Rollback: drop create_traffic_violation_payment_with_journal(uuid, uuid, numeric,
-- text, text, date, text, text, text, text, uuid), drop the partial unique index,
-- then remove TRAFFIC_FINE_EXPENSE only after its account mappings are removed.

INSERT INTO public.default_account_types (
  type_code,
  type_name,
  type_name_ar,
  account_category,
  description,
  is_system
)
SELECT
  'TRAFFIC_FINE_EXPENSE',
  'Traffic Fine Expense',
  'مصروف المخالفات المرورية',
  'expenses',
  'Expense account used when the company bears a traffic violation.',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.default_account_types
  WHERE type_code = 'TRAFFIC_FINE_EXPENSE'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_traffic_violation_payments_journal
  ON public.traffic_violation_payments(journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.create_traffic_violation_payment_with_journal(
  p_company_id uuid,
  p_violation_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_type text,
  p_payment_date date,
  p_bank_account text DEFAULT NULL,
  p_check_number text DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.traffic_violation_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_penalty public.penalties%ROWTYPE;
  v_legacy_violation public.traffic_violations%ROWTYPE;
  v_customer_id uuid;
  v_violation_amount numeric;
  v_paid_amount numeric;
  v_next_paid_amount numeric;
  v_payment_status text;
  v_debit_type text;
  v_credit_type text;
  v_debit_account_id uuid;
  v_credit_account_id uuid;
  v_payment_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_payment_number text;
  v_entry_number text;
  v_description text;
  v_payment public.traffic_violation_payments%ROWTYPE;
BEGIN
  IF p_company_id IS NULL OR p_violation_id IS NULL THEN
    RAISE EXCEPTION 'Company and traffic violation are required' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Traffic violation payment amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;
  IF p_payment_method NOT IN ('cash', 'bank_transfer', 'check', 'credit_card') THEN
    RAISE EXCEPTION 'Unsupported traffic violation payment method' USING ERRCODE = 'P0001';
  END IF;
  IF p_payment_type NOT IN ('full', 'partial') THEN
    RAISE EXCEPTION 'Unsupported traffic violation payment type' USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.user_id = auth.uid()
      AND profile.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'The traffic violation payment does not belong to the current company'
      USING ERRCODE = '42501';
  END IF;

  SELECT penalty.*
  INTO v_penalty
  FROM public.penalties penalty
  WHERE penalty.id = p_violation_id
    AND penalty.company_id = p_company_id
  FOR UPDATE;

  IF v_penalty.id IS NOT NULL THEN
    IF v_penalty.status = 'cancelled' THEN
      RAISE EXCEPTION 'A cancelled traffic violation cannot be paid' USING ERRCODE = 'P0001';
    END IF;
    v_customer_id := v_penalty.customer_id;
    v_violation_amount := COALESCE(v_penalty.amount, 0);
    v_description := 'سداد مخالفة مرورية - ' || v_penalty.penalty_number;
  ELSE
    SELECT violation.*
    INTO v_legacy_violation
    FROM public.traffic_violations violation
    WHERE violation.id = p_violation_id
      AND violation.company_id = p_company_id
    FOR UPDATE;

    IF v_legacy_violation.id IS NULL THEN
      RAISE EXCEPTION 'Traffic violation was not found for the current company' USING ERRCODE = 'P0001';
    END IF;
    IF v_legacy_violation.status = 'cancelled' THEN
      RAISE EXCEPTION 'A cancelled traffic violation cannot be paid' USING ERRCODE = 'P0001';
    END IF;

    SELECT contract.customer_id
    INTO v_customer_id
    FROM public.contracts contract
    WHERE contract.id = v_legacy_violation.contract_id
      AND contract.company_id = p_company_id;

    v_violation_amount := COALESCE(v_legacy_violation.fine_amount, 0);
    v_description := 'سداد مخالفة مرورية - ' || v_legacy_violation.violation_number;
  END IF;

  SELECT COALESCE(SUM(payment.amount), 0)
  INTO v_paid_amount
  FROM public.traffic_violation_payments payment
  WHERE payment.company_id = p_company_id
    AND payment.traffic_violation_id = p_violation_id
    AND payment.status = 'completed';

  v_next_paid_amount := v_paid_amount + p_amount;
  IF v_violation_amount <= 0 THEN
    RAISE EXCEPTION 'Traffic violation amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;
  IF v_next_paid_amount > v_violation_amount + 0.001 THEN
    RAISE EXCEPTION 'Traffic violation payment exceeds the remaining balance of %',
      GREATEST(v_violation_amount - v_paid_amount, 0)
      USING ERRCODE = 'P0001';
  END IF;

  v_debit_type := CASE WHEN v_customer_id IS NULL THEN 'TRAFFIC_FINE_EXPENSE' ELSE 'RECEIVABLES' END;
  v_credit_type := CASE
    WHEN p_payment_method IN ('bank_transfer', 'check', 'credit_card') THEN 'BANK'
    ELSE 'CASH'
  END;

  SELECT account.id
  INTO v_debit_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type
    ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account
    ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id
    AND mapping.is_active = true
    AND account_type.type_code = v_debit_type
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.balance_type, '')) = 'debit'
    AND (
      (v_debit_type = 'RECEIVABLES' AND lower(COALESCE(account.account_type, '')) = 'assets')
      OR
      (v_debit_type = 'TRAFFIC_FINE_EXPENSE' AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses'))
    )
  ORDER BY mapping.id
  LIMIT 1;

  SELECT account.id
  INTO v_credit_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type
    ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account
    ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id
    AND mapping.is_active = true
    AND account_type.type_code = v_credit_type
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.account_type, '')) = 'assets'
    AND lower(COALESCE(account.balance_type, '')) = 'debit'
  ORDER BY mapping.id
  LIMIT 1;

  IF v_debit_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid % account mapping is required before paying this traffic violation', v_debit_type
      USING ERRCODE = 'P0001';
  END IF;
  IF v_credit_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid % account mapping is required before paying this traffic violation', v_credit_type
      USING ERRCODE = 'P0001';
  END IF;

  IF public.system_agent_date_in_closed_period(p_company_id, COALESCE(p_payment_date, CURRENT_DATE)) THEN
    RAISE EXCEPTION 'Traffic violation payment posting is blocked by a closed accounting period'
      USING ERRCODE = 'P0001';
  END IF;

  v_payment_number := public.generate_traffic_payment_number(p_company_id);
  v_entry_number := 'JE-TV-' || to_char(COALESCE(p_payment_date, CURRENT_DATE), 'YYYYMMDD') || '-' || left(v_journal_id::text, 8);

  INSERT INTO public.journal_entries (
    id,
    company_id,
    entry_number,
    entry_date,
    description,
    reference_type,
    reference_id,
    status,
    total_debit,
    total_credit,
    created_by,
    posted_by,
    posted_at
  ) VALUES (
    v_journal_id,
    p_company_id,
    v_entry_number,
    COALESCE(p_payment_date, CURRENT_DATE),
    v_description,
    'traffic_violation_payment',
    v_payment_id,
    'posted',
    p_amount,
    p_amount,
    v_actor_id,
    v_actor_id,
    now()
  );

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    line_description,
    debit_amount,
    credit_amount,
    line_number
  ) VALUES
    (v_journal_id, v_debit_account_id, v_description, p_amount, 0, 1),
    (v_journal_id, v_credit_account_id, v_description, 0, p_amount, 2);

  INSERT INTO public.traffic_violation_payments (
    id,
    company_id,
    traffic_violation_id,
    payment_number,
    payment_date,
    amount,
    payment_method,
    payment_type,
    bank_account,
    check_number,
    reference_number,
    notes,
    status,
    journal_entry_id,
    created_by
  ) VALUES (
    v_payment_id,
    p_company_id,
    p_violation_id,
    v_payment_number,
    COALESCE(p_payment_date, CURRENT_DATE),
    p_amount,
    p_payment_method,
    p_payment_type,
    NULLIF(BTRIM(COALESCE(p_bank_account, '')), ''),
    NULLIF(BTRIM(COALESCE(p_check_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    'completed',
    v_journal_id,
    v_actor_id
  )
  RETURNING * INTO v_payment;

  v_payment_status := CASE
    WHEN v_next_paid_amount >= v_violation_amount - 0.001 THEN 'paid'
    ELSE 'partially_paid'
  END;

  IF v_penalty.id IS NOT NULL THEN
    UPDATE public.penalties
    SET payment_status = v_payment_status,
        paid_by_company = true,
        company_paid_date = CASE WHEN v_payment_status = 'paid' THEN COALESCE(p_payment_date, CURRENT_DATE) ELSE company_paid_date END,
        updated_at = now()
    WHERE id = p_violation_id
      AND company_id = p_company_id;
  ELSE
    UPDATE public.traffic_violations
    SET status = CASE WHEN v_payment_status = 'paid' THEN 'paid' ELSE 'pending' END,
        payment_date = CASE WHEN v_payment_status = 'paid' THEN COALESCE(p_payment_date, CURRENT_DATE) ELSE NULL END,
        payment_method = p_payment_method,
        updated_at = now()
    WHERE id = p_violation_id
      AND company_id = p_company_id;
  END IF;

  RETURN v_payment;
END;
$$;
REVOKE ALL ON FUNCTION public.create_traffic_violation_payment_with_journal(
  uuid, uuid, numeric, text, text, date, text, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_traffic_violation_payment_with_journal(
  uuid, uuid, numeric, text, text, date, text, text, text, text, uuid
) TO authenticated, service_role;
COMMENT ON FUNCTION public.create_traffic_violation_payment_with_journal(
  uuid, uuid, numeric, text, text, date, text, text, text, text, uuid
) IS 'Atomically records a company traffic-fine payment, posts its balanced journal, and refreshes violation payment state.';
INSERT INTO public.system_agent_command_registry (
  command,
  domain,
  description,
  entity_table,
  allowed_fields,
  reversible,
  approval_required,
  closed_period_policy,
  min_confidence,
  enabled
) VALUES (
  'traffic_violation_payment.post_missing_journal',
  'accounting',
  'Post a balanced journal for a completed legacy traffic-violation company payment.',
  'traffic_violation_payments',
  ARRAY['status', 'journal_entry_id'],
  true,
  false,
  'block',
  1.0,
  true
)
ON CONFLICT (command) DO UPDATE SET
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  entity_table = EXCLUDED.entity_table,
  allowed_fields = EXCLUDED.allowed_fields,
  reversible = EXCLUDED.reversible,
  approval_required = EXCLUDED.approval_required,
  closed_period_policy = EXCLUDED.closed_period_policy,
  min_confidence = EXCLUDED.min_confidence,
  enabled = EXCLUDED.enabled,
  updated_at = now();
CREATE OR REPLACE FUNCTION public.system_agent_apply_traffic_violation_payment_repair_v1(
  p_run_id uuid,
  p_job_id uuid,
  p_finding_id uuid,
  p_command text,
  p_company_id uuid,
  p_entity_id text,
  p_expected_before jsonb DEFAULT '{}'::jsonb,
  p_values jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
  v_finding public.system_agent_findings%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_payment public.traffic_violation_payments%ROWTYPE;
  v_penalty public.penalties%ROWTYPE;
  v_legacy_violation public.traffic_violations%ROWTYPE;
  v_customer_id uuid;
  v_debit_type text;
  v_credit_type text;
  v_debit_account_id uuid;
  v_credit_account_id uuid;
  v_journal_id uuid := gen_random_uuid();
  v_entry_number text;
  v_description text;
  v_before jsonb;
  v_after jsonb;
  v_repair_id uuid := gen_random_uuid();
BEGIN
  IF p_command <> 'traffic_violation_payment.post_missing_journal' THEN
    RAISE EXCEPTION 'Command is not handled by the traffic violation payment gateway';
  END IF;

  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id
    AND job.run_id = p_run_id
    AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply' OR v_job.domain <> 'accounting' THEN
    RAISE EXCEPTION 'System agent accounting job is not an active apply job';
  END IF;

  SELECT * INTO v_finding
  FROM public.system_agent_findings finding
  WHERE finding.id = p_finding_id
    AND finding.run_id = p_run_id
    AND finding.job_id = p_job_id
    AND finding.company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL
     OR v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
     OR v_finding.status IN ('repaired', 'rolled_back')
  THEN
    RAISE EXCEPTION 'Traffic payment finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.domain = 'accounting'
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Traffic payment repair command is disabled or below confidence threshold';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Traffic payment repair does not accept caller-selected values';
  END IF;

  SELECT * INTO v_payment
  FROM public.traffic_violation_payments payment
  WHERE payment.id = p_entity_id::uuid
    AND payment.company_id = p_company_id
  FOR UPDATE;
  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Traffic violation payment is outside the active company';
  END IF;

  v_before := public.system_agent_pick_fields(to_jsonb(v_payment), v_registry.allowed_fields);
  IF lower(COALESCE(v_payment.status, '')) <> 'completed' THEN
    RAISE EXCEPTION 'Only a completed traffic violation payment can be posted';
  END IF;
  IF v_payment.journal_entry_id IS NOT NULL THEN
    v_after := v_before;
  ELSE
    IF NOT (v_before @> COALESCE(p_expected_before, '{}'::jsonb)) THEN
      RAISE EXCEPTION 'Traffic violation payment changed after detection';
    END IF;
    IF public.system_agent_date_in_closed_period(p_company_id, v_payment.payment_date) THEN
      RAISE EXCEPTION 'Traffic violation payment repair is blocked by a closed accounting period';
    END IF;

    SELECT penalty.* INTO v_penalty
    FROM public.penalties penalty
    WHERE penalty.id = v_payment.traffic_violation_id
      AND penalty.company_id = p_company_id
    FOR SHARE;

    IF v_penalty.id IS NOT NULL THEN
      v_customer_id := v_penalty.customer_id;
      v_description := 'ترحيل سداد مخالفة مرورية قديم - ' || v_penalty.penalty_number;
    ELSE
      SELECT violation.* INTO v_legacy_violation
      FROM public.traffic_violations violation
      WHERE violation.id = v_payment.traffic_violation_id
        AND violation.company_id = p_company_id
      FOR SHARE;
      IF v_legacy_violation.id IS NULL THEN
        RAISE EXCEPTION 'The traffic violation linked to the payment was not found';
      END IF;
      SELECT contract.customer_id INTO v_customer_id
      FROM public.contracts contract
      WHERE contract.id = v_legacy_violation.contract_id
        AND contract.company_id = p_company_id;
      v_description := 'ترحيل سداد مخالفة مرورية قديم - ' || v_legacy_violation.violation_number;
    END IF;

    v_debit_type := CASE WHEN v_customer_id IS NULL THEN 'TRAFFIC_FINE_EXPENSE' ELSE 'RECEIVABLES' END;
    v_credit_type := CASE
      WHEN v_payment.payment_method IN ('bank_transfer', 'check', 'credit_card') THEN 'BANK'
      ELSE 'CASH'
    END;

    SELECT account.id INTO v_debit_account_id
    FROM public.account_mappings mapping
    JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
    JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id
      AND mapping.is_active = true
      AND account_type.type_code = v_debit_type
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
      AND (
        (v_debit_type = 'RECEIVABLES' AND lower(COALESCE(account.account_type, '')) = 'assets')
        OR
        (v_debit_type = 'TRAFFIC_FINE_EXPENSE' AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses'))
      )
    ORDER BY mapping.id
    LIMIT 1;

    SELECT account.id INTO v_credit_account_id
    FROM public.account_mappings mapping
    JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
    JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id
      AND mapping.is_active = true
      AND account_type.type_code = v_credit_type
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) = 'assets'
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
    ORDER BY mapping.id
    LIMIT 1;

    IF v_debit_account_id IS NULL OR v_credit_account_id IS NULL THEN
      RAISE EXCEPTION 'Valid % and % account mappings are required for traffic payment repair', v_debit_type, v_credit_type;
    END IF;

    v_entry_number := 'JE-TV-' || to_char(v_payment.payment_date, 'YYYYMMDD') || '-' || left(v_journal_id::text, 8);
    INSERT INTO public.journal_entries (
      id, company_id, entry_number, entry_date, description,
      reference_type, reference_id, status, total_debit, total_credit,
      created_by, posted_by, posted_at
    ) VALUES (
      v_journal_id, p_company_id, v_entry_number, v_payment.payment_date, v_description,
      'traffic_violation_payment', v_payment.id, 'posted', v_payment.amount, v_payment.amount,
      v_payment.created_by, v_payment.created_by, now()
    );

    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_description,
      debit_amount, credit_amount, line_number
    ) VALUES
      (v_journal_id, v_debit_account_id, v_description, v_payment.amount, 0, 1),
      (v_journal_id, v_credit_account_id, v_description, 0, v_payment.amount, 2);

    UPDATE public.traffic_violation_payments payment
    SET journal_entry_id = v_journal_id, updated_at = now()
    WHERE payment.id = v_payment.id
      AND payment.company_id = p_company_id
      AND payment.journal_entry_id IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Traffic violation payment journal link changed concurrently';
    END IF;

    SELECT * INTO v_payment
    FROM public.traffic_violation_payments
    WHERE id = p_entity_id::uuid;
    v_after := public.system_agent_pick_fields(to_jsonb(v_payment), v_registry.allowed_fields);
    IF v_payment.journal_entry_id IS DISTINCT FROM v_journal_id THEN
      RAISE EXCEPTION 'Traffic violation payment failed journal-link verification';
    END IF;
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE id = p_finding_id;
    RETURN jsonb_build_object('status', 'verified_no_change', 'entity_id', p_entity_id, 'state', v_after);
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'accounting', p_command,
    'traffic_violation_payments', p_entity_id, v_before, v_after,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'handler_version', 'traffic_payment_v1',
      'journal_entry_id', v_journal_id
    )
  );

  UPDATE public.system_agent_findings
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'entity_id', p_entity_id,
    'before', v_before,
    'after', v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_traffic_violation_payment_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_traffic_violation_payment_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) TO service_role;
DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_traffic_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_traffic_v1;
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(
  p_repair_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_payment public.traffic_violation_payments%ROWTYPE;
  v_journal public.journal_entries%ROWTYPE;
  v_reversal_id uuid := gen_random_uuid();
  v_reversal_number text;
  v_line_count integer;
  v_debit numeric;
  v_credit numeric;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;

  IF v_repair.command <> 'traffic_violation_payment.post_missing_journal' THEN
    RETURN public.system_agent_rollback_repair_before_traffic_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status = 'rolled_back' THEN
    RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
  END IF;
  IF v_repair.status <> 'applied' THEN
    RAISE EXCEPTION 'Only an applied repair can be rolled back';
  END IF;

  SELECT * INTO v_payment
  FROM public.traffic_violation_payments payment
  WHERE payment.id = v_repair.entity_id::uuid
    AND payment.company_id = v_repair.company_id
  FOR UPDATE;
  IF v_payment.id IS NULL THEN RAISE EXCEPTION 'Traffic violation payment was not found'; END IF;

  SELECT * INTO v_journal
  FROM public.journal_entries entry
  WHERE entry.id = (v_repair.rollback_metadata ->> 'journal_entry_id')::uuid
    AND entry.company_id = v_repair.company_id
  FOR UPDATE;
  IF v_journal.id IS NULL
     OR v_payment.journal_entry_id IS DISTINCT FROM v_journal.id
     OR lower(COALESCE(v_journal.status, '')) <> 'posted'
     OR v_journal.reversal_entry_id IS NOT NULL
  THEN
    RAISE EXCEPTION 'Traffic payment or journal changed after repair; rollback was safely aborted';
  END IF;
  IF public.system_agent_date_in_closed_period(v_repair.company_id, v_journal.entry_date) THEN
    RAISE EXCEPTION 'Rollback is blocked because the traffic payment belongs to a closed accounting period';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(line.debit_amount), 0), COALESCE(SUM(line.credit_amount), 0)
  INTO v_line_count, v_debit, v_credit
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_journal.id;
  IF v_line_count < 2 OR abs(v_debit - v_credit) > 0.01 THEN
    RAISE EXCEPTION 'Traffic payment journal is no longer balanced';
  END IF;

  v_reversal_number := 'JE-TV-R-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || left(v_reversal_id::text, 8);
  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description,
    reference_type, reference_id, status, total_debit, total_credit,
    created_by, posted_by, posted_at
  ) VALUES (
    v_reversal_id, v_repair.company_id, v_reversal_number, CURRENT_DATE,
    'عكس إصلاح ترحيل سداد مخالفة مرورية',
    'system_agent_reversal', v_repair.id, 'posted', v_credit, v_debit,
    v_payment.created_by, v_payment.created_by, now()
  );

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_description,
    debit_amount, credit_amount, line_number
  )
  SELECT
    v_reversal_id,
    line.account_id,
    'عكس: ' || COALESCE(line.line_description, v_journal.description),
    COALESCE(line.credit_amount, 0),
    COALESCE(line.debit_amount, 0),
    line.line_number
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_journal.id
  ORDER BY line.line_number;

  UPDATE public.journal_entries
  SET status = 'reversed', reversal_entry_id = v_reversal_id,
      reversed_at = now(), reversed_by = v_payment.created_by, updated_at = now()
  WHERE id = v_journal.id AND company_id = v_repair.company_id;

  UPDATE public.traffic_violation_payments
  SET journal_entry_id = NULL, updated_at = now()
  WHERE id = v_payment.id AND company_id = v_repair.company_id;

  UPDATE public.system_agent_repairs
  SET status = 'rolled_back', rolled_back_at = now(),
      rollback_reason = left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000),
      rollback_metadata = rollback_metadata || jsonb_build_object('reversal_entry_id', v_reversal_id),
      error = NULL, updated_at = now()
  WHERE id = p_repair_id;

  UPDATE public.system_agent_findings
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE id = v_repair.finding_id;

  RETURN jsonb_build_object(
    'repair_id', p_repair_id,
    'status', 'rolled_back',
    'reversal_entry_id', v_reversal_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  TO service_role;
