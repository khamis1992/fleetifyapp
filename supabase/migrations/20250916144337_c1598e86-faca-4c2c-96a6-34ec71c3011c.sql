-- Ensure essential account mappings function (robust, schema-safe)
CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_created text[] := ARRAY[]::text[];
  v_existing text[] := ARRAY[]::text[];
  v_errors  text[] := ARRAY[]::text[];

  v_revenue_account_id uuid;
  v_receivables_account_id uuid;
  v_cash_account_id uuid;
BEGIN
  IF company_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'created', v_created,
      'existing', v_existing,
      'errors', ARRAY['Company ID is required']::text[]
    );
  END IF;

  -- Try to detect common essential accounts in a tolerant way
  -- Revenue account
  SELECT id INTO v_revenue_account_id
  FROM chart_of_accounts
  WHERE company_id = company_id_param
    AND is_active = true
    AND COALESCE(is_header, false) = false
    AND (
      account_type IN ('revenue', 'income')
      OR account_name ILIKE '%revenue%'
      OR COALESCE(account_name_ar,'') ILIKE '%إيراد%'
    )
  ORDER BY is_system DESC, account_level NULLS LAST
  LIMIT 1;

  -- Receivables account (current assets, name contains receivable/ذمم/مدين)
  SELECT id INTO v_receivables_account_id
  FROM chart_of_accounts
  WHERE company_id = company_id_param
    AND is_active = true
    AND COALESCE(is_header, false) = false
    AND (
      account_type IN ('current_assets', 'assets')
      AND (
        account_name ILIKE '%receivable%'
        OR COALESCE(account_name_ar,'') ILIKE '%ذمم%'
        OR COALESCE(account_name_ar,'') ILIKE '%مدين%'
      )
    )
  ORDER BY is_system DESC, account_level NULLS LAST
  LIMIT 1;

  -- Cash/Bank account (current assets, name contains cash/bank/نقد/بنك)
  SELECT id INTO v_cash_account_id
  FROM chart_of_accounts
  WHERE company_id = company_id_param
    AND is_active = true
    AND COALESCE(is_header, false) = false
    AND (
      account_type IN ('current_assets', 'assets')
      AND (
        account_name ILIKE '%cash%'
        OR account_name ILIKE '%bank%'
        OR COALESCE(account_name_ar,'') ILIKE '%نقد%'
        OR COALESCE(account_name_ar,'') ILIKE '%بنك%'
      )
    )
  ORDER BY is_system DESC, account_level NULLS LAST
  LIMIT 1;

  -- Upsert helper using essential_account_mappings (keeps it decoupled from default_account_types)
  PERFORM 1 FROM essential_account_mappings 
   WHERE company_id = company_id_param AND account_type = 'revenue';
  IF FOUND THEN
    UPDATE essential_account_mappings
      SET account_id = COALESCE(v_revenue_account_id, account_id),
          is_configured = (COALESCE(v_revenue_account_id, account_id) IS NOT NULL),
          updated_at = now()
    WHERE company_id = company_id_param AND account_type = 'revenue';
    v_existing := array_append(v_existing, 'Revenue');
  ELSE
    INSERT INTO essential_account_mappings (company_id, account_type, account_id, is_configured, created_at, updated_at)
    VALUES (company_id_param, 'revenue', v_revenue_account_id, (v_revenue_account_id IS NOT NULL), now(), now());
    v_created := array_append(v_created, 'Revenue');
  END IF;

  PERFORM 1 FROM essential_account_mappings 
   WHERE company_id = company_id_param AND account_type = 'receivables';
  IF FOUND THEN
    UPDATE essential_account_mappings
      SET account_id = COALESCE(v_receivables_account_id, account_id),
          is_configured = (COALESCE(v_receivables_account_id, account_id) IS NOT NULL),
          updated_at = now()
    WHERE company_id = company_id_param AND account_type = 'receivables';
    v_existing := array_append(v_existing, 'Receivables');
  ELSE
    INSERT INTO essential_account_mappings (company_id, account_type, account_id, is_configured, created_at, updated_at)
    VALUES (company_id_param, 'receivables', v_receivables_account_id, (v_receivables_account_id IS NOT NULL), now(), now());
    v_created := array_append(v_created, 'Receivables');
  END IF;

  PERFORM 1 FROM essential_account_mappings 
   WHERE company_id = company_id_param AND account_type = 'cash';
  IF FOUND THEN
    UPDATE essential_account_mappings
      SET account_id = COALESCE(v_cash_account_id, account_id),
          is_configured = (COALESCE(v_cash_account_id, account_id) IS NOT NULL),
          updated_at = now()
    WHERE company_id = company_id_param AND account_type = 'cash';
    v_existing := array_append(v_existing, 'Cash/Bank');
  ELSE
    INSERT INTO essential_account_mappings (company_id, account_type, account_id, is_configured, created_at, updated_at)
    VALUES (company_id_param, 'cash', v_cash_account_id, (v_cash_account_id IS NOT NULL), now(), now());
    v_created := array_append(v_created, 'Cash/Bank');
  END IF;

  RETURN jsonb_build_object(
    'created', v_created,
    'existing', v_existing,
    'errors', v_errors
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'created', v_created,
      'existing', v_existing,
      'errors', array_append(v_errors, SQLERRM)
    );
END;
$$;