-- Build the liability journal completely before posting it. Posted journal lines
-- are immutable, so inserting lines after the header is posted is rejected.

CREATE OR REPLACE FUNCTION public.delete_contract_with_company_violations_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text,
  p_violation_resolution text DEFAULT 'company',
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_contract public.contracts%ROWTYPE;
  v_audit_id uuid := gen_random_uuid();
  v_journal_id uuid;
  v_expense_account_id uuid;
  v_payable_account_id uuid;
  v_expense_type_id uuid;
  v_payable_type_id uuid;
  v_violation_ids uuid[] := '{}';
  v_violation_count integer := 0;
  v_unpaid_amount numeric(15, 2) := 0;
  v_invoice_count integer := 0;
  v_payment_count integer := 0;
  v_entry_number text;
  v_description text;
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Company and contract are required' USING ERRCODE = 'P0001';
  END IF;

  IF length(btrim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'A clear deletion reason of at least 5 characters is required' USING ERRCODE = 'P0001';
  END IF;

  IF p_violation_resolution NOT IN ('company') THEN
    RAISE EXCEPTION 'Traffic violations must be reviewed or explicitly transferred to the company before deletion'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := COALESCE(auth.uid(), p_actor_id);
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.user_id = auth.uid()
      AND profile.company_id = p_company_id
      AND profile.role::text IN ('admin', 'company_admin', 'manager', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only a company administrator or manager can permanently delete a contract'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || ':' || p_contract_id::text));

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;

  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'Contract was not found for the current company' USING ERRCODE = 'P0001';
  END IF;

  IF lower(COALESCE(v_contract.status::text, '')) NOT IN (
    'draft', 'cancelled', 'expired', 'completed', 'closed', 'terminated'
  ) THEN
    RAISE EXCEPTION 'The contract must be ended or cancelled before permanent deletion' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_invoice_count
  FROM public.invoices invoice
  WHERE invoice.contract_id = p_contract_id AND invoice.company_id = p_company_id;

  SELECT count(*) INTO v_payment_count
  FROM public.payments payment
  WHERE payment.contract_id = p_contract_id AND payment.company_id = p_company_id;

  IF v_invoice_count > 0 OR v_payment_count > 0 THEN
    RAISE EXCEPTION 'The contract has invoices or payments and cannot be permanently deleted'
      USING ERRCODE = 'P0001';
  END IF;

  WITH completed_payments AS (
    SELECT payment.traffic_violation_id, SUM(payment.amount) AS paid_amount
    FROM public.traffic_violation_payments payment
    WHERE payment.company_id = p_company_id
      AND payment.status = 'completed'
    GROUP BY payment.traffic_violation_id
  ), violation_balances AS (
    SELECT
      violation.id,
      GREATEST(COALESCE(violation.fine_amount, 0) - COALESCE(completed.paid_amount, 0), 0) AS unpaid_amount
    FROM public.traffic_violations violation
    LEFT JOIN completed_payments completed ON completed.traffic_violation_id = violation.id
    WHERE violation.company_id = p_company_id
      AND violation.contract_id = p_contract_id
      AND violation.status <> 'cancelled'
  )
  SELECT
    COALESCE(array_agg(id), '{}'),
    count(*),
    COALESCE(SUM(unpaid_amount), 0)
  INTO v_violation_ids, v_violation_count, v_unpaid_amount
  FROM violation_balances;

  IF v_unpaid_amount > 0 THEN
    IF public.system_agent_date_in_closed_period(p_company_id, CURRENT_DATE) THEN
      RAISE EXCEPTION 'The traffic-violation liability cannot be recognized in a closed accounting period'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT id INTO v_expense_type_id
    FROM public.default_account_types WHERE type_code = 'TRAFFIC_FINE_EXPENSE' LIMIT 1;
    SELECT id INTO v_payable_type_id
    FROM public.default_account_types WHERE type_code = 'TRAFFIC_FINE_PAYABLE' LIMIT 1;

    SELECT account.id INTO v_expense_account_id
    FROM public.account_mappings mapping
    JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id
      AND mapping.default_account_type_id = v_expense_type_id
      AND mapping.is_active = true
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses')
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
    ORDER BY mapping.id LIMIT 1;

    IF v_expense_account_id IS NULL THEN
      SELECT account.id INTO v_expense_account_id
      FROM public.chart_of_accounts account
      WHERE account.company_id = p_company_id
        AND account.account_code = 'TVF-EXP-' || left(replace(p_company_id::text, '-', ''), 8)
      LIMIT 1;
    END IF;

    IF v_expense_account_id IS NULL THEN
      INSERT INTO public.chart_of_accounts (
        company_id, account_code, account_name, account_name_ar, account_type,
        account_subtype, balance_type, account_level, is_header, is_active, is_system, is_default,
        description
      ) VALUES (
        p_company_id,
        'TVF-EXP-' || left(replace(p_company_id::text, '-', ''), 8),
        'Traffic Fine Expense', 'مصروف المخالفات المرورية', 'expenses',
        'operating_expense', 'debit', 3, false, true, true, false,
        'Company-borne traffic violation expense'
      ) RETURNING id INTO v_expense_account_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.account_mappings mapping
      WHERE mapping.company_id = p_company_id
        AND mapping.default_account_type_id = v_expense_type_id
        AND mapping.is_active = true
    ) THEN
      INSERT INTO public.account_mappings (
        company_id, default_account_type_id, chart_of_accounts_id, is_active, mapped_by
      )
      VALUES (p_company_id, v_expense_type_id, v_expense_account_id, true, v_actor_id);
    END IF;

    SELECT account.id INTO v_payable_account_id
    FROM public.account_mappings mapping
    JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id
      AND mapping.default_account_type_id = v_payable_type_id
      AND mapping.is_active = true
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('liability', 'liabilities')
      AND lower(COALESCE(account.balance_type, '')) = 'credit'
    ORDER BY mapping.id LIMIT 1;

    IF v_payable_account_id IS NULL THEN
      SELECT account.id INTO v_payable_account_id
      FROM public.chart_of_accounts account
      WHERE account.company_id = p_company_id
        AND account.account_code = 'TVF-PAY-' || left(replace(p_company_id::text, '-', ''), 8)
      LIMIT 1;
    END IF;

    IF v_payable_account_id IS NULL THEN
      INSERT INTO public.chart_of_accounts (
        company_id, account_code, account_name, account_name_ar, account_type,
        account_subtype, balance_type, account_level, is_header, is_active, is_system, is_default,
        description
      ) VALUES (
        p_company_id,
        'TVF-PAY-' || left(replace(p_company_id::text, '-', ''), 8),
        'Traffic Fines Payable', 'مخالفات مرورية مستحقة الدفع', 'liabilities',
        'current_liability', 'credit', 3, false, true, true, false,
        'Accrued traffic violation liabilities borne by the company'
      ) RETURNING id INTO v_payable_account_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.account_mappings mapping
      WHERE mapping.company_id = p_company_id
        AND mapping.default_account_type_id = v_payable_type_id
        AND mapping.is_active = true
    ) THEN
      INSERT INTO public.account_mappings (
        company_id, default_account_type_id, chart_of_accounts_id, is_active, mapped_by
      )
      VALUES (p_company_id, v_payable_type_id, v_payable_account_id, true, v_actor_id);
    END IF;

    IF v_expense_account_id IS NULL OR v_payable_account_id IS NULL THEN
      RAISE EXCEPTION 'Traffic fine expense and payable accounts must be configured before deletion'
        USING ERRCODE = 'P0001';
    END IF;

    v_journal_id := gen_random_uuid();
    v_entry_number := 'JE-TV-ACCR-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || left(v_journal_id::text, 8);
    v_description := 'إثبات مخالفات مرورية على الشركة قبل حذف العقد ' || v_contract.contract_number;

    INSERT INTO public.journal_entries (
      id, company_id, entry_number, entry_date, description, reference_type, reference_id,
      status, total_debit, total_credit, created_by, posted_by, posted_at
    ) VALUES (
      v_journal_id, p_company_id, v_entry_number, CURRENT_DATE, v_description,
      'contract_violation_liability_transfer', v_audit_id,
      'draft', v_unpaid_amount, v_unpaid_amount, v_actor_id, NULL, NULL
    );

    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_description, debit_amount, credit_amount, line_number
    ) VALUES
      (v_journal_id, v_expense_account_id, v_description, v_unpaid_amount, 0, 1),
      (v_journal_id, v_payable_account_id, v_description, 0, v_unpaid_amount, 2);

    UPDATE public.journal_entries
    SET status = 'posted',
        posted_by = v_actor_id,
        posted_at = now()
    WHERE id = v_journal_id;
  END IF;

  INSERT INTO public.contract_deletion_audit (
    id, company_id, contract_id_snapshot, contract_number, contract_status,
    customer_id_snapshot, vehicle_id_snapshot, start_date, end_date, deletion_reason,
    violation_resolution, violation_count, violation_amount, liability_journal_entry_id,
    violation_ids, contract_snapshot, deleted_by
  ) VALUES (
    v_audit_id, p_company_id, v_contract.id, v_contract.contract_number, v_contract.status::text,
    v_contract.customer_id, v_contract.vehicle_id, v_contract.start_date, v_contract.end_date,
    btrim(p_reason), CASE WHEN v_violation_count > 0 THEN 'company' ELSE 'none' END,
    v_violation_count, v_unpaid_amount, v_journal_id, v_violation_ids, to_jsonb(v_contract), v_actor_id
  );

  WITH completed_payments AS (
    SELECT payment.traffic_violation_id, SUM(payment.amount) AS paid_amount
    FROM public.traffic_violation_payments payment
    WHERE payment.company_id = p_company_id AND payment.status = 'completed'
    GROUP BY payment.traffic_violation_id
  )
  UPDATE public.traffic_violations violation
  SET responsibility_party = 'company',
      responsibility_reason = btrim(p_reason),
      responsibility_decided_at = now(),
      responsibility_decided_by = v_actor_id,
      responsible_customer_id = COALESCE(violation.responsible_customer_id, v_contract.customer_id),
      original_contract_number = COALESCE(violation.original_contract_number, v_contract.contract_number),
      liability_amount = GREATEST(COALESCE(violation.fine_amount, 0) - COALESCE(completed.paid_amount, 0), 0),
      liability_recognized_at = CASE
        WHEN GREATEST(COALESCE(violation.fine_amount, 0) - COALESCE(completed.paid_amount, 0), 0) > 0 THEN now()
        ELSE violation.liability_recognized_at
      END,
      liability_journal_entry_id = CASE
        WHEN GREATEST(COALESCE(violation.fine_amount, 0) - COALESCE(completed.paid_amount, 0), 0) > 0 THEN v_journal_id
        ELSE violation.liability_journal_entry_id
      END,
      contract_id = NULL,
      notes = concat_ws(E'\n', NULLIF(violation.notes, ''),
        'نقلت مسؤولية المخالفة إلى الشركة عند حذف العقد ' || v_contract.contract_number || ': ' || btrim(p_reason)),
      updated_at = now()
  FROM completed_payments completed
  WHERE violation.company_id = p_company_id
    AND violation.contract_id = p_contract_id
    AND violation.status <> 'cancelled'
    AND completed.traffic_violation_id = violation.id;

  UPDATE public.traffic_violations violation
  SET responsibility_party = 'company',
      responsibility_reason = btrim(p_reason),
      responsibility_decided_at = now(),
      responsibility_decided_by = v_actor_id,
      responsible_customer_id = COALESCE(violation.responsible_customer_id, v_contract.customer_id),
      original_contract_number = COALESCE(violation.original_contract_number, v_contract.contract_number),
      liability_amount = GREATEST(COALESCE(violation.fine_amount, 0), 0),
      liability_recognized_at = CASE WHEN COALESCE(violation.fine_amount, 0) > 0 THEN now() ELSE NULL END,
      liability_journal_entry_id = CASE WHEN COALESCE(violation.fine_amount, 0) > 0 THEN v_journal_id ELSE NULL END,
      contract_id = NULL,
      notes = concat_ws(E'\n', NULLIF(violation.notes, ''),
        'نقلت مسؤولية المخالفة إلى الشركة عند حذف العقد ' || v_contract.contract_number || ': ' || btrim(p_reason)),
      updated_at = now()
  WHERE violation.company_id = p_company_id
    AND violation.contract_id = p_contract_id
    AND violation.status <> 'cancelled';

  UPDATE public.traffic_violations violation
  SET responsibility_party = 'cancelled',
      responsibility_reason = btrim(p_reason),
      responsibility_decided_at = now(),
      responsibility_decided_by = v_actor_id,
      responsible_customer_id = COALESCE(violation.responsible_customer_id, v_contract.customer_id),
      original_contract_number = COALESCE(violation.original_contract_number, v_contract.contract_number),
      liability_amount = 0,
      contract_id = NULL,
      updated_at = now()
  WHERE violation.company_id = p_company_id
    AND violation.contract_id = p_contract_id
    AND violation.status = 'cancelled';

  UPDATE public.legal_cases
  SET contract_id = NULL, updated_at = now()
  WHERE company_id = p_company_id AND contract_id = p_contract_id;

  DELETE FROM public.contracts
  WHERE id = p_contract_id AND company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract changed during deletion; no records were committed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'deleted_contract_id', p_contract_id,
    'contract_number', v_contract.contract_number,
    'audit_id', v_audit_id,
    'violation_count', v_violation_count,
    'liability_amount', v_unpaid_amount,
    'liability_journal_entry_id', v_journal_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.delete_contract_with_company_violations_v1(uuid, uuid, text, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_contract_with_company_violations_v1(uuid, uuid, text, text, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.delete_contract_with_company_violations_v1(uuid, uuid, text, text, uuid)
IS 'Atomically creates and posts the company-borne traffic-fine liability journal, preserves an audit snapshot, detaches violations, and permanently deletes an eligible contract.';
