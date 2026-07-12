-- Keep receipt journals on valid leaf posting accounts and repair only mappings
-- that are missing or demonstrably invalid.

CREATE TABLE IF NOT EXISTS public.financial_configuration_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_version text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  configuration_key text NOT NULL,
  previous_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz,
  UNIQUE (migration_version, company_id, configuration_key)
);

ALTER TABLE public.financial_configuration_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.financial_configuration_snapshots
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_configuration_snapshots
  TO service_role;

CREATE TEMP TABLE payment_mapping_targets (
  company_id uuid NOT NULL,
  type_code text NOT NULL,
  default_account_type_id uuid NOT NULL,
  chart_of_accounts_id uuid NOT NULL,
  account_code text NOT NULL,
  PRIMARY KEY (company_id, type_code)
) ON COMMIT DROP;

INSERT INTO payment_mapping_targets (
  company_id, type_code, default_account_type_id, chart_of_accounts_id, account_code
)
SELECT c.id, dat.type_code, dat.id, candidate.id, candidate.account_code::text
FROM public.companies c
JOIN public.default_account_types dat ON dat.type_code = 'BANK'
JOIN LATERAL (
  SELECT coa.id, coa.account_code
  FROM public.chart_of_accounts coa
  WHERE coa.company_id = c.id
    AND coa.is_active = true
    AND COALESCE(coa.is_header, false) = false
    AND COALESCE(coa.account_level, 0) >= 3
    AND lower(COALESCE(coa.account_type, '')) = 'assets'
    AND lower(COALESCE(coa.balance_type, '')) = 'debit'
    AND coa.account_code IN ('11151', '1120101', '11201')
  ORDER BY array_position(
    ARRAY['11151', '1120101', '11201']::text[], coa.account_code::text
  )
  LIMIT 1
) candidate ON true;

INSERT INTO payment_mapping_targets (
  company_id, type_code, default_account_type_id, chart_of_accounts_id, account_code
)
SELECT c.id, dat.type_code, dat.id, candidate.id, candidate.account_code::text
FROM public.companies c
JOIN public.default_account_types dat ON dat.type_code = 'CASH'
JOIN LATERAL (
  SELECT coa.id, coa.account_code
  FROM public.chart_of_accounts coa
  WHERE coa.company_id = c.id
    AND coa.is_active = true
    AND COALESCE(coa.is_header, false) = false
    AND COALESCE(coa.account_level, 0) >= 3
    AND lower(COALESCE(coa.account_type, '')) = 'assets'
    AND lower(COALESCE(coa.balance_type, '')) = 'debit'
    AND coa.account_code IN ('11111', '11101')
  ORDER BY array_position(
    ARRAY['11111', '11101']::text[], coa.account_code::text
  )
  LIMIT 1
) candidate ON true;

INSERT INTO payment_mapping_targets (
  company_id, type_code, default_account_type_id, chart_of_accounts_id, account_code
)
SELECT c.id, dat.type_code, dat.id, candidate.id, candidate.account_code::text
FROM public.companies c
JOIN public.default_account_types dat ON dat.type_code = 'RECEIVABLES'
JOIN LATERAL (
  SELECT coa.id, coa.account_code
  FROM public.chart_of_accounts coa
  WHERE coa.company_id = c.id
    AND coa.is_active = true
    AND COALESCE(coa.is_header, false) = false
    AND COALESCE(coa.account_level, 0) >= 3
    AND lower(COALESCE(coa.account_type, '')) = 'assets'
    AND lower(COALESCE(coa.balance_type, '')) = 'debit'
    AND coa.account_code IN ('1200', '11301')
  ORDER BY array_position(
    ARRAY['1200', '11301']::text[], coa.account_code::text
  )
  LIMIT 1
) candidate ON true;

INSERT INTO public.financial_configuration_snapshots (
  migration_version, company_id, configuration_key, previous_value, applied_value
)
SELECT
  '20260712050500',
  target.company_id,
  'payment_mapping:' || target.type_code,
  CASE
    WHEN current_mapping.id IS NULL THEN jsonb_build_object('missing', true)
    ELSE jsonb_build_object(
      'mapping_id', current_mapping.id,
      'chart_of_accounts_id', current_mapping.chart_of_accounts_id,
      'is_active', current_mapping.is_active
    )
  END,
  jsonb_build_object(
    'default_account_type_id', target.default_account_type_id,
    'chart_of_accounts_id', target.chart_of_accounts_id,
    'account_code', target.account_code
  )
FROM payment_mapping_targets target
LEFT JOIN LATERAL (
  SELECT am.*
  FROM public.account_mappings am
  WHERE am.company_id = target.company_id
    AND am.default_account_type_id = target.default_account_type_id
  ORDER BY am.is_active DESC, am.updated_at DESC, am.id
  LIMIT 1
) current_mapping ON true
LEFT JOIN public.chart_of_accounts current_account
  ON current_account.id = current_mapping.chart_of_accounts_id
WHERE current_mapping.id IS NULL
   OR current_mapping.is_active IS DISTINCT FROM true
   OR current_account.id IS NULL
   OR current_account.company_id IS DISTINCT FROM target.company_id
   OR current_account.is_active IS DISTINCT FROM true
   OR COALESCE(current_account.is_header, false) = true
   OR COALESCE(current_account.account_level, 0) < 3
   OR lower(COALESCE(current_account.account_type, '')) <> 'assets'
   OR lower(COALESCE(current_account.balance_type, '')) <> 'debit'
   OR (
     target.type_code IN ('BANK', 'RECEIVABLES')
     AND current_account.account_code = '11101'
   )
ON CONFLICT (migration_version, company_id, configuration_key) DO NOTHING;

UPDATE public.account_mappings mapping
SET
  chart_of_accounts_id = target.chart_of_accounts_id,
  is_active = true,
  updated_at = now()
FROM payment_mapping_targets target
JOIN public.financial_configuration_snapshots snapshot
  ON snapshot.migration_version = '20260712050500'
 AND snapshot.company_id = target.company_id
 AND snapshot.configuration_key = 'payment_mapping:' || target.type_code
WHERE mapping.company_id = target.company_id
  AND mapping.default_account_type_id = target.default_account_type_id
  AND COALESCE((snapshot.previous_value ->> 'missing')::boolean, false) = false;

INSERT INTO public.account_mappings (
  company_id, default_account_type_id, chart_of_accounts_id, is_active
)
SELECT
  target.company_id,
  target.default_account_type_id,
  target.chart_of_accounts_id,
  true
FROM payment_mapping_targets target
JOIN public.financial_configuration_snapshots snapshot
  ON snapshot.migration_version = '20260712050500'
 AND snapshot.company_id = target.company_id
 AND snapshot.configuration_key = 'payment_mapping:' || target.type_code
WHERE COALESCE((snapshot.previous_value ->> 'missing')::boolean, false) = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.account_mappings mapping
    WHERE mapping.company_id = target.company_id
      AND mapping.default_account_type_id = target.default_account_type_id
  );

CREATE OR REPLACE FUNCTION public.create_payment_receipt_journal(
  p_payment_id uuid,
  p_company_id uuid,
  p_payment_number text,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text,
  p_invoice_id uuid,
  p_account_id uuid,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_cash_account_id uuid;
  v_offset_account_id uuid;
  v_preferred_cash_type text;
  v_offset_type text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL OR p_payment_date IS NULL OR COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Valid payment id, company, date, and amount are required for journal creation'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT je.id INTO v_journal_id
  FROM public.journal_entries je
  WHERE je.company_id = p_company_id
    AND je.reference_type = 'payment'
    AND je.reference_id = p_payment_id
  ORDER BY je.created_at
  LIMIT 1;
  IF v_journal_id IS NOT NULL THEN
    RETURN v_journal_id;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, p_payment_date);

  IF p_account_id IS NOT NULL THEN
    SELECT coa.id INTO v_cash_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.id = p_account_id
      AND coa.company_id = p_company_id
      AND coa.is_active = true
      AND COALESCE(coa.is_header, false) = false
      AND COALESCE(coa.account_level, 0) >= 3
      AND lower(COALESCE(coa.account_type, '')) = 'assets'
      AND lower(COALESCE(coa.balance_type, '')) = 'debit'
    LIMIT 1;
  END IF;

  v_preferred_cash_type := CASE
    WHEN lower(COALESCE(p_payment_method, '')) IN (
      'bank_transfer', 'wiretransfer', 'check', 'cheque',
      'credit_card', 'debit_card', 'card'
    ) THEN 'BANK'
    ELSE 'CASH'
  END;

  IF v_cash_account_id IS NULL THEN
    SELECT am.chart_of_accounts_id INTO v_cash_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON dat.id = am.default_account_type_id
    JOIN public.chart_of_accounts coa ON coa.id = am.chart_of_accounts_id
    WHERE am.company_id = p_company_id
      AND dat.type_code IN ('BANK', 'CASH')
      AND am.is_active = true
      AND coa.is_active = true
      AND COALESCE(coa.is_header, false) = false
      AND COALESCE(coa.account_level, 0) >= 3
      AND lower(COALESCE(coa.account_type, '')) = 'assets'
      AND lower(COALESCE(coa.balance_type, '')) = 'debit'
    ORDER BY CASE
      WHEN dat.type_code = v_preferred_cash_type THEN 1
      WHEN dat.type_code = 'BANK' THEN 2
      ELSE 3
    END
    LIMIT 1;
  END IF;

  v_offset_type := CASE WHEN p_invoice_id IS NULL THEN 'CUSTOMER_ADVANCES' ELSE 'RECEIVABLES' END;
  SELECT am.chart_of_accounts_id INTO v_offset_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON dat.id = am.default_account_type_id
  JOIN public.chart_of_accounts coa ON coa.id = am.chart_of_accounts_id
  WHERE am.company_id = p_company_id
    AND dat.type_code = v_offset_type
    AND am.is_active = true
    AND coa.is_active = true
    AND COALESCE(coa.is_header, false) = false
    AND COALESCE(coa.account_level, 0) >= 3
    AND (
      (
        v_offset_type = 'RECEIVABLES'
        AND lower(COALESCE(coa.account_type, '')) = 'assets'
        AND lower(COALESCE(coa.balance_type, '')) = 'debit'
      )
      OR (
        v_offset_type = 'CUSTOMER_ADVANCES'
        AND lower(COALESCE(coa.account_type, '')) = 'liabilities'
        AND lower(COALESCE(coa.balance_type, '')) = 'credit'
      )
    )
  LIMIT 1;

  IF v_cash_account_id IS NULL OR v_offset_account_id IS NULL THEN
    RAISE EXCEPTION 'Required cash/bank or % account mapping is missing or not a valid posting account', v_offset_type
      USING ERRCODE = 'P0001';
  END IF;
  IF v_cash_account_id = v_offset_account_id THEN
    RAISE EXCEPTION 'Receipt debit and offset accounts must be different'
      USING ERRCODE = 'P0001';
  END IF;

  v_entry_number := 'JE-PAY-' || to_char(p_payment_date, 'YYYYMMDD') || '-' || substring(p_payment_id::text, 1, 8);
  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id,
    created_by, created_at, updated_at
  ) VALUES (
    p_company_id, v_entry_number, p_payment_date,
    'Payment receipt: ' || COALESCE(p_payment_number, p_payment_id::text),
    p_amount, p_amount, 'draft', 'payment', p_payment_id,
    p_actor_id, now(), now()
  ) RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
  ) VALUES
    (v_journal_id, v_cash_account_id, 1, 'Payment received', p_amount, 0),
    (
      v_journal_id, v_offset_account_id, 2,
      CASE WHEN p_invoice_id IS NULL THEN 'Customer advance' ELSE 'Receivables settlement' END,
      0, p_amount
    );

  UPDATE public.journal_entries
  SET status = 'posted', posted_by = p_actor_id, posted_at = now(), updated_at = now()
  WHERE id = v_journal_id;

  RETURN v_journal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_payment_receipt_journal(
  uuid, uuid, text, date, numeric, text, uuid, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_receipt_journal(
  uuid, uuid, text, date, numeric, text, uuid, uuid, uuid
) TO service_role;

COMMENT ON FUNCTION public.create_payment_receipt_journal(
  uuid, uuid, text, date, numeric, text, uuid, uuid, uuid
) IS 'Creates a posted receipt journal using only valid level-3-or-deeper debit and offset accounts.';
