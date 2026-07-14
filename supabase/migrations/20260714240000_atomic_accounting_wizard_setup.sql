-- Apply the accounting wizard as one tenant-scoped transaction.

CREATE OR REPLACE FUNCTION public.setup_accounting_system_v1(
  p_company_id uuid,
  p_accounts jsonb,
  p_banks jsonb,
  p_business_type text,
  p_strategy text DEFAULT 'skip',
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_item record;
  v_account_id uuid;
  v_created_accounts integer := 0;
  v_created_banks integer := 0;
  v_settings jsonb;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF lower(COALESCE(p_strategy, 'skip')) NOT IN ('skip', 'merge')
     OR jsonb_typeof(COALESCE(p_accounts, 'null'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_banks, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Wizard strategy or payload is invalid' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':accounting-wizard', 0));

  FOR v_item IN SELECT item.value FROM jsonb_array_elements(p_accounts) item(value)
  LOOP
    IF NULLIF(BTRIM(COALESCE(v_item.value ->> 'account_code', '')), '') IS NULL
       OR NULLIF(BTRIM(COALESCE(v_item.value ->> 'account_name', '')), '') IS NULL
       OR COALESCE((v_item.value ->> 'account_level')::integer, 0) < 1
    THEN RAISE EXCEPTION 'Wizard contains an invalid account' USING ERRCODE = 'P0001'; END IF;
    INSERT INTO public.chart_of_accounts (
      company_id, account_code, account_name, account_name_ar, account_type, balance_type,
      account_level, is_header, is_active, is_system, description, current_balance
    ) VALUES (
      p_company_id, BTRIM(v_item.value ->> 'account_code'), BTRIM(v_item.value ->> 'account_name'),
      NULLIF(BTRIM(COALESCE(v_item.value ->> 'account_name_ar', '')), ''),
      BTRIM(v_item.value ->> 'account_type'), BTRIM(v_item.value ->> 'balance_type'),
      (v_item.value ->> 'account_level')::integer,
      COALESCE((v_item.value ->> 'is_header')::boolean, false), true,
      COALESCE((v_item.value ->> 'is_system')::boolean, false),
      NULLIF(BTRIM(COALESCE(v_item.value ->> 'description', '')), ''), 0
    ) ON CONFLICT (company_id, account_code) DO NOTHING
    RETURNING id INTO v_account_id;
    IF v_account_id IS NOT NULL THEN
      v_created_accounts := v_created_accounts + 1;
    ELSIF lower(COALESCE(p_strategy, 'skip')) = 'merge' THEN
      UPDATE public.chart_of_accounts account SET
        account_name = BTRIM(v_item.value ->> 'account_name'),
        account_name_ar = NULLIF(BTRIM(COALESCE(v_item.value ->> 'account_name_ar', '')), ''),
        description = NULLIF(BTRIM(COALESCE(v_item.value ->> 'description', '')), ''),
        is_active = true, updated_at = now()
      WHERE account.company_id = p_company_id
        AND account.account_code = BTRIM(v_item.value ->> 'account_code');
    END IF;
    v_account_id := NULL;
  END LOOP;

  INSERT INTO public.chart_of_accounts (
    company_id, account_code, account_name, account_name_ar, account_type, balance_type,
    account_level, is_header, is_active, is_system, description, current_balance
  ) VALUES
    (p_company_id, '11211', 'Individual Customers', 'عملاء أفراد', 'assets', 'debit', 5, true, true, false, 'حسابات العملاء الأفراد', 0),
    (p_company_id, '11212', 'Corporate Customers', 'عملاء شركات', 'assets', 'debit', 5, true, true, false, 'حسابات العملاء من الشركات', 0),
    (p_company_id, '21111', 'Local Suppliers', 'موردون محليون', 'liabilities', 'credit', 5, true, true, false, 'حسابات الموردين المحليين', 0),
    (p_company_id, '21112', 'Foreign Suppliers', 'موردون خارجيون', 'liabilities', 'credit', 5, true, true, false, 'حسابات الموردين الخارجيين', 0)
  ON CONFLICT (company_id, account_code) DO NOTHING;
  IF lower(COALESCE(p_business_type, '')) = 'car_rental' THEN
    INSERT INTO public.chart_of_accounts (
      company_id, account_code, account_name, account_name_ar, account_type, balance_type,
      account_level, is_header, is_active, is_system, description, current_balance
    ) VALUES
      (p_company_id, '42111', 'Daily Rental Revenue', 'إيرادات التأجير اليومي', 'revenue', 'credit', 5, false, true, false, 'إيرادات تأجير المركبات بنظام يومي', 0),
      (p_company_id, '42112', 'Monthly Rental Revenue', 'إيرادات التأجير الشهري', 'revenue', 'credit', 5, false, true, false, 'إيرادات تأجير المركبات بنظام شهري', 0)
    ON CONFLICT (company_id, account_code) DO NOTHING;
  END IF;

  FOR v_item IN SELECT item.value FROM jsonb_array_elements(COALESCE(p_banks, '[]'::jsonb)) item(value)
  LOOP
    IF COALESCE((v_item.value ->> 'opening_balance')::numeric, 0) <> 0 THEN
      RAISE EXCEPTION 'Wizard bank opening balances must be recorded later with a balanced treasury entry'
        USING ERRCODE = 'P0001';
    END IF;
    IF NULLIF(BTRIM(COALESCE(v_item.value ->> 'account_number', '')), '') IS NULL
       OR NULLIF(BTRIM(COALESCE(v_item.value ->> 'bank_name', '')), '') IS NULL
    THEN RAISE EXCEPTION 'Wizard contains an invalid bank' USING ERRCODE = 'P0001'; END IF;
    INSERT INTO public.banks (
      company_id, bank_name, account_number, currency, opening_balance, current_balance,
      is_active, is_primary
    ) VALUES (
      p_company_id, BTRIM(v_item.value ->> 'bank_name'), BTRIM(v_item.value ->> 'account_number'),
      COALESCE(NULLIF(BTRIM(v_item.value ->> 'currency'), ''), 'QAR'), 0, 0, true,
      COALESCE((v_item.value ->> 'is_primary')::boolean, false)
    ) ON CONFLICT (company_id, account_number) DO NOTHING
    RETURNING id INTO v_account_id;
    IF v_account_id IS NOT NULL THEN v_created_banks := v_created_banks + 1; END IF;
    v_account_id := NULL;
  END LOOP;

  PERFORM public.ensure_essential_account_mappings(p_company_id);
  SELECT jsonb_build_object(
    'default_receivables_account_id', max(id) FILTER (WHERE account_code IN ('1211', '1201')),
    'default_payables_account_id', max(id) FILTER (WHERE account_code = '2111'),
    'default_revenue_account_id', max(id) FILTER (WHERE account_code IN ('4111', '4211')),
    'default_cash_account_id', max(id) FILTER (WHERE account_code = '1111'),
    'default_bank_account_id', max(id) FILTER (WHERE account_code = '1121'),
    'auto_create_customer_accounts', true,
    'customer_account_prefix', 'CUST-', 'supplier_account_prefix', 'SUPP-',
    'enable_account_selection', true, 'auto_create_account', true,
    'account_naming_pattern', 'customer_name', 'account_group_by', 'customer_type'
  ) INTO v_settings
  FROM public.chart_of_accounts WHERE company_id = p_company_id;
  UPDATE public.companies SET customer_account_settings = v_settings, updated_at = now()
  WHERE id = p_company_id;
  RETURN jsonb_build_object('created_accounts', v_created_accounts, 'created_banks', v_created_banks);
END;
$$;

REVOKE ALL ON FUNCTION public.setup_accounting_system_v1(uuid, jsonb, jsonb, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_accounting_system_v1(uuid, jsonb, jsonb, text, text, uuid) TO authenticated, service_role;

