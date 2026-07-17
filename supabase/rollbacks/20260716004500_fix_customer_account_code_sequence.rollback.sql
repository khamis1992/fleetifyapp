-- Keep generated customer accounts because they may already have postings.
-- Restore only the previous account-code generation behavior.
CREATE OR REPLACE FUNCTION public.create_customer_financial_account_fixed(
  customer_id_param uuid, company_id_param uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_parent uuid;
  v_account uuid;
  v_code text;
  v_name text;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-account:' || company_id_param, 0));

  SELECT ca.account_id INTO v_account
  FROM public.customer_accounts ca
  WHERE ca.customer_id = customer_id_param
    AND ca.company_id = company_id_param
    AND ca.is_active
  LIMIT 1;
  IF v_account IS NOT NULL THEN RETURN v_account; END IF;

  SELECT * INTO v_customer
  FROM public.customers c
  WHERE c.id = customer_id_param
    AND c.company_id = company_id_param
    AND c.is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer was not found in the selected company';
  END IF;

  SELECT a.id INTO v_parent
  FROM public.chart_of_accounts a
  WHERE a.company_id = company_id_param
    AND a.is_active
    AND a.is_header
    AND (a.account_code = '1201' OR a.account_name ILIKE '%receivable%')
  ORDER BY (a.account_code = '1201') DESC, a.account_level DESC
  LIMIT 1;

  SELECT '1201' || lpad(
    (COALESCE(max((regexp_match(a.account_code, '([0-9]+)$'))[1]::bigint), 0) + 1)::text,
    4,
    '0'
  )
  INTO v_code
  FROM public.chart_of_accounts a
  WHERE a.company_id = company_id_param
    AND a.account_code LIKE '1201%';

  v_name := CASE
    WHEN v_customer.customer_type::text = 'individual'
      THEN trim(COALESCE(v_customer.first_name, '') || ' ' || COALESCE(v_customer.last_name, ''))
    ELSE COALESCE(v_customer.company_name, 'Customer')
  END;

  INSERT INTO public.chart_of_accounts(
    company_id, account_code, account_name, account_name_ar,
    account_type, account_subtype, balance_type, parent_account_id,
    account_level, is_header, is_system, description, current_balance,
    is_active, can_link_customers
  ) VALUES (
    company_id_param, v_code, 'Customer - ' || v_name, 'Customer - ' || v_name,
    'assets', 'accounts_receivable', 'debit', v_parent,
    CASE WHEN v_parent IS NULL THEN 3 ELSE 4 END,
    false, false, 'Customer receivables account', 0, true, true
  ) RETURNING id INTO v_account;

  INSERT INTO public.customer_accounts(
    company_id, customer_id, account_id, is_default, currency,
    credit_limit, account_purpose, is_active
  ) VALUES (
    company_id_param, customer_id_param, v_account, true, 'QAR',
    COALESCE(v_customer.credit_limit, 0), 'accounts_receivable', true
  );

  RETURN v_account;
END;
$$;
