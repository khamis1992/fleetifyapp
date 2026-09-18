BEGIN;

-- Private-by-privilege immutable command evidence; not a browser-editable table.
-- Stored only in the same transaction as a confirmed receipt. No pending rows
-- can survive a failed financial command or a failed evidence write.
CREATE TABLE public.invoice_fee_payment_requests (
  company_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (
    idempotency_key = btrim(idempotency_key) AND length(idempotency_key) BETWEEN 1 AND 200
  ),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  request_payload jsonb NOT NULL CHECK (jsonb_typeof(request_payload) = 'object'),
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, idempotency_key)
);
CREATE INDEX invoice_fee_payment_requests_invoice_idx
  ON public.invoice_fee_payment_requests(invoice_id);
ALTER TABLE public.invoice_fee_payment_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.invoice_fee_payment_requests FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.guard_invoice_fee_payment_request_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $guard$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Payment request evidence is immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW.request_payload ->> 'version' IS DISTINCT FROM '1'
     OR NEW.request_payload ->> 'company_id' IS DISTINCT FROM NEW.company_id::text
     OR NEW.request_payload ->> 'invoice_id' IS DISTINCT FROM NEW.invoice_id::text
     OR NEW.request_payload ->> 'actor_id' IS DISTINCT FROM NEW.actor_id::text THEN
    RAISE EXCEPTION 'Payment request payload identity mismatch' USING ERRCODE = '23514';
  END IF;
  -- Existing invoice/payment IDs are globally unique. Validate tenant and
  -- relationship explicitly without adding indexes to large production tables.
  IF NOT EXISTS (
    SELECT 1 FROM public.payments payment
    JOIN public.invoices invoice ON invoice.id = payment.invoice_id
    WHERE payment.id = NEW.payment_id AND payment.invoice_id = NEW.invoice_id
      AND payment.company_id = NEW.company_id AND invoice.company_id = NEW.company_id
      AND payment.created_by = NEW.actor_id AND payment.idempotency_key = NEW.idempotency_key
      AND payment.amount = (NEW.request_payload ->> 'amount')::numeric
      AND payment.late_fee_amount = (NEW.request_payload ->> 'late_fee_amount')::numeric
      AND to_char(payment.payment_date, 'YYYY-MM-DD') = NEW.request_payload ->> 'payment_date'
      AND lower(btrim(payment.payment_method)) = NEW.request_payload ->> 'payment_method'
      AND NULLIF(btrim(COALESCE(payment.reference_number, '')), '')
        IS NOT DISTINCT FROM NEW.request_payload ->> 'reference_number'
  ) THEN
    RAISE EXCEPTION 'Payment request evidence does not match its receipt' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$guard$;
REVOKE ALL ON FUNCTION public.guard_invoice_fee_payment_request_v1() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER guard_invoice_fee_payment_request_rows
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_fee_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_fee_payment_request_v1();
CREATE TRIGGER guard_invoice_fee_payment_request_truncate
  BEFORE TRUNCATE ON public.invoice_fee_payment_requests
  FOR EACH STATEMENT EXECUTE FUNCTION public.guard_invoice_fee_payment_request_v1();

-- Additive command. Do not enable callers until full-schema verification and deployment.
-- Existing v1 financial posting remains unchanged; v2 establishes replay identity
-- and validates the currently collectible assessment before invoking it.
CREATE FUNCTION public.create_invoice_payment_with_late_fee_v2(
  p_company_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_late_fee_amount numeric,
  p_late_fee_id uuid,
  p_payment_date date,
  p_payment_method text,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid;
  v_service boolean := COALESCE(auth.role()::text, '') = 'service_role';
  v_key text := NULLIF(btrim(p_idempotency_key), '');
  v_method text := lower(btrim(COALESCE(p_payment_method, '')));
  v_reference text := NULLIF(btrim(COALESCE(p_reference_number, '')), '');
  v_notes text := NULLIF(btrim(COALESCE(p_notes, '')), '');
  v_invoice public.invoices%ROWTYPE;
  v_existing public.payments%ROWTYPE;
  v_fee public.late_fees%ROWTYPE;
  v_fee_paid numeric;
  v_payload jsonb;
  v_request public.invoice_fee_payment_requests%ROWTYPE;
  v_payment_id uuid;
BEGIN
  IF p_company_id IS NULL OR p_invoice_id IS NULL OR p_payment_date IS NULL
     OR v_key IS NULL OR length(v_key) > 200 OR v_method = ''
     OR p_amount IS NULL OR p_late_fee_amount IS NULL
     OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_late_fee_amount::text IN ('NaN', 'Infinity', '-Infinity')
     -- payments.amount/late_fee_amount and allocation amounts persist cents.
     -- Reject precision loss rather than storing a different replay payload.
     OR p_amount <> round(p_amount, 2) OR p_late_fee_amount <> round(p_late_fee_amount, 2)
     OR p_amount <= 0 OR p_late_fee_amount <= 0 OR p_late_fee_amount > p_amount THEN
    RAISE EXCEPTION 'Company, invoice, date, method, stable attempt key and valid amounts are required'
      USING ERRCODE = '22023';
  END IF;

  v_actor := CASE WHEN v_service THEN p_actor_id ELSE auth.uid() END;
  IF v_actor IS NULL OR (NOT v_service AND p_actor_id IS NOT NULL AND p_actor_id <> v_actor) THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT v_service AND NOT COALESCE(public.is_finance_action_authorized(
    v_actor, p_company_id,
    ARRAY['finance.payment.create', 'finance.payments.create', 'finance.payments.write', 'payments.create'],
    ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
  ), false) THEN
    RAISE EXCEPTION 'Not authorized to create payments for this company' USING ERRCODE = '42501';
  END IF;

  v_payload := jsonb_build_object(
    'version', 1, 'company_id', p_company_id, 'invoice_id', p_invoice_id, 'actor_id', v_actor,
    'amount', p_amount, 'late_fee_amount', p_late_fee_amount, 'late_fee_id', p_late_fee_id,
    'payment_date', to_char(p_payment_date, 'YYYY-MM-DD'), 'payment_method', v_method,
    'reference_number', v_reference, 'notes', v_notes
  );

  -- Keep the invoice-before-payment/fee lock order used by v1. Same-invoice
  -- attempts serialize here; unique payment key indexes protect other invoices.
  SELECT * INTO v_invoice FROM public.invoices
  WHERE id = p_invoice_id AND company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found in the requested company' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_request FROM public.invoice_fee_payment_requests
  WHERE company_id = p_company_id AND idempotency_key = v_key;
  IF FOUND THEN
    IF v_request.request_payload IS DISTINCT FROM v_payload THEN
      RAISE EXCEPTION 'Idempotency key was already used with different payment data' USING ERRCODE = '22023';
    END IF;
    -- Return history, not a promise that the payment is still completed. The
    -- caller must read its current state. Never recreate a cancelled receipt.
    IF NOT EXISTS (
      SELECT 1 FROM public.payments
      WHERE id = v_request.payment_id AND company_id = p_company_id AND invoice_id = p_invoice_id
    ) THEN
      RAISE EXCEPTION 'Payment request receipt identity changed; reconcile before retry' USING ERRCODE = '23514';
    END IF;
    RETURN v_request.payment_id;
  END IF;

  -- Legacy v1 receipts have no original command snapshot. Adopt only an exact
  -- match; never guess original notes or issue a new receipt on a mismatch.
  SELECT * INTO v_existing FROM public.payments
  WHERE company_id = p_company_id AND idempotency_key = v_key FOR UPDATE;
  IF FOUND THEN
    IF v_existing.invoice_id IS DISTINCT FROM p_invoice_id
       OR v_existing.created_by IS DISTINCT FROM v_actor
       OR v_existing.amount IS DISTINCT FROM p_amount
       OR COALESCE(v_existing.late_fee_amount, 0) IS DISTINCT FROM p_late_fee_amount
       OR v_existing.payment_date IS DISTINCT FROM p_payment_date
       OR lower(btrim(v_existing.payment_method)) IS DISTINCT FROM v_method
       OR NULLIF(btrim(COALESCE(v_existing.reference_number, '')), '') IS DISTINCT FROM v_reference
       OR NULLIF(btrim(COALESCE(v_existing.notes, '')), '') IS DISTINCT FROM v_notes THEN
      RAISE EXCEPTION 'Idempotency key was already used with different payment data'
        USING ERRCODE = '22023';
    END IF;
    -- Historical/cancelled allocations still identify the original assessment.
    IF p_late_fee_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.payment_allocations
      WHERE company_id = p_company_id AND payment_id = v_existing.id
        AND allocation_type = 'late_fee' AND target_id = p_late_fee_id
    ) THEN
      RAISE EXCEPTION 'Idempotency key refers to another fee assessment' USING ERRCODE = '22023';
    END IF;
    -- Restoring an existing result must not depend on today's balance, fee
    -- status, invoice status or whether its original financial period closed.
    INSERT INTO public.invoice_fee_payment_requests (
      company_id, idempotency_key, invoice_id, actor_id, request_payload, payment_id
    ) VALUES (p_company_id, v_key, p_invoice_id, v_actor, v_payload, v_existing.id);
    RETURN v_existing.id;
  END IF;

  IF p_late_fee_id IS NOT NULL THEN
    SELECT * INTO v_fee FROM public.late_fees
    WHERE id = p_late_fee_id AND company_id = p_company_id
      AND invoice_id = p_invoice_id FOR UPDATE;
    IF NOT FOUND OR lower(COALESCE(v_fee.status, '')) NOT IN ('pending', 'applied') THEN
      RAISE EXCEPTION 'Fee assessment changed or is not collectible; refresh before payment'
        USING ERRCODE = 'P0001';
    END IF;
    SELECT COALESCE(sum(amount), 0) INTO v_fee_paid FROM public.payment_allocations
    WHERE company_id = p_company_id AND allocation_type = 'late_fee'
      AND target_id = v_fee.id AND is_active;
    IF p_late_fee_amount > GREATEST(v_fee.fee_amount - v_fee_paid, 0) THEN
      RAISE EXCEPTION 'Late-fee payment exceeds the remaining assessed fee'
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    -- A calculated quote without an ID must not silently reuse, replace or
    -- resurrect a persisted assessment that appeared after the client read.
    PERFORM 1 FROM public.late_fees
    WHERE company_id = p_company_id AND invoice_id = p_invoice_id
      AND lower(COALESCE(status, '')) IN ('pending', 'applied', 'waived', 'paid')
    FOR UPDATE;
    IF FOUND THEN
      RAISE EXCEPTION 'Fee assessment changed; refresh before payment' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_payment_id := public.create_invoice_payment_with_late_fee_v1(
    p_company_id, p_invoice_id, p_amount, p_late_fee_amount, p_late_fee_id,
    p_payment_date, v_method, v_reference, v_notes, v_key, v_actor
  );
  INSERT INTO public.invoice_fee_payment_requests (
    company_id, idempotency_key, invoice_id, actor_id, request_payload, payment_id
  ) VALUES (p_company_id, v_key, p_invoice_id, v_actor, v_payload, v_payment_id);
  RETURN v_payment_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_invoice_payment_with_late_fee_v2(
  uuid, uuid, numeric, numeric, uuid, date, text, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_payment_with_late_fee_v2(
  uuid, uuid, numeric, numeric, uuid, date, text, text, text, text, uuid
) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_invoice_payment_with_late_fee_v2(
  uuid, uuid, numeric, numeric, uuid, date, text, text, text, text, uuid
) IS 'Immutable request identity for invoice receipts including one assessed fee; does not define fee policy. Requires a stable request key.';

COMMIT;
