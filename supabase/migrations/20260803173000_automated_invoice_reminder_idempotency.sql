BEGIN;

CREATE TABLE IF NOT EXISTS public.automated_invoice_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  cadence_date date NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT automated_invoice_reminder_type_valid
    CHECK (
      reminder_type = btrim(reminder_type)
      AND reminder_type ~ '^[a-z0-9_]+$'
      AND length(reminder_type) BETWEEN 1 AND 80
    ),
  CONSTRAINT automated_invoice_reminder_status_valid
    CHECK (status IN ('processing', 'sent', 'failed')),
  CONSTRAINT automated_invoice_reminder_attempts_valid
    CHECK (attempts BETWEEN 1 AND 3),
  CONSTRAINT automated_invoice_reminder_delivery_unique
    UNIQUE (invoice_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_automated_invoice_reminder_company_status
  ON public.automated_invoice_reminder_deliveries(company_id, status, updated_at);

ALTER TABLE public.automated_invoice_reminder_deliveries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_automated_invoice_reminder_delivery(
  p_company_id uuid,
  p_invoice_id uuid,
  p_reminder_type text,
  p_cadence_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_delivery_id uuid;
BEGIN
  IF v_role <> 'service_role' AND NOT v_trusted_direct_session THEN
    RAISE EXCEPTION 'Service role is required to claim reminder delivery'
      USING ERRCODE = '42501';
  END IF;
  IF p_company_id IS NULL OR p_invoice_id IS NULL OR p_cadence_date IS NULL
     OR p_reminder_type IS NULL
     OR p_reminder_type !~ '^[a-z0-9_]{1,80}$'
  THEN
    RAISE EXCEPTION 'Invalid reminder delivery claim' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
    AND invoice.company_id = p_company_id
  FOR SHARE OF invoice;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice does not belong to the requested company'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.automated_invoice_reminder_deliveries AS delivery (
    company_id,
    invoice_id,
    reminder_type,
    cadence_date,
    status,
    attempts
  ) VALUES (
    p_company_id,
    p_invoice_id,
    p_reminder_type,
    p_cadence_date,
    'processing',
    1
  )
  ON CONFLICT ON CONSTRAINT automated_invoice_reminder_delivery_unique
  DO UPDATE SET
    cadence_date = EXCLUDED.cadence_date,
    status = 'processing',
    attempts = delivery.attempts + 1,
    last_error = NULL,
    updated_at = now()
  WHERE delivery.status = 'failed'
    AND delivery.attempts < 3
    AND delivery.updated_at <= now() - interval '15 minutes'
  RETURNING delivery.id INTO v_delivery_id;

  -- NULL means another worker already claimed/sent this exact cadence stage.
  RETURN v_delivery_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_automated_invoice_reminder_delivery(
  p_delivery_id uuid,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
BEGIN
  IF v_role <> 'service_role' AND NOT v_trusted_direct_session THEN
    RAISE EXCEPTION 'Service role is required to complete reminder delivery'
      USING ERRCODE = '42501';
  END IF;
  IF p_delivery_id IS NULL OR p_success IS NULL THEN
    RAISE EXCEPTION 'Delivery id and result are required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.automated_invoice_reminder_deliveries delivery
  SET status = CASE WHEN p_success THEN 'sent' ELSE 'failed' END,
      sent_at = CASE WHEN p_success THEN now() ELSE NULL END,
      last_error = CASE
        WHEN p_success THEN NULL
        ELSE left(COALESCE(NULLIF(btrim(p_error), ''), 'Unknown delivery failure'), 2000)
      END,
      updated_at = now()
  WHERE delivery.id = p_delivery_id
    AND delivery.status = 'processing';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reminder delivery claim is missing or already completed'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON TABLE public.automated_invoice_reminder_deliveries
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.automated_invoice_reminder_deliveries
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_automated_invoice_reminder_delivery(
  uuid, uuid, text, date
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_automated_invoice_reminder_delivery(
  uuid, uuid, text, date
) TO service_role;

REVOKE ALL ON FUNCTION public.complete_automated_invoice_reminder_delivery(
  uuid, boolean, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_automated_invoice_reminder_delivery(
  uuid, boolean, text
) TO service_role;

COMMENT ON TABLE public.automated_invoice_reminder_deliveries IS
  'Service-only idempotency ledger for scheduled invoice reminder delivery.';

COMMIT;
