BEGIN;
-- Restores the pre-change helpers, including the old gross-receivables defect.
-- Keep the new mapping type and any company mapping as durable configuration.
CREATE OR REPLACE FUNCTION public.create_payment_receipt_journal(p_payment_id uuid, p_company_id uuid, p_payment_number text, p_payment_date date, p_amount numeric, p_payment_method text, p_invoice_id uuid, p_account_id uuid, p_actor_id uuid, p_cost_center_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_cash_account_id uuid;
  v_offset_account_id uuid;
  v_cost_center_id uuid;
  v_preferred_cash_type text;
  v_offset_type text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL OR p_payment_date IS NULL
     OR COALESCE(p_amount, 0) <= 0
  THEN
    RAISE EXCEPTION 'Valid payment, company, date, and positive amount are required for receipt posting'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT entry.id
  INTO v_journal_id
  FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id
    AND entry.reference_type = 'payment'
    AND entry.reference_id = p_payment_id
  ORDER BY entry.created_at
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    RETURN v_journal_id;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, p_payment_date);

  IF p_cost_center_id IS NOT NULL THEN
    SELECT center.id
    INTO v_cost_center_id
    FROM public.cost_centers center
    WHERE center.id = p_cost_center_id
      AND center.company_id = p_company_id
      AND COALESCE(center.is_active, true) = true;

    IF v_cost_center_id IS NULL THEN
      RAISE EXCEPTION 'The selected cost center is inactive or belongs to another company'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_account_id IS NOT NULL THEN
    SELECT account.id
    INTO v_cash_account_id
    FROM public.chart_of_accounts account
    WHERE account.id = p_account_id
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) = 'assets'
      AND lower(COALESCE(account.balance_type, '')) = 'debit';

    IF v_cash_account_id IS NULL THEN
      RAISE EXCEPTION 'The selected receipt account is not an active posting asset account for this company'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_preferred_cash_type := CASE
    WHEN public.payment_method_uses_bank(p_payment_method) THEN 'BANK'
    ELSE 'CASH'
  END;

  IF v_cash_account_id IS NULL THEN
    SELECT mapping.chart_of_accounts_id
    INTO v_cash_account_id
    FROM public.account_mappings mapping
    JOIN public.default_account_types account_type
      ON account_type.id = mapping.default_account_type_id
    JOIN public.chart_of_accounts account
      ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id
      AND account_type.type_code IN ('BANK', 'CASH')
      AND mapping.is_active = true
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) = 'assets'
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
    ORDER BY CASE
      WHEN account_type.type_code = v_preferred_cash_type THEN 1
      WHEN account_type.type_code = 'BANK' THEN 2
      ELSE 3
    END,
    mapping.id
    LIMIT 1;
  END IF;

  v_offset_type := CASE
    WHEN p_invoice_id IS NULL THEN 'CUSTOMER_ADVANCES'
    ELSE 'RECEIVABLES'
  END;

  SELECT mapping.chart_of_accounts_id
  INTO v_offset_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type
    ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account
    ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id
    AND account_type.type_code = v_offset_type
    AND mapping.is_active = true
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND (
      (
        v_offset_type = 'RECEIVABLES'
        AND lower(COALESCE(account.account_type, '')) = 'assets'
        AND lower(COALESCE(account.balance_type, '')) = 'debit'
      )
      OR (
        v_offset_type = 'CUSTOMER_ADVANCES'
        AND lower(COALESCE(account.account_type, '')) = 'liabilities'
        AND lower(COALESCE(account.balance_type, '')) = 'credit'
      )
    )
  ORDER BY mapping.id
  LIMIT 1;

  IF v_cash_account_id IS NULL OR v_offset_account_id IS NULL THEN
    RAISE EXCEPTION 'Required cash/bank or % posting mapping is missing', v_offset_type
      USING ERRCODE = 'P0001';
  END IF;
  IF v_cash_account_id = v_offset_account_id THEN
    RAISE EXCEPTION 'Receipt debit and credit accounts must be different'
      USING ERRCODE = 'P0001';
  END IF;

  v_entry_number := 'JE-PAY-' || p_payment_id::text;

  INSERT INTO public.journal_entries (
    company_id,
    entry_number,
    entry_date,
    description,
    total_debit,
    total_credit,
    status,
    reference_type,
    reference_id,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    v_entry_number,
    p_payment_date,
    'Payment receipt: ' || COALESCE(p_payment_number, p_payment_id::text),
    p_amount,
    p_amount,
    'draft',
    'payment',
    p_payment_id,
    p_actor_id,
    now(),
    now()
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    line_description,
    debit_amount,
    credit_amount,
    cost_center_id
  ) VALUES
    (
      v_journal_id,
      v_cash_account_id,
      1,
      'Payment received',
      p_amount,
      0,
      v_cost_center_id
    ),
    (
      v_journal_id,
      v_offset_account_id,
      2,
      CASE WHEN p_invoice_id IS NULL THEN 'Customer advance' ELSE 'Receivables settlement' END,
      0,
      p_amount,
      v_cost_center_id
    );

  UPDATE public.journal_entries entry
  SET
    status = 'posted',
    posted_by = p_actor_id,
    posted_at = now(),
    updated_at = now()
  WHERE entry.id = v_journal_id;

  RETURN v_journal_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_payment_journal_entry_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(COALESCE(NEW.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(NEW.transaction_type::text, 'receipt')) <> 'receipt'
     OR NEW.journal_entry_id IS NOT NULL
  THEN
    RETURN NEW;
  END IF;

  NEW.journal_entry_id := public.create_payment_receipt_journal(
    NEW.id,
    NEW.company_id,
    NEW.payment_number,
    NEW.payment_date,
    NEW.amount,
    NEW.payment_method,
    NEW.invoice_id,
    NEW.account_id,
    NEW.created_by,
    NEW.cost_center_id
  );
  RETURN NEW;
END;
$function$;
DROP FUNCTION public.create_payment_receipt_journal_v2(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid,numeric);
DROP FUNCTION public.resolve_receipt_posting_account_v1(uuid,text);
-- Restore the exact inspected pre-migration ACL (trigger functions cannot be called as RPCs).
GRANT EXECUTE ON FUNCTION public.trg_payment_journal_entry_fn() TO PUBLIC,anon,authenticated,service_role;
COMMIT;
