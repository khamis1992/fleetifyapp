-- Canonical invoice allocation ledger.
-- Existing direct payment.invoice_id links remain supported until backfilled.

CREATE TABLE public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  allocation_type text NOT NULL DEFAULT 'invoice'
    CHECK (allocation_type IN ('invoice', 'contract', 'obligation', 'late_fee')),
  target_id uuid NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  allocated_date timestamptz NOT NULL DEFAULT now(),
  allocation_method text NOT NULL DEFAULT 'manual'
    CHECK (allocation_method IN ('auto', 'manual', 'proportional', 'fifo')),
  allocation_order integer NOT NULL DEFAULT 1 CHECK (allocation_order > 0),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (is_active AND voided_at IS NULL)
    OR (NOT is_active AND voided_at IS NOT NULL AND NULLIF(BTRIM(COALESCE(void_reason, '')), '') IS NOT NULL)
  )
);
CREATE INDEX idx_payment_allocations_company
  ON public.payment_allocations(company_id);
CREATE INDEX idx_payment_allocations_payment
  ON public.payment_allocations(payment_id) WHERE is_active;
CREATE INDEX idx_payment_allocations_target
  ON public.payment_allocations(allocation_type, target_id) WHERE is_active;
CREATE UNIQUE INDEX uq_payment_allocations_active_target
  ON public.payment_allocations(payment_id, allocation_type, target_id) WHERE is_active;
CREATE UNIQUE INDEX uq_payment_allocations_active_order
  ON public.payment_allocations(payment_id, allocation_order) WHERE is_active;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_allocations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.payment_allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_allocations TO service_role;
CREATE POLICY payment_allocations_company_select
ON public.payment_allocations
FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = auth.uid() AND role.role::text = 'super_admin'
  )
);
CREATE TABLE public.payment_allocation_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  before_allocations jsonb NOT NULL DEFAULT '[]'::jsonb,
  after_allocations jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'allocation_rpc',
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_allocation_change_log_payment
  ON public.payment_allocation_change_log(payment_id, created_at DESC);
ALTER TABLE public.payment_allocation_change_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_allocation_change_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.payment_allocation_change_log TO authenticated;
GRANT SELECT, INSERT ON TABLE public.payment_allocation_change_log TO service_role;
CREATE POLICY payment_allocation_change_log_company_select
ON public.payment_allocation_change_log
FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = auth.uid() AND role.role::text = 'super_admin'
  )
);
CREATE OR REPLACE FUNCTION public.canonical_invoice_paid_amount(
  p_invoice_id uuid,
  p_exclude_payment_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(source.amount), 0)::numeric
  FROM (
    SELECT allocation.amount
    FROM public.payment_allocations allocation
    JOIN public.payments payment ON payment.id = allocation.payment_id
    WHERE allocation.allocation_type = 'invoice'
      AND allocation.target_id = p_invoice_id
      AND allocation.is_active = true
      AND payment.id IS DISTINCT FROM p_exclude_payment_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'

    UNION ALL

    SELECT payment.amount
    FROM public.payments payment
    WHERE payment.invoice_id = p_invoice_id
      AND payment.id IS DISTINCT FROM p_exclude_payment_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.allocation_type = 'invoice'
          AND allocation.is_active = true
      )
  ) source;
$$;
REVOKE ALL ON FUNCTION public.canonical_invoice_paid_amount(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.canonical_invoice_paid_amount(uuid, uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.recalculate_invoice_financial_state(p_invoice_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_paid numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_invoice_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_paid := public.canonical_invoice_paid_amount(p_invoice_id, NULL);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  UPDATE public.invoices invoice
  SET
    paid_amount = v_paid,
    balance_due = GREATEST(COALESCE(v_invoice.total_amount, 0) - v_paid, 0),
    payment_status = CASE
      WHEN v_paid <= 0.01 THEN 'unpaid'
      WHEN v_paid >= COALESCE(v_invoice.total_amount, 0) - 0.01 THEN 'paid'
      ELSE 'partial'
    END,
    status = CASE
      WHEN lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
        THEN v_invoice.status
      WHEN v_paid >= COALESCE(v_invoice.total_amount, 0) - 0.01 THEN 'paid'
      WHEN v_invoice.due_date IS NOT NULL AND v_invoice.due_date < CURRENT_DATE THEN 'overdue'
      WHEN lower(COALESCE(v_invoice.status, '')) = 'draft' THEN 'draft'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE invoice.id = p_invoice_id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_paid;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.recalculate_invoice_financial_state(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_invoice_financial_state(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.validate_payment_allocation_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_payment_allocated numeric := 0;
  v_invoice_allocated numeric := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
    OR NEW.allocation_type IS DISTINCT FROM OLD.allocation_type
    OR NEW.target_id IS DISTINCT FROM OLD.target_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Allocation ownership and target fields are immutable; void and replace the row'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    NEW.voided_at := COALESCE(NEW.voided_at, now());
    IF NULLIF(BTRIM(COALESCE(NEW.void_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'A void reason is required for payment allocations' USING ERRCODE = 'P0001';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.is_active = false THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  IF NEW.allocation_type <> 'invoice' THEN
    RAISE EXCEPTION 'Only invoice allocations are currently supported' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = NEW.payment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found for allocation' USING ERRCODE = 'P0001';
  END IF;
  IF v_payment.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Allocation company does not match payment company' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
  THEN
    RAISE EXCEPTION 'Only completed receipt payments can be allocated' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = NEW.target_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target invoice not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_invoice.company_id IS DISTINCT FROM NEW.company_id
     OR (v_invoice.customer_id IS NOT NULL AND v_invoice.customer_id IS DISTINCT FROM v_payment.customer_id)
     OR v_invoice.contract_id IS DISTINCT FROM v_payment.contract_id
  THEN
    RAISE EXCEPTION 'Allocation invoice does not match payment company, customer, or contract'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
     OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
  THEN
    RAISE EXCEPTION 'Inactive invoices cannot receive allocations' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM(allocation.amount), 0) INTO v_payment_allocated
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = NEW.payment_id
    AND allocation.is_active = true
    AND allocation.id IS DISTINCT FROM NEW.id;
  IF v_payment_allocated + NEW.amount > COALESCE(v_payment.amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Allocation would exceed payment amount by QAR %',
      ROUND((v_payment_allocated + NEW.amount - COALESCE(v_payment.amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  v_invoice_allocated := public.canonical_invoice_paid_amount(NEW.target_id, NEW.payment_id);
  SELECT v_invoice_allocated + COALESCE(SUM(allocation.amount), 0)
  INTO v_invoice_allocated
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = NEW.payment_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.target_id = NEW.target_id
    AND allocation.is_active = true
    AND allocation.id IS DISTINCT FROM NEW.id;

  IF v_invoice_allocated + NEW.amount > COALESCE(v_invoice.total_amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Allocation would overpay invoice by QAR %',
      ROUND((v_invoice_allocated + NEW.amount - COALESCE(v_invoice.total_amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_payment_allocation_row_trigger
BEFORE INSERT OR UPDATE ON public.payment_allocations
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_allocation_row();
CREATE OR REPLACE FUNCTION public.sync_payment_allocation_state(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_allocated numeric := 0;
  v_invoice_count integer := 0;
  v_primary_invoice_id uuid;
  v_status text;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_previous_sync text := COALESCE(current_setting('app.payment_allocation_sync', true), '');
BEGIN
  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('payment_id', p_payment_id, 'status', 'missing');
  END IF;

  SELECT
    COALESCE(SUM(allocation.amount), 0),
    COUNT(*) FILTER (WHERE allocation.allocation_type = 'invoice'),
    (array_agg(allocation.target_id ORDER BY allocation.allocation_order)
      FILTER (WHERE allocation.allocation_type = 'invoice'))[1]
  INTO v_allocated, v_invoice_count, v_primary_invoice_id
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id
    AND allocation.is_active = true;

  IF v_allocated > COALESCE(v_payment.amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Active allocations exceed payment amount' USING ERRCODE = 'P0001';
  END IF;

  v_status := CASE
    WHEN v_allocated <= 0.01 THEN 'unallocated'
    WHEN v_allocated >= COALESCE(v_payment.amount, 0) - 0.01 THEN 'fully_allocated'
    ELSE 'partially_allocated'
  END;
  IF v_invoice_count <> 1 OR v_status <> 'fully_allocated' THEN
    v_primary_invoice_id := NULL;
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_sync', 'on', true);
  UPDATE public.payments payment
  SET
    invoice_id = v_primary_invoice_id,
    allocation_status = v_status,
    updated_at = now()
  WHERE payment.id = p_payment_id
    AND (
      payment.invoice_id IS DISTINCT FROM v_primary_invoice_id
      OR payment.allocation_status IS DISTINCT FROM v_status
    );
  PERFORM set_config('app.payment_allocation_sync', v_previous_sync, true);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'allocated_amount', v_allocated,
    'unallocated_amount', GREATEST(COALESCE(v_payment.amount, 0) - v_allocated, 0),
    'allocation_status', v_status,
    'primary_invoice_id', v_primary_invoice_id
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.payment_allocation_sync', v_previous_sync, true);
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_payment_allocation_state(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_payment_allocation_state(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.after_payment_allocation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.allocation_type = 'invoice' THEN
    PERFORM public.recalculate_invoice_financial_state(OLD.target_id);
    PERFORM public.sync_payment_allocation_state(OLD.payment_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.allocation_type = 'invoice' THEN
    PERFORM public.sync_payment_allocation_state(NEW.payment_id);
    PERFORM public.recalculate_invoice_financial_state(NEW.target_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER after_payment_allocation_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
FOR EACH ROW
EXECUTE FUNCTION public.after_payment_allocation_change();
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
  v_contract_paid numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, NEW.invoice_id); END IF;
    IF NEW.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, NEW.contract_id); END IF;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, OLD.invoice_id); END IF;
    IF OLD.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, OLD.contract_id); END IF;
  END IF;

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_invoice_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  FOR v_contract_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_contract_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(payment.amount), 0) INTO v_contract_paid
    FROM public.payments payment
    WHERE payment.contract_id = v_contract_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt';

    UPDATE public.contracts contract
    SET
      total_paid = v_contract_paid,
      balance_due = GREATEST(COALESCE(contract.contract_amount, 0) - v_contract_paid, 0),
      payment_status = CASE
        WHEN v_contract_paid <= 0.01 THEN 'unpaid'
        WHEN v_contract_paid >= COALESCE(contract.contract_amount, 0) - 0.01 THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
    WHERE contract.id = v_contract_id;
  END LOOP;
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
CREATE OR REPLACE FUNCTION public.enforce_payment_financial_controls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_total numeric := 0;
  v_existing_paid numeric := 0;
  v_allocated numeric := 0;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.payment_date);

    SELECT COALESCE(SUM(allocation.amount), 0) INTO v_allocated
    FROM public.payment_allocations allocation
    WHERE allocation.payment_id = NEW.id AND allocation.is_active = true;
    IF v_allocated > COALESCE(NEW.amount, 0) + 0.01 THEN
      RAISE EXCEPTION 'Payment amount cannot be lower than active allocations' USING ERRCODE = 'P0001';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.payment_status = 'completed'
       AND NEW.payment_status = 'completed'
       AND (
         NEW.amount IS DISTINCT FROM OLD.amount
         OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
         OR NEW.company_id IS DISTINCT FROM OLD.company_id
         OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
         OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
         OR NEW.contract_id IS DISTINCT FROM OLD.contract_id
       )
    THEN
      RAISE EXCEPTION 'Completed payments are immutable. Use the allocation command or cancel and re-create.'
        USING ERRCODE = 'P0001';
    END IF;

    IF NEW.payment_status = 'completed'
       AND NEW.invoice_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.payment_allocations allocation
         WHERE allocation.payment_id = NEW.id AND allocation.is_active = true
       )
    THEN
      SELECT invoice.total_amount INTO v_invoice_total
      FROM public.invoices invoice
      WHERE invoice.id = NEW.invoice_id AND invoice.company_id = NEW.company_id;
      v_existing_paid := public.canonical_invoice_paid_amount(NEW.invoice_id, NEW.id);
      IF COALESCE(v_invoice_total, 0) > 0
         AND v_existing_paid + COALESCE(NEW.amount, 0) > v_invoice_total + 0.01
      THEN
        RAISE EXCEPTION 'Payment would overpay invoice by QAR %',
          ROUND((v_existing_paid + COALESCE(NEW.amount, 0) - v_invoice_total)::numeric, 2)
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.enforce_invoice_financial_controls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric := 0;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.invoice_date);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    v_paid := public.canonical_invoice_paid_amount(OLD.id, NULL);
    IF COALESCE(NEW.total_amount, 0) + 0.01 < v_paid THEN
      RAISE EXCEPTION 'Invoice total cannot be lower than its allocated receipts (QAR %)', v_paid
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.contract_id IS DISTINCT FROM OLD.contract_id)
     AND EXISTS (
       SELECT 1 FROM public.payment_allocations allocation
       WHERE allocation.allocation_type = 'invoice'
         AND allocation.target_id = OLD.id
         AND allocation.is_active = true
     )
  THEN
    RAISE EXCEPTION 'Invoice ownership cannot change while active payment allocations exist'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE'
     AND (
       COALESCE(OLD.paid_amount, 0) > 0
       OR EXISTS (
         SELECT 1 FROM public.payments payment
         WHERE payment.invoice_id = OLD.id
           AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
       )
       OR EXISTS (
         SELECT 1 FROM public.payment_allocations allocation
         WHERE allocation.allocation_type = 'invoice'
           AND allocation.target_id = OLD.id
           AND allocation.is_active = true
       )
       OR OLD.journal_entry_id IS NOT NULL
     )
  THEN
    RAISE EXCEPTION 'Invoices with payments, allocations, or journals cannot be deleted'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE OR REPLACE FUNCTION public.auto_seed_payment_invoice_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on'
     OR COALESCE(current_setting('app.payment_allocation_sync', true), '') = 'on'
  THEN
    RETURN NEW;
  END IF;
  IF lower(COALESCE(NEW.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
     AND lower(COALESCE(NEW.transaction_type::text, 'receipt')) = 'receipt'
     AND NEW.invoice_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.payment_allocations allocation
       WHERE allocation.payment_id = NEW.id AND allocation.is_active = true
     )
  THEN
    INSERT INTO public.payment_allocations (
      company_id, payment_id, allocation_type, target_id, amount,
      allocated_date, allocation_method, allocation_order, notes, created_by
    ) VALUES (
      NEW.company_id, NEW.id, 'invoice', NEW.invoice_id, NEW.amount,
      COALESCE(NEW.payment_date::timestamptz, now()), 'auto', 1,
      'Automatically seeded from a completed direct invoice payment.', NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS payment_allocation_auto_seed_after_payment ON public.payments;
CREATE TRIGGER payment_allocation_auto_seed_after_payment
AFTER INSERT OR UPDATE OF payment_status, invoice_id ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_seed_payment_invoice_allocation();
CREATE OR REPLACE FUNCTION public.replace_payment_invoice_allocations(
  p_payment_id uuid,
  p_company_id uuid,
  p_allocations jsonb,
  p_reason text,
  p_expected_allocations jsonb DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_before jsonb := '[]'::jsonb;
  v_after jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_old_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_invoice_id uuid;
  v_previous_batch text := COALESCE(current_setting('app.payment_allocation_batch_mode', true), '');
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL
     OR jsonb_typeof(COALESCE(p_allocations, '[]'::jsonb)) <> 'array'
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Payment, company, allocation array, and reason are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles role
      WHERE role.user_id = v_actor
        AND role.role::text IN ('super_admin', 'admin', 'company_admin', 'manager', 'accountant')
    ) INTO v_allowed;
    IF NOT v_allowed OR (
      NOT EXISTS (
        SELECT 1 FROM public.user_roles role
        WHERE role.user_id = v_actor AND role.role::text = 'super_admin'
      )
      AND public.get_user_company_id() IS DISTINCT FROM p_company_id
    ) THEN
      RAISE EXCEPTION 'Not authorized to replace payment allocations' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id AND payment.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in company' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
  THEN
    RAISE EXCEPTION 'Only completed receipts can be allocated' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('invoice_id', allocation.target_id, 'amount', allocation.amount)
    ORDER BY allocation.allocation_order
  ), '[]'::jsonb)
  INTO v_before
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;

  IF p_expected_allocations IS NOT NULL AND p_expected_allocations IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'Payment allocations changed after review' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_allocations) element
    WHERE NULLIF(element ->> 'invoice_id', '') IS NULL
      OR COALESCE((element ->> 'amount')::numeric, 0) <= 0
  ) OR (
    SELECT COUNT(*) FROM jsonb_array_elements(p_allocations)
  ) <> (
    SELECT COUNT(DISTINCT element ->> 'invoice_id') FROM jsonb_array_elements(p_allocations) element
  ) THEN
    RAISE EXCEPTION 'Allocations require unique invoice ids and positive amounts' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM((element ->> 'amount')::numeric), 0) INTO v_total
  FROM jsonb_array_elements(p_allocations) element;
  IF v_total > COALESCE(v_payment.amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Allocation total exceeds payment amount by QAR %',
      ROUND((v_total - COALESCE(v_payment.amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(array_agg(allocation.target_id), ARRAY[]::uuid[])
  INTO v_old_invoice_ids
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;

  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);
  UPDATE public.payment_allocations allocation
  SET
    is_active = false,
    voided_at = now(),
    voided_by = v_actor,
    void_reason = p_reason,
    updated_at = now()
  WHERE allocation.payment_id = p_payment_id AND allocation.is_active = true;

  INSERT INTO public.payment_allocations (
    company_id, payment_id, allocation_type, target_id, amount,
    allocated_date, allocation_method, allocation_order, notes, created_by
  )
  SELECT
    p_company_id, p_payment_id, 'invoice',
    (element.value ->> 'invoice_id')::uuid,
    (element.value ->> 'amount')::numeric,
    now(), 'manual', element.ordinality::integer,
    p_reason, v_actor
  FROM jsonb_array_elements(p_allocations) WITH ORDINALITY element(value, ordinality);

  PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
  PERFORM public.sync_payment_allocation_state(p_payment_id);

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM (
      SELECT unnest(v_old_invoice_ids) AS candidate_id
      UNION ALL
      SELECT (element ->> 'invoice_id')::uuid
      FROM jsonb_array_elements(p_allocations) element
    ) candidates
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('invoice_id', allocation.target_id, 'amount', allocation.amount)
    ORDER BY allocation.allocation_order
  ), '[]'::jsonb)
  INTO v_after
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;

  INSERT INTO public.payment_allocation_change_log (
    company_id, payment_id, before_allocations, after_allocations,
    reason, source, changed_by
  ) VALUES (
    p_company_id, p_payment_id, v_before, v_after,
    BTRIM(p_reason), 'allocation_rpc', v_actor
  );

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'before', v_before,
    'after', v_after,
    'allocated_amount', v_total,
    'unallocated_amount', GREATEST(COALESCE(v_payment.amount, 0) - v_total, 0)
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
  TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_financial_integrity_report(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  completed_payments AS (
    SELECT * FROM public.payments payment
    WHERE payment.company_id = p_company_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
  ),
  payment_journal_links AS (
    SELECT payment.id, payment.journal_entry_id, journal.id AS reference_journal_entry_id
    FROM completed_payments payment
    LEFT JOIN public.journal_entries journal
      ON journal.company_id = payment.company_id
     AND journal.reference_type = 'payment'
     AND journal.reference_id = payment.id
  ),
  invoice_payment_totals AS (
    SELECT
      invoice.id,
      invoice.invoice_number,
      invoice.total_amount,
      COALESCE(invoice.paid_amount, 0) AS recorded_paid_amount,
      public.canonical_invoice_paid_amount(invoice.id, NULL) AS actual_paid_amount
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
  ),
  allocation_overflow AS (
    SELECT payment.id, payment.payment_number
    FROM completed_payments payment
    JOIN public.payment_allocations allocation
      ON allocation.payment_id = payment.id AND allocation.is_active = true
    GROUP BY payment.id, payment.payment_number, payment.amount
    HAVING SUM(allocation.amount) > payment.amount + 0.01
  ),
  issue_rows AS (
    SELECT 'completed_payment_without_journal'::text AS code, COUNT(*)::int AS issue_count,
      COALESCE(jsonb_agg(id) FILTER (WHERE id IS NOT NULL), '[]'::jsonb) AS sample
    FROM payment_journal_links
    WHERE journal_entry_id IS NULL AND reference_journal_entry_id IS NULL
    UNION ALL
    SELECT 'unbalanced_journal_entries', COUNT(*)::int,
      COALESCE(jsonb_agg(id) FILTER (WHERE id IS NOT NULL), '[]'::jsonb)
    FROM public.journal_entries
    WHERE company_id = p_company_id
      AND ABS(COALESCE(total_debit, 0) - COALESCE(total_credit, 0)) > 0.01
    UNION ALL
    SELECT 'invoice_paid_amount_mismatch', COUNT(*)::int,
      COALESCE(jsonb_agg(invoice_number) FILTER (WHERE invoice_number IS NOT NULL), '[]'::jsonb)
    FROM invoice_payment_totals
    WHERE ABS(recorded_paid_amount - actual_paid_amount) > 0.01
    UNION ALL
    SELECT 'overpaid_invoices', COUNT(*)::int,
      COALESCE(jsonb_agg(invoice_number) FILTER (WHERE invoice_number IS NOT NULL), '[]'::jsonb)
    FROM invoice_payment_totals
    WHERE actual_paid_amount > total_amount + 0.01
    UNION ALL
    SELECT 'payment_allocation_overflow', COUNT(*)::int,
      COALESCE(jsonb_agg(payment_number) FILTER (WHERE payment_number IS NOT NULL), '[]'::jsonb)
    FROM allocation_overflow
  )
  SELECT jsonb_build_object(
    'checked_at', now(),
    'company_id', p_company_id,
    'summary', jsonb_build_object(
      'completed_payments', (SELECT COUNT(*) FROM completed_payments),
      'completed_payments_without_journal', (SELECT issue_count FROM issue_rows WHERE code = 'completed_payment_without_journal'),
      'unbalanced_journal_entries', (SELECT issue_count FROM issue_rows WHERE code = 'unbalanced_journal_entries'),
      'invoice_paid_amount_mismatches', (SELECT issue_count FROM issue_rows WHERE code = 'invoice_paid_amount_mismatch'),
      'overpaid_invoices', (SELECT issue_count FROM issue_rows WHERE code = 'overpaid_invoices'),
      'payment_allocation_overflows', (SELECT issue_count FROM issue_rows WHERE code = 'payment_allocation_overflow')
    ),
    'issues', COALESCE(jsonb_agg(
      jsonb_build_object('code', code, 'count', issue_count, 'sample', sample)
    ) FILTER (WHERE issue_count > 0), '[]'::jsonb),
    'status', CASE WHEN COALESCE(SUM(issue_count), 0) = 0 THEN 'healthy' ELSE 'needs_attention' END
  ) INTO v_result
  FROM issue_rows;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_financial_integrity_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_financial_integrity_report(uuid) TO authenticated, service_role;
COMMENT ON TABLE public.payment_allocations IS
'Canonical, audited allocation ledger. Direct payments.invoice_id is a compatibility pointer only.';
COMMENT ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid) IS
'Atomically replaces a completed receipt allocation set with company, customer, contract, amount, and stale-state validation.';
