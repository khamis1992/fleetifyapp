-- Create a rental contract and its complete canonical billing graph in one
-- transaction. Revenue/receivables are recognized by invoice journals only;
-- the contract itself must never post a duplicate full-value journal.

BEGIN;

-- A pre-release copy of this migration may have created the 16-argument
-- overload. Remove it so PostgREST can never resolve a creation call that
-- bypasses the mandatory replay key.
DROP FUNCTION IF EXISTS public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text, uuid, uuid, uuid, date, boolean, text
);

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS creation_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_company_creation_idempotency
  ON public.contracts(company_id, creation_idempotency_key)
  WHERE creation_idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF to_regprocedure('public.generate_invoices_from_payment_schedule(uuid)') IS NULL THEN
    RAISE EXCEPTION 'generate_invoices_from_payment_schedule(uuid) is required';
  END IF;
  IF to_regprocedure('public.system_invoice_has_single_balanced_posted_journal(uuid,uuid,numeric)') IS NULL THEN
    RAISE EXCEPTION 'system_invoice_has_single_balanced_posted_journal(uuid,uuid,numeric) is required';
  END IF;
END;
$$;

-- The legacy trigger used a day/30 approximation and overwrote every explicit
-- contract amount on INSERT. That conflicts with the canonical billing-month
-- graph and can silently change a signed price. Preserve every explicit
-- positive amount; only derive a fallback when no amount was supplied.
CREATE OR REPLACE FUNCTION public.trigger_calculate_contract_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start_month date;
  v_end_month date;
  v_billing_months integer;
BEGIN
  IF COALESCE(NEW.contract_amount, 0) <= 0
     AND COALESCE(NEW.monthly_amount, 0) > 0
     AND NEW.start_date IS NOT NULL
     AND NEW.end_date IS NOT NULL
     AND NEW.end_date >= NEW.start_date
     AND (
       TG_OP = 'INSERT'
       OR NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount
       OR NEW.start_date IS DISTINCT FROM OLD.start_date
       OR NEW.end_date IS DISTINCT FROM OLD.end_date
     )
  THEN
    v_start_month := date_trunc(
      'month',
      NEW.start_date::timestamp without time zone
    )::date;
    v_end_month := date_trunc(
      'month',
      NEW.end_date::timestamp without time zone
    )::date;
    v_billing_months := GREATEST(
      1,
      (
        (EXTRACT(YEAR FROM v_end_month) - EXTRACT(YEAR FROM v_start_month)) * 12
        + EXTRACT(MONTH FROM v_end_month)
        - EXTRACT(MONTH FROM v_start_month)
      )::integer
    );
    NEW.contract_amount := round(NEW.monthly_amount::numeric * v_billing_months, 3);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_calculate_contract_amount() IS
  'Preserves an explicit positive contract amount and derives only a missing amount using the canonical contract billing-month convention.';

-- Fail closed: an active contract is not allowed to enter the system unless
-- the same transaction is also responsible for its complete billing graph.
CREATE OR REPLACE FUNCTION public.require_atomic_contract_billing_graph()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_new_is_billable boolean := lower(COALESCE(NEW.status::text, '')) IN (
    'active', 'under_legal_procedure'
  );
  v_old_was_billable boolean := TG_OP = 'UPDATE' AND lower(
    COALESCE(OLD.status::text, '')
  ) IN ('active', 'under_legal_procedure');
  v_financial_terms_changed boolean := TG_OP = 'UPDATE' AND (
    NEW.contract_amount IS DISTINCT FROM OLD.contract_amount
    OR NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount
    OR NEW.start_date IS DISTINCT FROM OLD.start_date
    OR NEW.end_date IS DISTINCT FROM OLD.end_date
    OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
    OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
    OR NEW.cost_center_id IS DISTINCT FROM OLD.cost_center_id
  );
BEGIN
  IF v_new_is_billable
     AND NOT v_old_was_billable
     AND COALESCE(
       current_setting('fleetify.atomic_contract_creation', true),
       ''
     ) <> 'on'
  THEN
    RAISE EXCEPTION
      'Active contracts must be created or activated through the atomic billing command'
      USING ERRCODE = '23514';
  END IF;
  IF (v_new_is_billable OR v_old_was_billable)
     AND v_financial_terms_changed
     AND COALESCE(
       current_setting('fleetify.atomic_contract_creation', true),
       ''
     ) <> 'on'
  THEN
    RAISE EXCEPTION
      'Billable contract financial terms require an audited atomic amendment command'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_atomic_contract_billing_graph
  ON public.contracts;
CREATE TRIGGER trg_require_atomic_contract_billing_graph
BEFORE INSERT OR UPDATE OF
  status,
  contract_amount,
  monthly_amount,
  start_date,
  end_date,
  customer_id,
  vehicle_id,
  cost_center_id
ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.require_atomic_contract_billing_graph();

CREATE OR REPLACE FUNCTION public.create_contract_with_billing_graph_atomic(
  p_company_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid DEFAULT NULL,
  p_contract_type text DEFAULT 'rental',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_contract_amount numeric DEFAULT 0,
  p_monthly_amount numeric DEFAULT 0,
  p_description text DEFAULT NULL,
  p_terms text DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_assigned_to_profile_id uuid DEFAULT NULL,
  p_contract_date date DEFAULT CURRENT_DATE,
  p_auto_renew_enabled boolean DEFAULT false,
  p_created_via text DEFAULT 'atomic_billing_graph',
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_allowed boolean := false;
  v_employee_workspace_allowed boolean := false;
  v_contract_id uuid;
  v_contract_number text;
  v_invoice_count integer;
  v_active_invoice_count integer;
  v_active_schedule_count integer;
  v_billed_total numeric;
  v_stored_contract_amount numeric;
  v_stored_monthly_amount numeric;
  v_available_billing_months integer;
  v_required_installments integer;
  v_vehicle public.vehicles%ROWTYPE;
  v_existing_contract public.contracts%ROWTYPE;
  v_idempotency_key text := NULLIF(BTRIM(COALESCE(p_idempotency_key, '')), '');
BEGIN
  IF p_company_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Company and customer are required' USING ERRCODE = 'P0001';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Contract requires a valid start and end date' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(p_contract_amount, 0) <= 0 OR COALESCE(p_monthly_amount, 0) < 0 THEN
    RAISE EXCEPTION 'Contract amount must be positive and monthly amount cannot be negative'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_contract_date IS NULL OR p_contract_date > p_end_date THEN
    RAISE EXCEPTION 'Contract date is required and cannot be after contract end date'
      USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_contract_type, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Contract type is required' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(p_created_via, '') NOT IN (
    'atomic_billing_graph', 'web', 'mobile', 'sales_quote',
    'employee_workspace', 'quick_customer', 'renewal'
  ) THEN
    RAISE EXCEPTION 'Unsupported contract creation source' USING ERRCODE = '22023';
  END IF;
  IF v_idempotency_key IS NULL
     OR v_idempotency_key !~ '^[A-Za-z0-9:_-]{16,200}$'
  THEN
    RAISE EXCEPTION 'A valid contract idempotency key is required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT v_trusted_direct_session AND v_actor_role <> 'service_role' THEN
    IF v_actor_role <> 'authenticated' OR v_actor IS NULL THEN
      RAISE EXCEPTION 'Authentication is required to create contracts' USING ERRCODE = '42501';
    END IF;
    IF p_created_by IS NOT NULL AND p_created_by IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
    END IF;
    IF public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'Contract company is outside the active tenant' USING ERRCODE = '42501';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['contracts.create', 'operations.contracts.write', 'create_contract'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
    );
    IF NOT COALESCE(v_allowed, false) THEN
      -- Employee Workspace may create only a contract assigned to the same
      -- active employee profile. This does not permit assigning another user.
      v_employee_workspace_allowed := p_assigned_to_profile_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles profile
          WHERE profile.id = p_assigned_to_profile_id
            AND profile.user_id = v_actor
            AND profile.company_id = p_company_id
            AND COALESCE(profile.is_active, false) = true
        );
      IF NOT v_employee_workspace_allowed THEN
        RAISE EXCEPTION 'Not authorized to create contracts' USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF v_actor_role = 'service_role' OR v_trusted_direct_session THEN
    v_actor := COALESCE(p_created_by, v_actor);
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'contract-create:' || p_company_id::text || ':' || v_idempotency_key,
      0
    )
  );
  SELECT contract.*
  INTO v_existing_contract
  FROM public.contracts contract
  WHERE contract.company_id = p_company_id
    AND contract.creation_idempotency_key = v_idempotency_key
  FOR UPDATE OF contract;

  IF FOUND THEN
    IF v_existing_contract.customer_id IS DISTINCT FROM p_customer_id
       OR v_existing_contract.vehicle_id IS DISTINCT FROM p_vehicle_id
       OR v_existing_contract.contract_type IS DISTINCT FROM p_contract_type
       OR v_existing_contract.contract_date IS DISTINCT FROM p_contract_date
       OR v_existing_contract.start_date IS DISTINCT FROM p_start_date
       OR v_existing_contract.end_date IS DISTINCT FROM p_end_date
       OR round(COALESCE(v_existing_contract.contract_amount, 0)::numeric, 2) IS DISTINCT FROM
          round(p_contract_amount::numeric, 2)
       OR round(COALESCE(v_existing_contract.monthly_amount, 0)::numeric, 2) IS DISTINCT FROM
          round(COALESCE(p_monthly_amount, 0)::numeric, 2)
       OR NULLIF(BTRIM(COALESCE(v_existing_contract.description, '')), '') IS DISTINCT FROM
          NULLIF(BTRIM(COALESCE(p_description, '')), '')
       OR NULLIF(BTRIM(COALESCE(v_existing_contract.terms, '')), '') IS DISTINCT FROM
          NULLIF(BTRIM(COALESCE(p_terms, '')), '')
       OR v_existing_contract.cost_center_id IS DISTINCT FROM p_cost_center_id
       OR v_existing_contract.assigned_to_profile_id IS DISTINCT FROM p_assigned_to_profile_id
       OR COALESCE(v_existing_contract.auto_renew_enabled, false) IS DISTINCT FROM
          COALESCE(p_auto_renew_enabled, false)
       OR v_existing_contract.created_via IS DISTINCT FROM p_created_via
    THEN
      RAISE EXCEPTION 'Idempotency key is already bound to a different contract request'
        USING ERRCODE = '23505';
    END IF;

    SELECT count(*)::integer
    INTO v_active_schedule_count
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = p_company_id
      AND schedule.contract_id = v_existing_contract.id
      AND COALESCE(schedule.amount, 0) > 0.01
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );

    SELECT count(*)::integer
    INTO v_active_invoice_count
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = v_existing_contract.id
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );

    RETURN jsonb_build_object(
      'success', true,
      'contract_id', v_existing_contract.id,
      'contract_number', v_existing_contract.contract_number,
      'billing_graph_created', v_active_schedule_count > 0
        AND v_active_invoice_count = v_active_schedule_count,
      'schedules_created', v_active_schedule_count,
      'invoices_created', v_active_invoice_count,
      'contract_journal_created', false,
      'idempotent_replay', true
    );
  END IF;

  v_available_billing_months := GREATEST(
    1,
    (
      (EXTRACT(YEAR FROM p_end_date) - EXTRACT(YEAR FROM p_start_date)) * 12
      + EXTRACT(MONTH FROM p_end_date)
      - EXTRACT(MONTH FROM p_start_date)
    )::integer
  );
  v_required_installments := CASE
    WHEN round(p_monthly_amount::numeric, 2) > 0 THEN GREATEST(
      1,
      CEIL(
        GREATEST(round(p_contract_amount::numeric, 2) - 0.01, 0)
        / round(p_monthly_amount::numeric, 2)
      )::integer
    )
    ELSE v_available_billing_months
  END;
  IF v_required_installments > v_available_billing_months THEN
    RAISE EXCEPTION
      'Contract amount requires % installments, but only % canonical billing months fit between % and %',
      v_required_installments,
      v_available_billing_months,
      p_start_date,
      p_end_date
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1
  FROM public.customers customer
  WHERE customer.id = p_customer_id
    AND customer.company_id = p_company_id
    AND COALESCE(customer.is_active, true) = true
  FOR SHARE OF customer;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer is missing, inactive, or belongs to another company'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_vehicle_id IS NOT NULL THEN
    SELECT vehicle.*
    INTO v_vehicle
    FROM public.vehicles vehicle
    WHERE vehicle.id = p_vehicle_id
      AND vehicle.company_id = p_company_id
      AND COALESCE(vehicle.is_active, true) = true
      AND lower(COALESCE(vehicle.status::text, '')) = 'available'
    FOR UPDATE OF vehicle;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vehicle is unavailable, inactive, or belongs to another company'
        USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.contracts contract
      WHERE contract.company_id = p_company_id
        AND contract.vehicle_id = p_vehicle_id
        AND lower(COALESCE(contract.status, '')) IN (
          'active', 'under_legal_procedure', 'pending', 'draft'
        )
        AND contract.start_date <= p_end_date
        AND contract.end_date >= p_start_date
    ) THEN
      RAISE EXCEPTION 'Vehicle already has an overlapping active contract'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_assigned_to_profile_id IS NOT NULL THEN
    PERFORM 1
    FROM public.profiles profile
    WHERE profile.id = p_assigned_to_profile_id
      AND profile.company_id = p_company_id
      AND COALESCE(profile.is_active, false) = true
    FOR SHARE OF profile;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Assigned employee profile is inactive or belongs to another company'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_cost_center_id IS NOT NULL THEN
    PERFORM 1
    FROM public.cost_centers center
    WHERE center.id = p_cost_center_id
      AND center.company_id = p_company_id
      AND COALESCE(center.is_active, false) = true
    FOR SHARE OF center;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cost center is inactive or belongs to another company'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'contract-number:' || p_company_id::text || ':' || to_char(CURRENT_DATE, 'YYYY'),
      0
    )
  );
  v_contract_number := public.generate_contract_number(p_company_id);

  PERFORM pg_catalog.set_config(
    'fleetify.atomic_contract_creation',
    'on',
    true
  );

  INSERT INTO public.contracts (
    company_id,
    customer_id,
    vehicle_id,
    contract_number,
    contract_type,
    contract_date,
    start_date,
    end_date,
    contract_amount,
    monthly_amount,
    description,
    terms,
    status,
    payment_status,
    total_paid,
    balance_due,
    journal_entry_id,
    cost_center_id,
    created_by,
    assigned_to_profile_id,
    auto_renew_enabled,
    license_plate,
    make,
    model,
    year,
    vehicle_status,
    creation_idempotency_key,
    created_via
  ) VALUES (
    p_company_id,
    p_customer_id,
    p_vehicle_id,
    v_contract_number,
    p_contract_type,
    p_contract_date,
    p_start_date,
    p_end_date,
    round(p_contract_amount::numeric, 2),
    round(p_monthly_amount::numeric, 2),
    NULLIF(BTRIM(COALESCE(p_description, '')), ''),
    NULLIF(BTRIM(COALESCE(p_terms, '')), ''),
    'active',
    'unpaid',
    0,
    round(p_contract_amount::numeric, 2),
    NULL,
    p_cost_center_id,
    v_actor,
    p_assigned_to_profile_id,
    COALESCE(p_auto_renew_enabled, false),
    CASE WHEN p_vehicle_id IS NULL THEN NULL ELSE v_vehicle.plate_number END,
    CASE WHEN p_vehicle_id IS NULL THEN NULL ELSE v_vehicle.make END,
    CASE WHEN p_vehicle_id IS NULL THEN NULL ELSE v_vehicle.model END,
    CASE WHEN p_vehicle_id IS NULL THEN NULL ELSE v_vehicle.year END,
    CASE WHEN p_vehicle_id IS NULL THEN NULL ELSE 'rented' END,
    v_idempotency_key,
    p_created_via
  )
  RETURNING id, contract_amount, monthly_amount
  INTO v_contract_id, v_stored_contract_amount, v_stored_monthly_amount;

  IF round(v_stored_contract_amount::numeric, 2) IS DISTINCT FROM
       round(p_contract_amount::numeric, 2)
     OR round(v_stored_monthly_amount::numeric, 2) IS DISTINCT FROM
       round(p_monthly_amount::numeric, 2)
  THEN
    RAISE EXCEPTION 'A contract trigger unexpectedly changed the explicit financial terms'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles vehicle
    SET status = 'rented',
        updated_at = now()
    WHERE vehicle.id = p_vehicle_id
      AND vehicle.company_id = p_company_id;
  END IF;

  -- This command bootstraps schedules and routes every invoice month through
  -- the canonical invoice command inside this same database transaction.
  v_invoice_count := public.generate_invoices_from_payment_schedule(v_contract_id);

  SELECT count(*)::integer
  INTO v_active_schedule_count
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = p_company_id
    AND schedule.contract_id = v_contract_id
    AND COALESCE(schedule.amount, 0) > 0.01
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  SELECT count(*)::integer, COALESCE(sum(invoice.total_amount), 0)
  INTO v_active_invoice_count, v_billed_total
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = v_contract_id
    AND COALESCE(invoice.total_amount, 0) > 0.01
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF v_active_schedule_count <= 0
     OR v_active_invoice_count <> v_active_schedule_count
     OR abs(COALESCE(v_billed_total, 0) - v_stored_contract_amount) > 0.01
  THEN
    RAISE EXCEPTION
      'Contract billing graph postcondition failed (schedules %, invoices %, billed %, contract %)',
      v_active_schedule_count,
      v_active_invoice_count,
      v_billed_total,
      v_stored_contract_amount
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = v_contract_id
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND NOT public.system_invoice_has_single_balanced_posted_journal(
        p_company_id,
        invoice.id,
        invoice.total_amount
      )
  ) THEN
    RAISE EXCEPTION 'Every generated invoice must have exactly one balanced posted journal'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number,
    'billing_graph_created', true,
    'schedules_created', v_active_schedule_count,
    'invoices_created', v_active_invoice_count,
    'contract_journal_created', false,
    'idempotent_replay', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_contract_with_billing_graph_atomic(
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_allowed boolean := false;
  v_employee_workspace_allowed boolean := false;
  v_active_invoice_count integer;
  v_active_schedule_count integer;
  v_billed_total numeric;
  v_was_active boolean := false;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0001';
  END IF;

  v_was_active := lower(COALESCE(v_contract.status::text, '')) = 'active';
  IF lower(COALESCE(v_contract.status::text, '')) = 'under_legal_procedure' THEN
    RAISE EXCEPTION 'A legal contract must leave the legal workflow before activation'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_contract.status::text, '')) NOT IN (
    'draft', 'pending', 'pending_completion', 'suspended', 'active'
  ) THEN
    RAISE EXCEPTION 'Contract lifecycle does not permit atomic activation'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_contract.customer_id IS NULL
     OR v_contract.start_date IS NULL
     OR v_contract.end_date IS NULL
     OR v_contract.end_date < v_contract.start_date
     OR v_contract.contract_date IS NULL
     OR v_contract.contract_date > v_contract.end_date
     OR COALESCE(v_contract.contract_amount, 0) <= 0
     OR COALESCE(v_contract.monthly_amount, 0) < 0
  THEN
    RAISE EXCEPTION 'Contract financial and date terms are incomplete'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session AND v_actor_role <> 'service_role' THEN
    IF v_actor_role <> 'authenticated' OR v_actor IS NULL THEN
      RAISE EXCEPTION 'Authentication is required to activate contracts'
        USING ERRCODE = '42501';
    END IF;
    IF public.get_user_company_id() IS DISTINCT FROM v_contract.company_id THEN
      RAISE EXCEPTION 'Contract company is outside the active tenant'
        USING ERRCODE = '42501';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_contract.company_id,
      ARRAY['contracts.create', 'operations.contracts.write', 'create_contract'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
    );
    IF NOT COALESCE(v_allowed, false) THEN
      v_employee_workspace_allowed := v_contract.assigned_to_profile_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles profile
          WHERE profile.id = v_contract.assigned_to_profile_id
            AND profile.user_id = v_actor
            AND profile.company_id = v_contract.company_id
            AND COALESCE(profile.is_active, false) = true
        );
      IF NOT v_employee_workspace_allowed THEN
        RAISE EXCEPTION 'Not authorized to activate contracts'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  PERFORM 1
  FROM public.customers customer
  WHERE customer.id = v_contract.customer_id
    AND customer.company_id = v_contract.company_id
    AND COALESCE(customer.is_active, true) = true
  FOR SHARE OF customer;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer is missing, inactive, or belongs to another company'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_contract.vehicle_id IS NOT NULL THEN
    PERFORM 1
    FROM public.vehicles vehicle
    WHERE vehicle.id = v_contract.vehicle_id
      AND vehicle.company_id = v_contract.company_id
      AND COALESCE(vehicle.is_active, true) = true
      AND lower(COALESCE(vehicle.status::text, '')) IN (
        'available', 'reserved', 'reserved_employee', 'rented'
      )
    FOR UPDATE OF vehicle;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vehicle is unavailable, inactive, or belongs to another company'
        USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.contracts other_contract
      WHERE other_contract.company_id = v_contract.company_id
        AND other_contract.vehicle_id = v_contract.vehicle_id
        AND other_contract.id <> v_contract.id
        AND lower(COALESCE(other_contract.status::text, '')) IN (
          'active', 'under_legal_procedure'
        )
        AND other_contract.start_date <= v_contract.end_date
        AND other_contract.end_date >= v_contract.start_date
    ) THEN
      RAISE EXCEPTION 'Vehicle already has an overlapping active contract'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_contract.assigned_to_profile_id IS NOT NULL THEN
    PERFORM 1
    FROM public.profiles profile
    WHERE profile.id = v_contract.assigned_to_profile_id
      AND profile.company_id = v_contract.company_id
      AND COALESCE(profile.is_active, false) = true
    FOR SHARE OF profile;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Assigned employee profile is inactive or belongs to another company'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_contract.cost_center_id IS NOT NULL THEN
    PERFORM 1
    FROM public.cost_centers center
    WHERE center.id = v_contract.cost_center_id
      AND center.company_id = v_contract.company_id
      AND COALESCE(center.is_active, false) = true
    FOR SHARE OF center;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cost center is inactive or belongs to another company'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM pg_catalog.set_config(
    'fleetify.atomic_contract_creation',
    'on',
    true
  );
  UPDATE public.contracts contract
  SET status = 'active',
      payment_status = CASE
        WHEN lower(COALESCE(contract.payment_status, '')) IN ('', 'pending') THEN 'unpaid'
        ELSE contract.payment_status
      END,
      updated_at = now()
  WHERE contract.id = v_contract.id
    AND contract.company_id = v_contract.company_id;

  IF v_contract.vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles vehicle
    SET status = 'rented', updated_at = now()
    WHERE vehicle.id = v_contract.vehicle_id
      AND vehicle.company_id = v_contract.company_id;
  END IF;

  PERFORM public.generate_invoices_from_payment_schedule(v_contract.id);

  SELECT count(*)::integer
  INTO v_active_schedule_count
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND COALESCE(schedule.amount, 0) > 0.01
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  SELECT count(*)::integer, COALESCE(sum(invoice.total_amount), 0)
  INTO v_active_invoice_count, v_billed_total
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND COALESCE(invoice.total_amount, 0) > 0.01
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF v_active_schedule_count <= 0
     OR v_active_invoice_count <> v_active_schedule_count
     OR abs(v_billed_total - round(v_contract.contract_amount::numeric, 2)) > 0.01
  THEN
    RAISE EXCEPTION 'Activated contract billing graph postcondition failed'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND NOT public.system_invoice_has_single_balanced_posted_journal(
        v_contract.company_id,
        invoice.id,
        invoice.total_amount
      )
  ) THEN
    RAISE EXCEPTION 'Every activated-contract invoice must have one balanced posted journal'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract.id,
    'billing_graph_created', true,
    'schedules_created', v_active_schedule_count,
    'invoices_created', v_active_invoice_count,
    'idempotent_replay', v_was_active
  );
END;
$$;

-- Preserve the old quick-customer RPC surface while making the customer and
-- complete billing graph one transaction. Any billing failure rolls back the
-- newly inserted customer as well.
CREATE OR REPLACE FUNCTION public.create_customer_with_contract_idempotent(
  p_company_id uuid,
  p_first_name text,
  p_last_name text,
  p_monthly_amount numeric,
  p_idempotency_key text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_customer_code text;
  v_start_date date := CURRENT_DATE;
  v_end_date date := (CURRENT_DATE + interval '1 year')::date;
  v_contract_result jsonb;
  v_existing_contract public.contracts%ROWTYPE;
  v_existing_customer public.customers%ROWTYPE;
  v_idempotency_key text := NULLIF(BTRIM(COALESCE(p_idempotency_key, '')), '');
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(p_company_id);
  IF v_idempotency_key IS NULL
     OR v_idempotency_key !~ '^[A-Za-z0-9:_-]{16,200}$'
  THEN
    RAISE EXCEPTION 'A valid customer-contract idempotency key is required'
      USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_first_name, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(p_last_name, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Customer first and last names are required' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(p_monthly_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Monthly amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'quick-customer-contract:' || p_company_id::text || ':' || v_idempotency_key,
      0
    )
  );
  SELECT contract.*
  INTO v_existing_contract
  FROM public.contracts contract
  WHERE contract.company_id = p_company_id
    AND contract.creation_idempotency_key = v_idempotency_key
  FOR UPDATE OF contract;
  IF FOUND THEN
    -- The idempotency key binds the original dates. A retry after midnight must
    -- replay that request instead of deriving a new CURRENT_DATE and rejecting it.
    v_start_date := v_existing_contract.start_date;
    v_end_date := v_existing_contract.end_date;

    SELECT customer.*
    INTO v_existing_customer
    FROM public.customers customer
    WHERE customer.id = v_existing_contract.customer_id
      AND customer.company_id = p_company_id;
    IF round(COALESCE(v_existing_contract.monthly_amount, 0)::numeric, 2) IS DISTINCT FROM
         round(p_monthly_amount::numeric, 2)
       OR btrim(COALESCE(v_existing_customer.first_name, '')) IS DISTINCT FROM btrim(p_first_name)
       OR btrim(COALESCE(v_existing_customer.last_name, '')) IS DISTINCT FROM btrim(p_last_name)
    THEN
      RAISE EXCEPTION 'Idempotency key is already bound to a different customer-contract request'
        USING ERRCODE = '23505';
    END IF;

    v_contract_result := public.create_contract_with_billing_graph_atomic(
      p_company_id => p_company_id,
      p_customer_id => v_existing_contract.customer_id,
      p_contract_type => 'vehicle_rental',
      p_start_date => v_start_date,
      p_end_date => v_end_date,
      p_contract_amount => round(p_monthly_amount * 12, 2),
      p_monthly_amount => round(p_monthly_amount, 2),
      p_created_by => auth.uid(),
      p_contract_date => v_start_date,
      p_created_via => 'quick_customer',
      p_idempotency_key => v_idempotency_key
    );
    RETURN jsonb_build_object(
      'success', true,
      'customer_id', v_existing_contract.customer_id,
      'contract_id', v_existing_contract.id,
      'contract_number', v_existing_contract.contract_number,
      'billing_graph_created', v_contract_result -> 'billing_graph_created',
      'invoices_created', v_contract_result -> 'invoices_created',
      'idempotent_replay', true
    )::json;
  END IF;

  v_customer_code := 'CUST-' || upper(
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
  );
  INSERT INTO public.customers (
    company_id, customer_code, first_name, last_name, customer_type, phone, is_active
  ) VALUES (
    p_company_id, v_customer_code, btrim(p_first_name), btrim(p_last_name),
    'individual', '000000000', true
  ) RETURNING id INTO v_customer_id;

  v_contract_result := public.create_contract_with_billing_graph_atomic(
    p_company_id => p_company_id,
    p_customer_id => v_customer_id,
    p_contract_type => 'vehicle_rental',
    p_start_date => v_start_date,
    p_end_date => v_end_date,
    p_contract_amount => round(p_monthly_amount * 12, 2),
    p_monthly_amount => round(p_monthly_amount, 2),
    p_created_by => auth.uid(),
    p_contract_date => v_start_date,
    p_created_via => 'quick_customer',
    p_idempotency_key => v_idempotency_key
  );

  IF COALESCE((v_contract_result ->> 'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Atomic customer contract creation failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'contract_id', v_contract_result ->> 'contract_id',
    'customer_code', v_customer_code,
    'contract_number', v_contract_result ->> 'contract_number',
    'billing_graph_created', true,
    'invoices_created', v_contract_result -> 'invoices_created',
    'idempotent_replay', false
  )::json;
END;
$$;

-- Fail closed for old clients: creating a customer and a complete financial
-- graph without a replay key is unsafe after a network retry.
CREATE OR REPLACE FUNCTION public.create_customer_with_contract(
  p_company_id uuid,
  p_first_name text,
  p_last_name text,
  p_monthly_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Idempotency key is required; use create_customer_with_contract_idempotent'
    USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_contract_with_billing_graph_atomic(
  p_contract_id uuid,
  p_new_end_date date,
  p_new_amount numeric DEFAULT NULL,
  p_renewal_terms text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_original public.contracts%ROWTYPE;
  v_new_start_date date;
  v_contract_amount numeric;
  v_result jsonb;
  v_successor public.contracts%ROWTYPE;
  v_renewal_key text;
BEGIN
  SELECT contract.*
  INTO v_original
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original contract not found' USING ERRCODE = 'P0001';
  END IF;
  v_new_start_date := v_original.end_date + 1;
  IF p_new_end_date IS NULL OR p_new_end_date < v_new_start_date THEN
    RAISE EXCEPTION 'Renewal end date must be on or after the renewal start date'
      USING ERRCODE = 'P0001';
  END IF;
  v_contract_amount := round(
    COALESCE(p_new_amount, v_original.contract_amount)::numeric,
    2
  );
  IF v_contract_amount <= 0 THEN
    RAISE EXCEPTION 'Renewal amount must be positive' USING ERRCODE = 'P0001';
  END IF;
  v_renewal_key := 'renewal:' || v_original.id::text || ':' || p_new_end_date::text;

  -- A network retry arrives after the original contract has already moved to
  -- renewed. Resolve the deterministic successor and route through the main
  -- replay command so authorization and graph postconditions are rechecked.
  IF lower(COALESCE(v_original.status::text, '')) = 'renewed' THEN
    SELECT contract.*
    INTO v_successor
    FROM public.contracts contract
    WHERE contract.company_id = v_original.company_id
      AND contract.creation_idempotency_key = v_renewal_key
    FOR UPDATE OF contract;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Contract was already renewed with a different request'
        USING ERRCODE = '23505';
    END IF;
    IF v_successor.start_date IS DISTINCT FROM v_new_start_date
       OR v_successor.end_date IS DISTINCT FROM p_new_end_date
       OR round(COALESCE(v_successor.contract_amount, 0)::numeric, 2) IS DISTINCT FROM
          round(v_contract_amount::numeric, 2)
    THEN
      RAISE EXCEPTION 'Renewal replay conflicts with the existing successor'
        USING ERRCODE = '23505';
    END IF;

    v_result := public.create_contract_with_billing_graph_atomic(
      p_company_id => v_successor.company_id,
      p_customer_id => v_successor.customer_id,
      p_vehicle_id => v_successor.vehicle_id,
      p_contract_type => v_successor.contract_type,
      p_start_date => v_successor.start_date,
      p_end_date => v_successor.end_date,
      p_contract_amount => v_successor.contract_amount,
      p_monthly_amount => COALESCE(v_successor.monthly_amount, 0),
      p_description => v_successor.description,
      p_terms => v_successor.terms,
      p_cost_center_id => v_successor.cost_center_id,
      p_created_by => auth.uid(),
      p_assigned_to_profile_id => v_successor.assigned_to_profile_id,
      p_contract_date => v_successor.contract_date,
      p_auto_renew_enabled => COALESCE(v_successor.auto_renew_enabled, false),
      p_created_via => 'renewal',
      p_idempotency_key => v_renewal_key
    );
    RETURN v_result || jsonb_build_object(
      'original_contract_id', v_original.id,
      'renewed', true
    );
  END IF;

  IF lower(COALESCE(v_original.status::text, '')) <> 'active' THEN
    RAISE EXCEPTION 'Only an active or idempotently renewed contract can be renewed'
      USING ERRCODE = 'P0001';
  END IF;

  -- The nested create command performs tenant, permission, related-row and
  -- billing postcondition checks. These lifecycle writes are rolled back if
  -- any nested step fails.
  UPDATE public.contracts contract
  SET status = 'renewed', updated_at = now()
  WHERE contract.id = v_original.id
    AND contract.company_id = v_original.company_id;
  IF v_original.vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles vehicle
    SET status = 'available', updated_at = now()
    WHERE vehicle.id = v_original.vehicle_id
      AND vehicle.company_id = v_original.company_id;
  END IF;

  v_result := public.create_contract_with_billing_graph_atomic(
    p_company_id => v_original.company_id,
    p_customer_id => v_original.customer_id,
    p_vehicle_id => v_original.vehicle_id,
    p_contract_type => v_original.contract_type,
    p_start_date => v_new_start_date,
    p_end_date => p_new_end_date,
    p_contract_amount => v_contract_amount,
    p_monthly_amount => COALESCE(v_original.monthly_amount, 0),
    p_description => 'Renewal of ' || COALESCE(v_original.contract_number, v_original.id::text),
    p_terms => COALESCE(p_renewal_terms, v_original.terms),
    p_cost_center_id => v_original.cost_center_id,
    p_created_by => auth.uid(),
    p_assigned_to_profile_id => v_original.assigned_to_profile_id,
    p_contract_date => CURRENT_DATE,
    p_auto_renew_enabled => COALESCE(v_original.auto_renew_enabled, false),
    p_created_via => 'renewal',
    p_idempotency_key => v_renewal_key
  );

  RETURN v_result || jsonb_build_object(
    'original_contract_id', v_original.id,
    'renewed', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text, uuid, uuid, uuid, date, boolean, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text, uuid, uuid, uuid, date, boolean, text, text
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.activate_contract_with_billing_graph_atomic(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_contract_with_billing_graph_atomic(uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_customer_with_contract(uuid, text, text, numeric)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_customer_with_contract(uuid, text, text, numeric)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_customer_with_contract_idempotent(
  uuid, text, text, numeric, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_customer_with_contract_idempotent(
  uuid, text, text, numeric, text
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.renew_contract_with_billing_graph_atomic(
  uuid, date, numeric, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.renew_contract_with_billing_graph_atomic(
  uuid, date, numeric, text
) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text, uuid, uuid, uuid, date, boolean, text, text
) IS
  'Idempotently and atomically creates an active contract, schedules, positive invoices and their balanced posted journals; the contract itself posts no duplicate revenue journal.';

COMMENT ON FUNCTION public.activate_contract_with_billing_graph_atomic(uuid) IS
  'Atomically activates a draft or suspended contract and requires a complete positive invoice/schedule/journal graph before commit.';

COMMENT ON FUNCTION public.renew_contract_with_billing_graph_atomic(uuid, date, numeric, text) IS
  'Atomically closes an active contract as renewed and creates its successor with a complete billing graph.';

COMMIT;
