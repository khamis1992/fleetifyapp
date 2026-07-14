-- Repair destructive chart operations, overdue-fee processing, and monthly vehicle depreciation.

CREATE OR REPLACE FUNCTION public.account_has_references_v1(p_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_reference record;
  v_exists boolean;
BEGIN
  IF p_account_id IS NULL THEN
    RETURN false;
  END IF;

  FOR v_reference IN
    SELECT child_ns.nspname AS schema_name, child.relname AS table_name, attribute.attname AS column_name
    FROM pg_catalog.pg_constraint constraint_row
    JOIN pg_catalog.pg_class child ON child.oid = constraint_row.conrelid
    JOIN pg_catalog.pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_catalog.pg_attribute attribute
      ON attribute.attrelid = constraint_row.conrelid
     AND attribute.attnum = constraint_row.conkey[1]
    WHERE constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'public.chart_of_accounts'::regclass
      AND array_length(constraint_row.conkey, 1) = 1
  LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I = $1)',
      v_reference.schema_name,
      v_reference.table_name,
      v_reference.column_name
    ) INTO v_exists USING p_account_id;
    IF v_exists THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.account_has_references_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_has_references_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.safe_delete_company_accounts_v2(
  p_company_id uuid,
  p_include_system_accounts boolean,
  p_include_inactive_accounts boolean,
  p_force_complete_reset boolean,
  p_deletion_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := clock_timestamp();
  v_account record;
  v_has_references boolean;
  v_deleted integer := 0;
  v_system_deleted integer := 0;
  v_inactive_deleted integer := 0;
  v_deactivated integer := 0;
  v_skipped integer := 0;
  v_failed integer := 0;
  v_processed integer := 0;
  v_success_details jsonb := '[]'::jsonb;
  v_error_details jsonb := '[]'::jsonb;
  v_action text;
  v_reason text;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(p_company_id);
  IF NOT EXISTS (SELECT 1 FROM public.companies company WHERE company.id = p_company_id) THEN
    RAISE EXCEPTION 'Company was not found' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':chart-delete', 0));

  FOR v_account IN
    SELECT account.id, account.account_code, account.account_name, account.account_level,
      COALESCE(account.is_system, false) AS is_system,
      COALESCE(account.is_active, true) AS is_active,
      COALESCE(account.current_balance, 0) AS current_balance
    FROM public.chart_of_accounts account
    WHERE account.company_id = p_company_id
      AND (COALESCE(account.is_active, true) OR p_include_inactive_accounts)
    ORDER BY account.account_level DESC, account.account_code
    FOR UPDATE
  LOOP
    v_processed := v_processed + 1;
    v_action := NULL;
    v_reason := NULL;
    v_has_references := false;

    BEGIN
      IF v_account.is_system AND NOT p_include_system_accounts THEN
        v_skipped := v_skipped + 1;
        v_action := 'skipped_system';
        v_reason := 'System account was preserved';
      ELSE
        v_has_references := public.account_has_references_v1(v_account.id);

        IF v_has_references OR abs(v_account.current_balance) > 0.005 THEN
          IF v_account.is_active THEN
            UPDATE public.chart_of_accounts account
            SET is_active = false, updated_at = now()
            WHERE account.id = v_account.id AND account.company_id = p_company_id;
            v_deactivated := v_deactivated + 1;
            v_action := 'deactivated';
          ELSE
            v_skipped := v_skipped + 1;
            v_action := 'retained_inactive';
          END IF;
          v_reason := CASE
            WHEN v_has_references THEN 'Account has dependent financial records'
            ELSE 'Account has a non-zero balance'
          END;
        ELSE
          DELETE FROM public.chart_of_accounts account
          WHERE account.id = v_account.id AND account.company_id = p_company_id;

          IF v_account.is_system THEN
            v_system_deleted := v_system_deleted + 1;
          ELSIF NOT v_account.is_active THEN
            v_inactive_deleted := v_inactive_deleted + 1;
          ELSE
            v_deleted := v_deleted + 1;
          END IF;
          v_action := 'deleted';
          v_reason := 'Unused zero-balance account';
        END IF;
      END IF;

      INSERT INTO public.account_deletion_log (
        company_id, deleted_account_id, deleted_account_code, deleted_account_name,
        deletion_type, deletion_reason, affected_records, deleted_by
      ) VALUES (
        p_company_id, v_account.id, v_account.account_code, v_account.account_name,
        v_action, concat_ws(' - ', NULLIF(btrim(COALESCE(p_deletion_reason, '')), ''), v_reason),
        jsonb_build_object('force_requested', p_force_complete_reset, 'references_preserved', v_has_references),
        auth.uid()
      );

      v_success_details := v_success_details || jsonb_build_array(jsonb_build_object(
        'account_code', v_account.account_code,
        'account_name', v_account.account_name,
        'action', v_action,
        'reason', v_reason,
        'is_system', v_account.is_system
      ));
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_error_details := v_error_details || jsonb_build_array(jsonb_build_object(
        'account_code', v_account.account_code,
        'account_name', v_account.account_name,
        'error', SQLERRM,
        'is_system', v_account.is_system
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', v_failed = 0,
    'error', CASE WHEN v_failed > 0 THEN format('%s accounts could not be processed', v_failed) END,
    'message', format('Processed %s accounts: %s deleted, %s deactivated, %s preserved, %s failed',
      v_processed, v_deleted + v_system_deleted + v_inactive_deleted, v_deactivated, v_skipped, v_failed),
    'deleted_count', v_deleted,
    'system_deleted_count', v_system_deleted,
    'inactive_deleted_count', v_inactive_deleted,
    'deactivated_count', v_deactivated,
    'skipped_count', v_skipped,
    'failed_count', v_failed,
    'total_processed', v_processed,
    'total_deleted', v_deleted + v_system_deleted + v_inactive_deleted,
    'deleted_accounts', v_success_details,
    'success_details', v_success_details,
    'error_details', v_error_details,
    'summary', jsonb_build_object(
      'total_processed', v_processed,
      'deleted_permanently', v_deleted + v_system_deleted + v_inactive_deleted,
      'deleted_soft', v_deactivated
    ),
    'settings_used', jsonb_build_object(
      'include_system_accounts', p_include_system_accounts,
      'include_inactive_accounts', p_include_inactive_accounts,
      'force_complete_reset', p_force_complete_reset
    ),
    'operation_duration', extract(epoch FROM clock_timestamp() - v_started_at)::text || ' seconds'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.safe_delete_company_accounts_v2(uuid,boolean,boolean,boolean,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.safe_delete_company_accounts_v2(uuid,boolean,boolean,boolean,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.bulk_delete_company_accounts(
  target_company_id uuid,
  include_system_accounts boolean DEFAULT false,
  deletion_reason text DEFAULT 'Bulk deletion operation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.safe_delete_company_accounts_v2(
    target_company_id, include_system_accounts, false, false, deletion_reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enhanced_complete_account_deletion(
  target_company_id uuid,
  include_system_accounts boolean DEFAULT false,
  include_inactive_accounts boolean DEFAULT false,
  force_complete_reset boolean DEFAULT false,
  deletion_reason text DEFAULT 'Enhanced bulk deletion'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.safe_delete_company_accounts_v2(
    target_company_id, include_system_accounts, include_inactive_accounts,
    force_complete_reset, deletion_reason
  )::json;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_enhanced_accounts_deletion_preview(
  target_company_id uuid,
  force_delete_system boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account record;
  v_total integer := 0;
  v_system integer := 0;
  v_delete integer := 0;
  v_deactivate integer := 0;
  v_skip integer := 0;
  v_has_references boolean;
  v_action text;
  v_samples jsonb := '[]'::jsonb;
  v_system_samples jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(target_company_id);

  FOR v_account IN
    SELECT account.id, account.account_code, account.account_name,
      COALESCE(account.is_system, false) AS is_system,
      COALESCE(account.current_balance, 0) AS current_balance
    FROM public.chart_of_accounts account
    WHERE account.company_id = target_company_id AND COALESCE(account.is_active, true)
    ORDER BY account.account_code
  LOOP
    v_total := v_total + 1;
    IF v_account.is_system THEN v_system := v_system + 1; END IF;
    v_has_references := public.account_has_references_v1(v_account.id);

    IF v_account.is_system AND NOT force_delete_system THEN
      v_action := 'skipped_system';
      v_skip := v_skip + 1;
    ELSIF v_has_references OR abs(v_account.current_balance) > 0.005 THEN
      v_action := 'deactivate';
      v_deactivate := v_deactivate + 1;
    ELSE
      v_action := 'delete';
      v_delete := v_delete + 1;
    END IF;

    IF jsonb_array_length(v_samples) < 10 THEN
      v_samples := v_samples || jsonb_build_array(jsonb_build_object(
        'account_code', v_account.account_code,
        'account_name', v_account.account_name,
        'action', v_action,
        'has_references', v_has_references,
        'has_non_zero_balance', abs(v_account.current_balance) > 0.005
      ));
    END IF;
    IF v_account.is_system AND jsonb_array_length(v_system_samples) < 5 THEN
      v_system_samples := v_system_samples || jsonb_build_array(jsonb_build_object(
        'account_code', v_account.account_code,
        'account_name', v_account.account_name,
        'action', v_action
      ));
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'total_accounts', v_total,
    'system_accounts', v_system,
    'regular_accounts', v_total - v_system,
    'will_be_deleted', v_delete,
    'will_be_deactivated', v_deactivate,
    'will_be_skipped', v_skip,
    'sample_accounts', v_samples,
    'system_accounts_sample', v_system_samples,
    'warning_message', CASE
      WHEN v_skip > 0 THEN format('%s system accounts will be preserved', v_skip)
      WHEN v_deactivate > 0 THEN format('%s referenced or non-zero accounts will be deactivated', v_deactivate)
      ELSE ''
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.copy_selected_accounts_to_company(
  target_company_id uuid,
  selected_account_codes text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template record;
  v_parent_id uuid;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(target_company_id);
  IF COALESCE(array_length(selected_account_codes, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one template account' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(target_company_id::text || ':chart-copy', 0));

  FOR v_template IN
    WITH RECURSIVE requested AS (
      SELECT template.*
      FROM public.default_chart_of_accounts template
      WHERE template.account_code = ANY(selected_account_codes)
      UNION
      SELECT parent.*
      FROM public.default_chart_of_accounts parent
      JOIN requested child ON child.parent_account_code = parent.account_code
    )
    SELECT requested.*
    FROM requested
    ORDER BY requested.account_level, requested.account_code
  LOOP
    SELECT account.id INTO v_parent_id
    FROM public.chart_of_accounts account
    WHERE account.company_id = target_company_id
      AND account.account_code = v_template.parent_account_code;

    INSERT INTO public.chart_of_accounts (
      company_id, account_code, account_name, account_name_ar, account_type,
      account_subtype, balance_type, account_level, is_header, is_system,
      description, sort_order, parent_account_id, parent_account_code, is_active
    ) VALUES (
      target_company_id, v_template.account_code, v_template.account_name,
      v_template.account_name_ar, v_template.account_type, v_template.account_subtype,
      v_template.balance_type, v_template.account_level, v_template.is_header,
      v_template.is_system, v_template.description, v_template.sort_order,
      v_parent_id, v_template.parent_account_code, true
    )
    ON CONFLICT (company_id, account_code) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.jsonb_number_v1(
  p_value jsonb,
  p_key text,
  p_default numeric DEFAULT 0
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN COALESCE(NULLIF(p_value ->> p_key, '')::numeric, p_default);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN p_default;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_overdue_invoices()
RETURNS TABLE(invoice_id uuid, invoice_number text, days_overdue integer, fee_amount numeric, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_company uuid;
  v_invoice record;
  v_fee_days integer;
  v_fee numeric;
  v_tier jsonb;
  v_min_days integer;
  v_max_days integer;
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    v_caller_company := NULL;
  ELSE
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
    END IF;
    v_caller_company := public.get_user_company_id();
    IF v_caller_company IS NULL THEN
      RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
    END IF;
  END IF;

  FOR v_invoice IN
    SELECT invoice.id, invoice.invoice_number, invoice.company_id, invoice.contract_id,
      invoice.total_amount, invoice.balance_due, invoice.due_date,
      rule.id AS rule_id, rule.rule_type, rule.fee_structure,
      rule.grace_period_days, rule.minimum_overdue_days
    FROM public.invoices invoice
    JOIN LATERAL (
      SELECT candidate.*
      FROM public.late_fee_rules candidate
      WHERE candidate.company_id = invoice.company_id
        AND candidate.is_enabled
        AND candidate.is_applies_to_invoices
        AND (CURRENT_DATE - invoice.due_date) >= candidate.minimum_overdue_days
      ORDER BY candidate.priority DESC, candidate.created_at
      LIMIT 1
    ) rule ON true
    WHERE invoice.due_date < CURRENT_DATE
      AND COALESCE(invoice.balance_due, 0) > 0
      AND lower(COALESCE(invoice.payment_status, 'unpaid')) <> 'paid'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void')
      AND (v_caller_company IS NULL OR invoice.company_id = v_caller_company)
      AND NOT EXISTS (
        SELECT 1 FROM public.late_fees existing
        WHERE existing.invoice_id = invoice.id AND existing.late_fee_rule_id = rule.id
      )
    ORDER BY invoice.due_date, invoice.id
    FOR UPDATE OF invoice SKIP LOCKED
  LOOP
    v_fee_days := GREATEST((CURRENT_DATE - v_invoice.due_date) - v_invoice.grace_period_days, 0);
    v_fee := 0;

    IF v_invoice.rule_type = 'fixed' THEN
      v_fee := public.jsonb_number_v1(v_invoice.fee_structure, 'dailyAmount', 0) * v_fee_days;
      v_fee := LEAST(v_fee, public.jsonb_number_v1(v_invoice.fee_structure, 'maxAmount', v_fee));
    ELSIF v_invoice.rule_type = 'percentage' THEN
      v_fee := COALESCE(v_invoice.total_amount, 0)
        * public.jsonb_number_v1(v_invoice.fee_structure, 'dailyRate', 0) / 100 * v_fee_days;
      v_fee := LEAST(
        v_fee,
        COALESCE(v_invoice.total_amount, 0)
          * public.jsonb_number_v1(v_invoice.fee_structure, 'maxPercentage', 100) / 100
      );
    ELSIF v_invoice.rule_type = 'tiered' THEN
      v_tier := NULL;
      FOR v_tier IN
        SELECT tier.value FROM jsonb_array_elements(COALESCE(v_invoice.fee_structure -> 'tiers', '[]'::jsonb)) tier
      LOOP
        v_min_days := COALESCE((v_tier -> 'daysRange' ->> 0)::integer, 0);
        v_max_days := COALESCE((v_tier -> 'daysRange' ->> 1)::integer, 2147483647);
        EXIT WHEN v_fee_days BETWEEN v_min_days AND v_max_days;
        v_tier := NULL;
      END LOOP;
      IF v_tier IS NOT NULL THEN
        IF v_tier ? 'dailyAmount' THEN
          v_fee := public.jsonb_number_v1(v_tier, 'dailyAmount', 0) * v_fee_days;
        ELSE
          v_fee := COALESCE(v_invoice.total_amount, 0)
            * public.jsonb_number_v1(v_tier, 'dailyRate', 0) / 100 * v_fee_days;
        END IF;
        v_fee := LEAST(v_fee, public.jsonb_number_v1(v_tier, 'maxAmount', v_fee));
      END IF;
    END IF;

    v_fee := round(GREATEST(COALESCE(v_fee, 0), 0), 2);
    IF v_fee <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.late_fees (
      company_id, invoice_id, contract_id, late_fee_rule_id, original_amount,
      days_overdue, fee_amount, fee_type, status
    ) VALUES (
      v_invoice.company_id, v_invoice.id, v_invoice.contract_id, v_invoice.rule_id,
      v_invoice.total_amount, CURRENT_DATE - v_invoice.due_date, v_fee,
      v_invoice.rule_type, 'pending'
    );
    UPDATE public.invoices invoice SET status = 'overdue', updated_at = now()
    WHERE invoice.id = v_invoice.id;

    invoice_id := v_invoice.id;
    invoice_number := v_invoice.invoice_number;
    days_overdue := CURRENT_DATE - v_invoice.due_date;
    fee_amount := v_fee;
    status := 'created';
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_vehicle_depreciation_monthly(
  company_id_param uuid,
  depreciation_date_param date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  vehicle_id uuid,
  vehicle_number text,
  monthly_depreciation numeric,
  accumulated_depreciation numeric,
  journal_entry_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle record;
  v_expense_account uuid;
  v_accumulated_account uuid;
  v_existing_entry uuid;
  v_entry_id uuid;
  v_entry_number text;
  v_depreciable_base numeric;
  v_monthly numeric;
  v_new_accumulated numeric;
  v_book_value numeric;
  v_period_start date := date_trunc('month', depreciation_date_param)::date;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  IF depreciation_date_param IS NULL THEN
    RAISE EXCEPTION 'Depreciation date is required' USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(company_id_param, depreciation_date_param) THEN
    RAISE EXCEPTION 'Vehicle depreciation is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(company_id_param::text || ':vehicle-depreciation:' || v_period_start, 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.company_id = company_id_param AND COALESCE(vehicle.is_active, true)
      AND COALESCE(vehicle.purchase_cost, 0) > 0 AND COALESCE(vehicle.depreciation_rate, 0) > 0
  ) THEN
    RETURN;
  END IF;

  SELECT account.id INTO v_expense_account
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = company_id_param AND mapping.is_active
    AND account_type.type_code = 'DEPRECIATION_EXPENSE'
    AND account.company_id = company_id_param AND account.is_active
    AND NOT account.is_header AND account.account_level >= 3
  LIMIT 1;

  SELECT account.id INTO v_accumulated_account
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = company_id_param AND mapping.is_active
    AND account_type.type_code = 'ACCUMULATED_DEPRECIATION'
    AND account.company_id = company_id_param AND account.is_active
    AND NOT account.is_header AND account.account_level >= 3
  LIMIT 1;

  IF v_expense_account IS NULL OR v_accumulated_account IS NULL THEN
    RAISE EXCEPTION 'Map active posting accounts for DEPRECIATION_EXPENSE and ACCUMULATED_DEPRECIATION first'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_vehicle IN
    SELECT vehicle.* FROM public.vehicles vehicle
    WHERE vehicle.company_id = company_id_param AND COALESCE(vehicle.is_active, true)
      AND COALESCE(vehicle.purchase_cost, 0) > 0 AND COALESCE(vehicle.depreciation_rate, 0) > 0
    ORDER BY vehicle.id
    FOR UPDATE
  LOOP
    SELECT entry.id INTO v_existing_entry
    FROM public.journal_entries entry
    WHERE entry.company_id = company_id_param
      AND entry.reference_type = 'vehicle_depreciation'
      AND entry.reference_id = v_vehicle.id
      AND entry.entry_date >= v_period_start
      AND entry.entry_date < (v_period_start + interval '1 month')::date
      AND lower(entry.status) <> 'reversed'
    ORDER BY entry.created_at DESC LIMIT 1;

    IF v_existing_entry IS NOT NULL THEN
      RETURN QUERY SELECT v_vehicle.id, v_vehicle.plate_number::text,
        COALESCE((SELECT entry.total_debit FROM public.journal_entries entry WHERE entry.id = v_existing_entry), 0),
        COALESCE(v_vehicle.accumulated_depreciation, 0), v_existing_entry;
      CONTINUE;
    END IF;

    v_depreciable_base := GREATEST(
      COALESCE(v_vehicle.purchase_cost, 0)
        - GREATEST(COALESCE(v_vehicle.residual_value, v_vehicle.salvage_value, 0), 0),
      0
    );
    v_monthly := round(v_depreciable_base * v_vehicle.depreciation_rate / 100 / 12, 2);
    v_monthly := LEAST(v_monthly, GREATEST(v_depreciable_base - COALESCE(v_vehicle.accumulated_depreciation, 0), 0));
    IF v_monthly <= 0 THEN CONTINUE; END IF;

    v_new_accumulated := round(COALESCE(v_vehicle.accumulated_depreciation, 0) + v_monthly, 2);
    v_book_value := round(COALESCE(v_vehicle.purchase_cost, 0) - v_new_accumulated, 2);
    v_entry_number := 'DEP-' || to_char(v_period_start, 'YYYYMM') || '-' || replace(v_vehicle.id::text, '-', '');

    INSERT INTO public.journal_entries (
      company_id, entry_number, entry_date, reference_type, reference_id, description,
      total_debit, total_credit, status, created_by
    ) VALUES (
      company_id_param, v_entry_number, depreciation_date_param, 'vehicle_depreciation',
      v_vehicle.id, 'Monthly vehicle depreciation - ' || v_vehicle.plate_number,
      v_monthly, v_monthly, 'draft', auth.uid()
    ) RETURNING id INTO v_entry_id;

    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_description, debit_amount, credit_amount, line_number, asset_id
    ) VALUES
      (v_entry_id, v_expense_account, 'Vehicle depreciation expense - ' || v_vehicle.plate_number, v_monthly, 0, 1, v_vehicle.fixed_asset_id),
      (v_entry_id, v_accumulated_account, 'Accumulated vehicle depreciation - ' || v_vehicle.plate_number, 0, v_monthly, 2, v_vehicle.fixed_asset_id);

    UPDATE public.journal_entries entry
    SET status = 'posted', posted_by = auth.uid(), posted_at = now(), updated_at = now()
    WHERE entry.id = v_entry_id;

    UPDATE public.vehicles vehicle
    SET accumulated_depreciation = v_new_accumulated, book_value = v_book_value, updated_at = now()
    WHERE vehicle.id = v_vehicle.id AND vehicle.company_id = company_id_param;

    IF v_vehicle.fixed_asset_id IS NOT NULL THEN
      INSERT INTO public.depreciation_records (
        fixed_asset_id, depreciation_date, depreciation_amount,
        accumulated_depreciation, book_value, journal_entry_id, period_type, notes
      )
      SELECT v_vehicle.fixed_asset_id, depreciation_date_param, v_monthly,
        v_new_accumulated, v_book_value, v_entry_id, 'monthly',
        'Canonical monthly vehicle depreciation'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.depreciation_records record
        WHERE record.fixed_asset_id = v_vehicle.fixed_asset_id
          AND record.depreciation_date >= v_period_start
          AND record.depreciation_date < (v_period_start + interval '1 month')::date
      );
    END IF;

    RETURN QUERY SELECT v_vehicle.id, v_vehicle.plate_number::text,
      v_monthly, v_new_accumulated, v_entry_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_customer_with_contract(
  p_company_id uuid,
  p_first_name text,
  p_last_name text,
  p_monthly_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_contract_id uuid;
  v_customer_code text;
  v_contract_number text;
  v_start_date date := CURRENT_DATE;
  v_end_date date := (CURRENT_DATE + interval '1 year' - interval '1 day')::date;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(p_company_id);
  IF NULLIF(btrim(COALESCE(p_first_name, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(p_last_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Customer first and last names are required' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(p_monthly_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Monthly amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':quick-customer-contract', 0));

  v_customer_code := 'CUST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  v_contract_number := 'CNT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS')
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.customers (
    company_id, customer_code, first_name, last_name, customer_type, phone, is_active
  ) VALUES (
    p_company_id, v_customer_code, btrim(p_first_name), btrim(p_last_name),
    'individual', '000000000', true
  ) RETURNING id INTO v_customer_id;

  INSERT INTO public.contracts (
    customer_id, company_id, contract_number, contract_date, start_date, end_date,
    contract_type, contract_amount, monthly_amount, status
  ) VALUES (
    v_customer_id, p_company_id, v_contract_number, v_start_date, v_start_date, v_end_date,
    'vehicle_rental', round(p_monthly_amount * 12, 2), round(p_monthly_amount, 2), 'active'
  ) RETURNING id INTO v_contract_id;

  RETURN json_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'contract_id', v_contract_id,
    'customer_code', v_customer_code,
    'contract_number', v_contract_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_delete_company_accounts(uuid,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.enhanced_complete_account_deletion(uuid,boolean,boolean,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_enhanced_accounts_deletion_preview(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.copy_selected_accounts_to_company(uuid,text[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.process_overdue_invoices() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.process_vehicle_depreciation_monthly(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_customer_with_contract(uuid,text,text,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.jsonb_number_v1(jsonb,text,numeric) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.bulk_delete_company_accounts(uuid,boolean,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.enhanced_complete_account_deletion(uuid,boolean,boolean,boolean,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_enhanced_accounts_deletion_preview(uuid,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.copy_selected_accounts_to_company(uuid,text[]) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.process_overdue_invoices() TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.process_vehicle_depreciation_monthly(uuid,date) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_customer_with_contract(uuid,text,text,numeric) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.jsonb_number_v1(jsonb,text,numeric) TO service_role;
