BEGIN;

-- Ephemeral capability owned by the RPC transaction, not a client-settable GUC.
CREATE TABLE public.invoice_fee_payment_context (
  company_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  amount numeric NOT NULL,
  fee_amount numeric NOT NULL CHECK (fee_amount > 0 AND fee_amount <= amount),
  payment_date date NOT NULL,
  payment_method text NOT NULL,
  transaction_id xid8 NOT NULL DEFAULT pg_current_xact_id(),
  PRIMARY KEY (company_id, idempotency_key)
);
CREATE INDEX invoice_fee_payment_context_invoice_idx ON public.invoice_fee_payment_context(invoice_id);
ALTER TABLE public.invoice_fee_payment_context ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.invoice_fee_payment_context FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.payment_principal_for_control_v1(p_payment public.payments)
RETURNS numeric LANGUAGE sql STABLE SET search_path = '' AS $helper$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM public.invoice_fee_payment_context context
    WHERE context.company_id = p_payment.company_id
      AND context.idempotency_key = p_payment.idempotency_key
      AND context.invoice_id = p_payment.invoice_id AND context.actor_id = p_payment.created_by
      AND context.amount = p_payment.amount AND context.fee_amount = p_payment.late_fee_amount
      AND context.payment_date = p_payment.payment_date
      AND context.payment_method = lower(btrim(p_payment.payment_method))
      AND context.transaction_id = pg_current_xact_id()
  ) THEN p_payment.amount - p_payment.late_fee_amount ELSE COALESCE(p_payment.amount, 0) END
$helper$;
REVOKE ALL ON FUNCTION public.payment_principal_for_control_v1(public.payments)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.assert_invoice_fee_command_allocations_v1(
  p_payment_id uuid, p_company_id uuid, p_invoice_id uuid, p_fee_id uuid,
  p_amount numeric, p_fee_amount numeric
) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $proof$
DECLARE
  v_total numeric;
  v_principal numeric;
  v_fee numeric;
  v_fee_count integer;
  v_bad integer;
BEGIN
  SELECT COALESCE(sum(allocation.amount), 0),
    COALESCE(sum(allocation.amount) FILTER (WHERE allocation.allocation_type = 'invoice'
      AND allocation.target_id = p_invoice_id), 0),
    COALESCE(sum(allocation.amount) FILTER (WHERE allocation.allocation_type = 'late_fee'), 0),
    count(*) FILTER (WHERE allocation.allocation_type = 'late_fee'),
    count(*) FILTER (WHERE allocation.company_id IS DISTINCT FROM p_company_id
      OR allocation.amount IS NULL OR allocation.amount <= 0
      OR allocation.allocation_type IS NULL OR allocation.allocation_type NOT IN ('invoice', 'late_fee')
      OR (allocation.allocation_type = 'invoice' AND allocation.target_id IS DISTINCT FROM p_invoice_id)
      OR (allocation.allocation_type = 'late_fee' AND NOT EXISTS (
        SELECT 1 FROM public.late_fees fee JOIN public.payments payment ON payment.id = p_payment_id
        WHERE fee.id = allocation.target_id AND fee.company_id = p_company_id
          AND fee.invoice_id = p_invoice_id AND fee.contract_id IS NOT DISTINCT FROM payment.contract_id
          AND (p_fee_id IS NULL OR fee.id = p_fee_id)
          AND lower(COALESCE(fee.status, '')) IN ('pending', 'applied', 'paid')
      )))
  INTO v_total, v_principal, v_fee, v_fee_count, v_bad
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id AND allocation.is_active;

  IF v_total <> p_amount OR v_principal <> p_amount - p_fee_amount
     OR v_fee <> p_fee_amount OR v_fee_count <> 1 OR v_bad <> 0 THEN
    RAISE EXCEPTION 'Fee receipt allocations do not match the authorized command' USING ERRCODE = '23514';
  END IF;
END;
$proof$;
REVOKE ALL ON FUNCTION public.assert_invoice_fee_command_allocations_v1(uuid, uuid, uuid, uuid, numeric, numeric)
  FROM PUBLIC, anon, authenticated, service_role;

DO $patch$
DECLARE
  v_definition text;
  v_source text;
  v_old text := 'v_existing_paid + COALESCE(NEW.amount, 0)';
  v_new text := 'v_existing_paid + public.payment_principal_for_control_v1(NEW)';
  v_call text := '  v_payment_id := public.create_invoice_payment_with_late_fee_v1(';
  v_after text := E'    p_payment_date, v_method, v_reference, v_notes, v_key, v_actor\n  );';
BEGIN
  SELECT pg_get_functiondef(oid), prosrc INTO v_definition, v_source
  FROM pg_proc WHERE oid = 'public.enforce_payment_financial_controls()'::regprocedure;
  -- Preserve period, immutability and allocation checks. Refuse unknown bodies.
  IF md5(replace(v_source, E'\r\n', E'\n')) <> '4daf47f4a7f0569e413439c6c130230d' THEN
    RAISE EXCEPTION 'Financial control changed; review before applying fee principal patch';
  END IF;
  EXECUTE replace(v_definition, v_old, v_new);

  SELECT replace(pg_get_functiondef(oid), E'\r\n', E'\n') INTO v_definition
  FROM pg_proc WHERE oid = 'public.create_invoice_payment_with_late_fee_v2(uuid,uuid,numeric,numeric,uuid,date,text,text,text,text,uuid)'::regprocedure;
  IF (length(v_definition) - length(replace(v_definition, v_call, ''))) / length(v_call) <> 1
     OR (length(v_definition) - length(replace(v_definition, v_after, ''))) / length(v_after) <> 1 THEN
    RAISE EXCEPTION 'Fee replay command changed; review context insertion points';
  END IF;
  v_definition := replace(v_definition, v_call, E'  INSERT INTO public.invoice_fee_payment_context (\n    company_id, idempotency_key, invoice_id, actor_id, amount, fee_amount, payment_date, payment_method\n  ) VALUES (p_company_id, v_key, p_invoice_id, v_actor, p_amount, p_late_fee_amount, p_payment_date, v_method);\n\n' || v_call);
  v_definition := replace(v_definition, v_after, v_after || E'\n  PERFORM public.assert_invoice_fee_command_allocations_v1(\n    v_payment_id, p_company_id, p_invoice_id, p_late_fee_id, p_amount, p_late_fee_amount\n  );\n  DELETE FROM public.invoice_fee_payment_context\n  WHERE company_id = p_company_id AND idempotency_key = v_key AND transaction_id = pg_current_xact_id();');
  EXECUTE v_definition;
END;
$patch$;

COMMIT;
