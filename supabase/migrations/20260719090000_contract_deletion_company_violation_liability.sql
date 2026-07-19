-- Preserve traffic violations and recognize the company's liability before permanently deleting a contract.

ALTER TABLE public.traffic_violations
  ADD COLUMN IF NOT EXISTS responsibility_party text,
  ADD COLUMN IF NOT EXISTS responsibility_reason text,
  ADD COLUMN IF NOT EXISTS responsibility_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS responsibility_decided_by uuid,
  ADD COLUMN IF NOT EXISTS responsible_customer_id uuid,
  ADD COLUMN IF NOT EXISTS original_contract_number text,
  ADD COLUMN IF NOT EXISTS liability_amount numeric(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liability_recognized_at timestamptz,
  ADD COLUMN IF NOT EXISTS liability_journal_entry_id uuid;

UPDATE public.traffic_violations violation
SET responsibility_party = CASE
      WHEN violation.contract_id IS NULL THEN 'under_review'
      ELSE 'customer'
    END,
    original_contract_number = COALESCE(violation.original_contract_number, contract.contract_number),
    responsible_customer_id = COALESCE(violation.responsible_customer_id, contract.customer_id)
FROM public.contracts contract
WHERE contract.id = violation.contract_id
  AND violation.responsibility_party IS NULL;

UPDATE public.traffic_violations
SET responsibility_party = 'under_review'
WHERE responsibility_party IS NULL;

ALTER TABLE public.traffic_violations
  ALTER COLUMN responsibility_party SET DEFAULT 'under_review',
  ALTER COLUMN responsibility_party SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'traffic_violations_responsibility_party_check'
      AND conrelid = 'public.traffic_violations'::regclass
  ) THEN
    ALTER TABLE public.traffic_violations
      ADD CONSTRAINT traffic_violations_responsibility_party_check
      CHECK (responsibility_party IN ('customer', 'company', 'under_review', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'traffic_violations_responsible_customer_id_fkey'
      AND conrelid = 'public.traffic_violations'::regclass
  ) THEN
    ALTER TABLE public.traffic_violations
      ADD CONSTRAINT traffic_violations_responsible_customer_id_fkey
      FOREIGN KEY (responsible_customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'traffic_violations_liability_journal_entry_id_fkey'
      AND conrelid = 'public.traffic_violations'::regclass
  ) THEN
    ALTER TABLE public.traffic_violations
      ADD CONSTRAINT traffic_violations_liability_journal_entry_id_fkey
      FOREIGN KEY (liability_journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_traffic_violations_company_responsibility
  ON public.traffic_violations(company_id, responsibility_party, status);

CREATE INDEX IF NOT EXISTS idx_traffic_violations_original_contract_number
  ON public.traffic_violations(company_id, original_contract_number)
  WHERE original_contract_number IS NOT NULL;

INSERT INTO public.default_account_types (
  type_code, type_name, type_name_ar, account_category, description, is_system
)
SELECT
  'TRAFFIC_FINE_EXPENSE',
  'Traffic Fine Expense',
  'مصروف المخالفات المرورية',
  'expenses',
  'Expense account used when the company bears a traffic violation.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.default_account_types WHERE type_code = 'TRAFFIC_FINE_EXPENSE'
);

INSERT INTO public.default_account_types (
  type_code, type_name, type_name_ar, account_category, description, is_system
)
SELECT
  'TRAFFIC_FINE_PAYABLE',
  'Traffic Fines Payable',
  'مخالفات مرورية مستحقة الدفع',
  'liabilities',
  'Accrued liability for traffic violations borne by the company.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.default_account_types WHERE type_code = 'TRAFFIC_FINE_PAYABLE'
);

CREATE TABLE IF NOT EXISTS public.contract_deletion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id_snapshot uuid NOT NULL,
  contract_number text NOT NULL,
  contract_status text,
  customer_id_snapshot uuid,
  vehicle_id_snapshot uuid,
  start_date date,
  end_date date,
  deletion_reason text NOT NULL,
  violation_resolution text NOT NULL,
  violation_count integer NOT NULL DEFAULT 0,
  violation_amount numeric(15, 2) NOT NULL DEFAULT 0,
  liability_journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  violation_ids uuid[] NOT NULL DEFAULT '{}',
  contract_snapshot jsonb NOT NULL,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_deletion_audit_resolution_check
    CHECK (violation_resolution IN ('none', 'company'))
);

CREATE INDEX IF NOT EXISTS idx_contract_deletion_audit_company_date
  ON public.contract_deletion_audit(company_id, deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_deletion_audit_contract_number
  ON public.contract_deletion_audit(company_id, contract_number);

ALTER TABLE public.contract_deletion_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can view contract deletion audit" ON public.contract_deletion_audit;
CREATE POLICY "Company users can view contract deletion audit"
  ON public.contract_deletion_audit FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "Company managers can create contract deletion audit" ON public.contract_deletion_audit;
CREATE POLICY "Company managers can create contract deletion audit"
  ON public.contract_deletion_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_manager(company_id) OR public.is_super_admin());

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
IS 'Atomically recognizes company-borne traffic-fine liabilities, preserves an audit snapshot, detaches violations, and permanently deletes an eligible contract.';

CREATE OR REPLACE FUNCTION public.create_traffic_violation_payment_with_journal_v2(
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
  v_penalty_exists boolean;
  v_violation public.traffic_violations%ROWTYPE;
  v_customer_id uuid;
  v_paid_amount numeric := 0;
  v_next_paid_amount numeric;
  v_debit_type text;
  v_debit_account_id uuid;
  v_credit_account_id uuid;
  v_payment_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_description text;
  v_payment public.traffic_violation_payments%ROWTYPE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.penalties penalty
    WHERE penalty.id = p_violation_id AND penalty.company_id = p_company_id
  ) INTO v_penalty_exists;

  IF v_penalty_exists THEN
    RETURN public.create_traffic_violation_payment_with_journal(
      p_company_id, p_violation_id, p_amount, p_payment_method, p_payment_type,
      p_payment_date, p_bank_account, p_check_number, p_reference_number, p_notes, p_actor_id
    );
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

  v_actor_id := COALESCE(auth.uid(), p_actor_id);
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.user_id = auth.uid() AND profile.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'The traffic violation payment does not belong to the current company'
      USING ERRCODE = '42501';
  END IF;

  SELECT violation.* INTO v_violation
  FROM public.traffic_violations violation
  WHERE violation.id = p_violation_id AND violation.company_id = p_company_id
  FOR UPDATE;

  IF v_violation.id IS NULL THEN
    RAISE EXCEPTION 'Traffic violation was not found for the current company' USING ERRCODE = 'P0001';
  END IF;
  IF v_violation.status = 'cancelled' THEN
    RAISE EXCEPTION 'A cancelled traffic violation cannot be paid' USING ERRCODE = 'P0001';
  END IF;

  SELECT contract.customer_id INTO v_customer_id
  FROM public.contracts contract
  WHERE contract.id = v_violation.contract_id AND contract.company_id = p_company_id;

  SELECT COALESCE(SUM(payment.amount), 0) INTO v_paid_amount
  FROM public.traffic_violation_payments payment
  WHERE payment.company_id = p_company_id
    AND payment.traffic_violation_id = p_violation_id
    AND payment.status = 'completed';

  v_next_paid_amount := v_paid_amount + p_amount;
  IF COALESCE(v_violation.fine_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Traffic violation amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;
  IF v_next_paid_amount > v_violation.fine_amount + 0.001 THEN
    RAISE EXCEPTION 'Traffic violation payment exceeds the remaining balance of %',
      GREATEST(v_violation.fine_amount - v_paid_amount, 0) USING ERRCODE = 'P0001';
  END IF;

  v_debit_type := CASE
    WHEN v_violation.responsibility_party = 'company'
      AND v_violation.liability_journal_entry_id IS NOT NULL THEN 'TRAFFIC_FINE_PAYABLE'
    WHEN v_customer_id IS NOT NULL AND v_violation.responsibility_party <> 'company' THEN 'RECEIVABLES'
    ELSE 'TRAFFIC_FINE_EXPENSE'
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
    AND (
      (v_debit_type IN ('RECEIVABLES', 'TRAFFIC_FINE_EXPENSE') AND lower(account.balance_type) = 'debit')
      OR (v_debit_type = 'TRAFFIC_FINE_PAYABLE' AND lower(account.balance_type) = 'credit')
    )
  ORDER BY mapping.id LIMIT 1;

  SELECT account.id INTO v_credit_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id
    AND mapping.is_active = true
    AND account_type.type_code = CASE
      WHEN p_payment_method IN ('bank_transfer', 'check', 'credit_card') THEN 'BANK' ELSE 'CASH' END
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND lower(account.balance_type) = 'debit'
  ORDER BY mapping.id LIMIT 1;

  IF v_debit_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid % account mapping is required before paying this traffic violation', v_debit_type
      USING ERRCODE = 'P0001';
  END IF;
  IF v_credit_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid cash or bank account mapping is required before paying this traffic violation'
      USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, COALESCE(p_payment_date, CURRENT_DATE)) THEN
    RAISE EXCEPTION 'Traffic violation payment posting is blocked by a closed accounting period'
      USING ERRCODE = 'P0001';
  END IF;

  v_description := 'سداد مخالفة مرورية - ' || v_violation.violation_number;

  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    status, total_debit, total_credit, created_by, posted_by, posted_at
  ) VALUES (
    v_journal_id, p_company_id,
    'JE-TV-' || to_char(COALESCE(p_payment_date, CURRENT_DATE), 'YYYYMMDD') || '-' || left(v_journal_id::text, 8),
    COALESCE(p_payment_date, CURRENT_DATE), v_description, 'traffic_violation_payment', v_payment_id,
    'posted', p_amount, p_amount, v_actor_id, v_actor_id, now()
  );

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_description, debit_amount, credit_amount, line_number
  ) VALUES
    (v_journal_id, v_debit_account_id, v_description, p_amount, 0, 1),
    (v_journal_id, v_credit_account_id, v_description, 0, p_amount, 2);

  INSERT INTO public.traffic_violation_payments (
    id, company_id, traffic_violation_id, payment_number, payment_date, amount,
    payment_method, payment_type, bank_account, check_number, reference_number,
    notes, status, journal_entry_id, created_by
  ) VALUES (
    v_payment_id, p_company_id, p_violation_id,
    public.generate_traffic_payment_number(p_company_id), COALESCE(p_payment_date, CURRENT_DATE), p_amount,
    p_payment_method, p_payment_type, NULLIF(btrim(COALESCE(p_bank_account, '')), ''),
    NULLIF(btrim(COALESCE(p_check_number, '')), ''), NULLIF(btrim(COALESCE(p_reference_number, '')), ''),
    NULLIF(btrim(COALESCE(p_notes, '')), ''), 'completed', v_journal_id, v_actor_id
  ) RETURNING * INTO v_payment;

  UPDATE public.traffic_violations
  SET status = CASE WHEN v_next_paid_amount >= fine_amount - 0.001 THEN 'paid' ELSE 'pending' END,
      payment_date = CASE WHEN v_next_paid_amount >= fine_amount - 0.001
        THEN COALESCE(p_payment_date, CURRENT_DATE) ELSE NULL END,
      payment_method = p_payment_method,
      liability_amount = CASE
        WHEN responsibility_party = 'company' AND liability_journal_entry_id IS NOT NULL
          THEN GREATEST(COALESCE(liability_amount, 0) - p_amount, 0)
        ELSE liability_amount
      END,
      updated_at = now()
  WHERE id = p_violation_id AND company_id = p_company_id;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.create_traffic_violation_payment_with_journal_v2(
  uuid, uuid, numeric, text, text, date, text, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_traffic_violation_payment_with_journal_v2(
  uuid, uuid, numeric, text, text, date, text, text, text, text, uuid
) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_traffic_violation_payment_with_journal_v2(
  uuid, uuid, numeric, text, text, date, text, text, text, text, uuid
) IS 'Pays customer-borne violations through receivables, unaccrued company violations through expense, and accrued company violations through traffic fines payable.';
