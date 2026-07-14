-- Replace three conflicting maintenance-accounting triggers with one atomic guard.

DROP TRIGGER IF EXISTS maintenance_journal_trigger ON public.vehicle_maintenance;
DROP TRIGGER IF EXISTS trigger_maintenance_accounting ON public.vehicle_maintenance;
DROP TRIGGER IF EXISTS trigger_maintenance_expense ON public.vehicle_maintenance;

CREATE OR REPLACE FUNCTION public.apply_vehicle_maintenance_accounting_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_entry_date date;
  v_actor_id uuid;
  v_existing_journal public.journal_entries%ROWTYPE;
  v_expense_account_id uuid;
  v_credit_account_id uuid;
  v_credit_type text;
  v_journal_id uuid := gen_random_uuid();
  v_entry_number text;
  v_description text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.journal_entry_id IS NOT NULL THEN
    IF NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id
       OR COALESCE(NEW.expense_recorded, false) = false
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.actual_cost IS DISTINCT FROM OLD.actual_cost
       OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
       OR NEW.total_cost_with_tax IS DISTINCT FROM OLD.total_cost_with_tax
       OR NEW.expense_account_id IS DISTINCT FROM OLD.expense_account_id
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
    THEN
      RAISE EXCEPTION 'Posted maintenance financial fields are immutable; use an approved reversal workflow'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.journal_entry_id IS NOT NULL OR COALESCE(NEW.expense_recorded, false) THEN
    RAISE EXCEPTION 'Maintenance journal linkage can only be set by the accounting gateway'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  v_amount := CASE
    WHEN COALESCE(NEW.total_cost_with_tax, 0) > 0 THEN NEW.total_cost_with_tax
    ELSE COALESCE(NEW.actual_cost, 0) + COALESCE(NEW.tax_amount, 0)
  END;
  IF v_amount <= 0 THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.id = NEW.vehicle_id AND vehicle.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Maintenance vehicle does not belong to the maintenance company' USING ERRCODE = 'P0001';
  END IF;

  SELECT entry.* INTO v_existing_journal
  FROM public.journal_entries entry
  WHERE entry.company_id = NEW.company_id
    AND entry.reference_type = 'maintenance'
    AND entry.reference_id = NEW.id
    AND lower(COALESCE(entry.status, '')) <> 'reversed'
  ORDER BY entry.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_existing_journal.id IS NOT NULL THEN
    IF lower(COALESCE(v_existing_journal.status, '')) <> 'posted' THEN
      RAISE EXCEPTION 'Maintenance has a non-posted journal that requires review' USING ERRCODE = 'P0001';
    END IF;
    NEW.journal_entry_id := v_existing_journal.id;
    NEW.expense_recorded := true;
    RETURN NEW;
  END IF;

  v_entry_date := COALESCE(NEW.completed_date, CURRENT_DATE);
  IF public.system_agent_date_in_closed_period(NEW.company_id, v_entry_date) THEN
    RAISE EXCEPTION 'Maintenance expense posting is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.expense_account_id IS NOT NULL THEN
    SELECT account.id INTO v_expense_account_id
    FROM public.chart_of_accounts account
    WHERE account.id = NEW.expense_account_id
      AND account.company_id = NEW.company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses')
      AND lower(COALESCE(account.balance_type, '')) = 'debit';
  END IF;

  IF v_expense_account_id IS NULL THEN
    SELECT account.id INTO v_expense_account_id
    FROM public.maintenance_account_mappings mapping
    JOIN public.chart_of_accounts account ON account.id = mapping.expense_account_id
    WHERE mapping.company_id = NEW.company_id
      AND mapping.maintenance_type = NEW.maintenance_type
      AND mapping.is_active = true
      AND account.company_id = NEW.company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses')
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
    ORDER BY mapping.id LIMIT 1;
  END IF;

  IF v_expense_account_id IS NULL THEN
    SELECT account.id INTO v_expense_account_id
    FROM public.account_mappings mapping
    JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
    JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = NEW.company_id
      AND mapping.is_active = true
      AND account_type.type_code IN ('MAINTENANCE_EXPENSES', 'MAINTENANCE_EXPENSE')
      AND account.company_id = NEW.company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses')
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
    ORDER BY CASE account_type.type_code WHEN 'MAINTENANCE_EXPENSES' THEN 1 ELSE 2 END, mapping.id
    LIMIT 1;
  END IF;

  v_credit_type := CASE
    WHEN lower(COALESCE(NEW.payment_method, '')) = 'cash' THEN 'CASH'
    WHEN lower(COALESCE(NEW.payment_method, '')) IN ('bank_transfer', 'check', 'credit_card', 'debit_card') THEN 'BANK'
    ELSE 'PAYABLES'
  END;

  SELECT account.id INTO v_credit_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = NEW.company_id
    AND mapping.is_active = true
    AND account_type.type_code = v_credit_type
    AND account.company_id = NEW.company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND (
      (v_credit_type IN ('CASH', 'BANK')
        AND lower(COALESCE(account.account_type, '')) = 'assets'
        AND lower(COALESCE(account.balance_type, '')) = 'debit')
      OR
      (v_credit_type = 'PAYABLES'
        AND lower(COALESCE(account.account_type, '')) = 'liabilities'
        AND lower(COALESCE(account.balance_type, '')) = 'credit')
    )
  ORDER BY mapping.id LIMIT 1;

  IF v_expense_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid maintenance expense account mapping is required' USING ERRCODE = 'P0001';
  END IF;
  IF v_credit_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid % account mapping is required for maintenance posting', v_credit_type USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := COALESCE(auth.uid(), NEW.created_by);
  v_entry_number := 'JE-MNT-' || to_char(v_entry_date, 'YYYYMMDD') || '-' || left(v_journal_id::text, 8);
  v_description := 'مصروف صيانة - ' || NEW.maintenance_number || ' - ' || NEW.maintenance_type;

  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    status, total_debit, total_credit, created_by, posted_by, posted_at
  ) VALUES (
    v_journal_id, NEW.company_id, v_entry_number, v_entry_date, v_description,
    'maintenance', NEW.id, 'posted', v_amount, v_amount,
    v_actor_id, v_actor_id, now()
  );

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, cost_center_id, line_description,
    debit_amount, credit_amount, line_number
  ) VALUES
    (v_journal_id, v_expense_account_id, NEW.cost_center_id, v_description, v_amount, 0, 1),
    (v_journal_id, v_credit_account_id, NEW.cost_center_id, v_description, 0, v_amount, 2);

  NEW.journal_entry_id := v_journal_id;
  NEW.expense_account_id := v_expense_account_id;
  NEW.expense_recorded := true;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_vehicle_maintenance_accounting_v1()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_vehicle_maintenance_accounting_v1()
  TO service_role;

CREATE TRIGGER vehicle_maintenance_accounting_v1
BEFORE INSERT OR UPDATE ON public.vehicle_maintenance
FOR EACH ROW EXECUTE FUNCTION public.apply_vehicle_maintenance_accounting_v1();

REVOKE ALL ON FUNCTION public.create_maintenance_journal_entry(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.create_maintenance_expense_entry(uuid, uuid) FROM anon, authenticated;
