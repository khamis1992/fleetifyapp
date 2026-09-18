BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

DO $preflight$
BEGIN
  IF to_regclass('public.legal_case_formal_notices') IS NULL
     OR to_regclass('public.contract_documents') IS NULL
     OR to_regclass('public.agent_invocation_registry') IS NULL
     OR to_regprocedure(
       'public.verify_scheduled_agent_invocation_v1(text,uuid,text,text)'
     ) IS NULL
     OR to_regprocedure(
       'public.canonical_invoice_paid_amount(uuid,uuid)'
     ) IS NULL
  THEN
    RAISE EXCEPTION
      'Formal notices, contract documents and scheduled-agent identity must exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.companies company
    WHERE company.id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
  ) THEN
    RAISE EXCEPTION 'Configured company does not exist';
  END IF;

  IF (
    SELECT count(DISTINCT secret.name)
    FROM vault.secrets secret
    WHERE secret.name IN ('supabase_project_url', 'supabase_anon_key')
  ) <> 2 THEN
    RAISE EXCEPTION 'Required Supabase URL/key Vault secrets are missing';
  END IF;
END;
$preflight$;

CREATE TABLE public.legal_notice_agent_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  notice_type text NOT NULL DEFAULT 'payment_demand'
    CHECK (notice_type IN ('payment_demand', 'vehicle_return_demand', 'termination_notice')),
  cycle_key date NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled'
    )),
  phone_e164 text NOT NULL CHECK (phone_e164 ~ '^[1-9][0-9]{7,14}$'),
  customer_name text NOT NULL CHECK (btrim(customer_name) <> ''),
  contract_number text NOT NULL CHECK (btrim(contract_number) <> ''),
  oldest_due_date date NOT NULL,
  source_invoice_ids uuid[] NOT NULL
    CHECK (cardinality(source_invoice_ids) > 0),
  amount_due numeric(14,2) NOT NULL CHECK (amount_due > 0),
  grace_period_days integer NOT NULL DEFAULT 7
    CHECK (grace_period_days BETWEEN 1 AND 30),
  message_body text NOT NULL CHECK (length(message_body) BETWEEN 40 AND 4096),
  message_sha256 text NOT NULL CHECK (message_sha256 ~ '^[a-f0-9]{64}$'),
  provider text NOT NULL DEFAULT 'ultramsg' CHECK (provider = 'ultramsg'),
  provider_message_id text,
  provider_status text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  formal_notice_id uuid REFERENCES public.legal_case_formal_notices(id) ON DELETE SET NULL,
  proof_document_id uuid REFERENCES public.contract_documents(id) ON DELETE SET NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_notice_agent_cycle_unique
    UNIQUE (contract_id, notice_type, cycle_key)
);

CREATE UNIQUE INDEX legal_notice_agent_provider_message_unique
  ON public.legal_notice_agent_jobs(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX legal_notice_agent_company_status_idx
  ON public.legal_notice_agent_jobs(company_id, status, updated_at DESC);

CREATE INDEX legal_notice_agent_contract_idx
  ON public.legal_notice_agent_jobs(contract_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_legal_notice_agent_job_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_touch_legal_notice_agent_job
BEFORE UPDATE ON public.legal_notice_agent_jobs
FOR EACH ROW EXECUTE FUNCTION public.touch_legal_notice_agent_job_v1();

REVOKE ALL ON FUNCTION public.touch_legal_notice_agent_job_v1()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_legal_notice_agent_job_v1()
TO service_role;

ALTER TABLE public.legal_notice_agent_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_notice_agent_jobs_company_select
ON public.legal_notice_agent_jobs
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

REVOKE ALL ON TABLE public.legal_notice_agent_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.legal_notice_agent_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.legal_notice_agent_jobs TO service_role;

ALTER TABLE public.ai_agent_reviews
  DROP CONSTRAINT IF EXISTS ai_agent_reviews_agent_type_check;
ALTER TABLE public.ai_agent_reviews
  ADD CONSTRAINT ai_agent_reviews_agent_type_check CHECK (agent_type IN (
    'journal_entry', 'legal_case', 'daily_closeout',
    'collection_message', 'customer_autofill', 'payment_match',
    'correction_verify', 'violation_inbox', 'ops_audit', 'auto_repair',
    'customer_merge', 'smart_assignment', 'formal_notice'
  ));

DO $secrets$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets secret
    WHERE secret.name = 'agent_secret_legal_notice'
  ) THEN
    PERFORM vault.create_secret(
      pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
      'agent_secret_legal_notice',
      'Dedicated scheduled identity for legal-notice-agent'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets secret
    WHERE secret.name = 'ultramsg_webhook_secret'
  ) THEN
    PERFORM vault.create_secret(
      pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
      'ultramsg_webhook_secret',
      'Verification token for the Ultramsg acknowledgement webhook'
    );
  END IF;
END;
$secrets$;

INSERT INTO public.agent_invocation_registry (
  agent_id,
  vault_secret_name,
  allowed_company_id,
  enabled,
  updated_at
) VALUES (
  'legal-notice-agent',
  'agent_secret_legal_notice',
  '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
  true,
  now()
)
ON CONFLICT (agent_id) DO UPDATE
SET vault_secret_name = EXCLUDED.vault_secret_name,
    allowed_company_id = EXCLUDED.allowed_company_id,
    enabled = true,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.get_legal_notice_webhook_configuration_v1()
RETURNS TABLE(webhook_url text, webhook_secret text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    rtrim(project_url.decrypted_secret, '/')
      || '/functions/v1/ultramsg-ack-webhook?secret='
      || webhook.decrypted_secret,
    webhook.decrypted_secret
  FROM vault.decrypted_secrets project_url
  CROSS JOIN vault.decrypted_secrets webhook
  WHERE project_url.name = 'supabase_project_url'
    AND webhook.name = 'ultramsg_webhook_secret'
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_legal_notice_webhook_configuration_v1()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_legal_notice_webhook_configuration_v1()
TO service_role;

CREATE OR REPLACE FUNCTION public.verify_ultramsg_webhook_secret_v1(
  p_supplied_secret text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets secret
    WHERE secret.name = 'ultramsg_webhook_secret'
      AND extensions.digest(
        pg_catalog.convert_to(COALESCE(p_supplied_secret, ''), 'UTF8'),
        'sha256'
      ) = extensions.digest(
        pg_catalog.convert_to(secret.decrypted_secret, 'UTF8'),
        'sha256'
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.verify_ultramsg_webhook_secret_v1(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ultramsg_webhook_secret_v1(text)
TO service_role;

CREATE OR REPLACE FUNCTION public.get_automatic_formal_notice_live_invoices_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_customer_id uuid,
  p_invoice_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  invoice_number text,
  due_date date,
  total_amount numeric,
  balance_due numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    invoice.id,
    invoice.invoice_number,
    invoice.due_date,
    invoice.total_amount,
    GREATEST(
      COALESCE(invoice.total_amount, 0)
        - public.canonical_invoice_paid_amount(invoice.id, NULL),
      0
    )::numeric AS balance_due
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
    AND invoice.id = ANY(COALESCE(p_invoice_ids, '{}'::uuid[]))
    AND invoice.due_date IS NOT NULL
    AND lower(COALESCE(invoice.status, '')) IN (
      'approved', 'sent', 'overdue', 'pending', 'unpaid'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.payments payment
      WHERE payment.company_id = p_company_id
        AND lower(COALESCE(payment.payment_status, '')) IN (
          'completed', 'paid', 'success', 'succeeded'
        )
        AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
        AND (
          (
            payment.contract_id = p_contract_id
            AND payment.invoice_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM public.payment_allocations allocation
              WHERE allocation.payment_id = payment.id
                AND allocation.is_active = true
            )
          )
          OR (
            payment.customer_id = p_customer_id
            AND payment.contract_id IS NULL
            AND payment.invoice_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM public.payment_allocations allocation
              WHERE allocation.payment_id = payment.id
                AND allocation.is_active = true
            )
          )
          OR EXISTS (
            SELECT 1
            FROM public.payment_allocations allocation
            WHERE allocation.payment_id = payment.id
              AND allocation.is_active = true
              AND allocation.allocation_type = 'contract'
              AND allocation.target_id = p_contract_id
          )
        )
    )
  ORDER BY invoice.due_date, invoice.id;
$function$;

REVOKE ALL ON FUNCTION public.get_automatic_formal_notice_live_invoices_v1(
  uuid, uuid, uuid, uuid[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_automatic_formal_notice_live_invoices_v1(
  uuid, uuid, uuid, uuid[]
) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_automatic_formal_notice_dispatch_v1(
  p_job_id uuid,
  p_provider_message_id text,
  p_provider_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_job public.legal_notice_agent_jobs%ROWTYPE;
  v_notice_id uuid;
BEGIN
  IF v_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;
  IF p_job_id IS NULL OR NULLIF(btrim(p_provider_message_id), '') IS NULL THEN
    RAISE EXCEPTION 'Job and provider message id are required' USING ERRCODE = '22023';
  END IF;

  SELECT job.* INTO v_job
  FROM public.legal_notice_agent_jobs job
  WHERE job.id = p_job_id
    AND job.status = 'sending'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal notice job is missing or not sending';
  END IF;

  INSERT INTO public.legal_case_formal_notices (
    company_id,
    contract_id,
    notice_type,
    sent_on,
    delivery_method,
    delivery_confirmed,
    grace_period_days,
    notes
  ) VALUES (
    v_job.company_id,
    v_job.contract_id,
    v_job.notice_type,
    timezone('Asia/Qatar', now())::date,
    'whatsapp',
    false,
    v_job.grace_period_days,
    'Automatic formal notice job ' || v_job.id::text
  )
  RETURNING id INTO v_notice_id;

  UPDATE public.legal_notice_agent_jobs job
  SET status = 'sent',
      provider_message_id = btrim(p_provider_message_id),
      provider_status = 'sent',
      provider_payload = COALESCE(p_provider_payload, '{}'::jsonb),
      formal_notice_id = v_notice_id,
      sent_at = now(),
      last_error = NULL
  WHERE job.id = v_job.id;

  RETURN v_notice_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_automatic_formal_notice_dispatch_v1(
  uuid, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_automatic_formal_notice_dispatch_v1(
  uuid, text, jsonb
) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_automatic_formal_notice_delivery_v1(
  p_job_id uuid,
  p_provider_status text,
  p_event_at timestamptz,
  p_proof_document_id uuid,
  p_provider_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_job public.legal_notice_agent_jobs%ROWTYPE;
  v_read boolean := lower(COALESCE(p_provider_status, '')) IN (
    'read', 'viewed', 'played'
  );
BEGIN
  IF v_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;
  IF p_job_id IS NULL OR p_event_at IS NULL OR p_proof_document_id IS NULL THEN
    RAISE EXCEPTION 'Delivery evidence is incomplete' USING ERRCODE = '22023';
  END IF;

  SELECT job.* INTO v_job
  FROM public.legal_notice_agent_jobs job
  WHERE job.id = p_job_id
    AND job.status IN ('sent', 'delivered', 'read')
  FOR UPDATE;
  IF NOT FOUND OR v_job.formal_notice_id IS NULL THEN
    RAISE EXCEPTION 'Dispatched legal notice job was not found';
  END IF;

  PERFORM 1
  FROM public.contract_documents document
  WHERE document.id = p_proof_document_id
    AND document.company_id = v_job.company_id
    AND document.contract_id = v_job.contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proof document does not belong to the job contract';
  END IF;

  UPDATE public.legal_case_formal_notices notice
  SET delivered_on = timezone('Asia/Qatar', p_event_at)::date,
      delivery_confirmed = true,
      proof_document_id = p_proof_document_id,
      notes = concat_ws(
        E'\n',
        NULLIF(notice.notes, ''),
        'Ultramsg message ' || v_job.provider_message_id
          || ' confirmed ' || lower(p_provider_status)
      )
  WHERE notice.id = v_job.formal_notice_id;

  UPDATE public.legal_notice_agent_jobs job
  SET status = CASE WHEN v_read THEN 'read' ELSE 'delivered' END,
      provider_status = lower(p_provider_status),
      provider_payload = COALESCE(job.provider_payload, '{}'::jsonb)
        || jsonb_build_object(
          'acknowledgement', COALESCE(p_provider_payload, '{}'::jsonb)
        ),
      proof_document_id = p_proof_document_id,
      delivered_at = COALESCE(job.delivered_at, p_event_at),
      read_at = CASE WHEN v_read THEN p_event_at ELSE job.read_at END,
      last_error = NULL
  WHERE job.id = v_job.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_automatic_formal_notice_delivery_v1(
  uuid, text, timestamptz, uuid, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_automatic_formal_notice_delivery_v1(
  uuid, text, timestamptz, uuid, jsonb
) TO service_role;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname = 'automatic-formal-notice-agent';

SELECT cron.schedule(
  'automatic-formal-notice-agent',
  '15 7 * * *',
  $command$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_project_url'
      LIMIT 1
    ) || '/functions/v1/legal-notice-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'supabase_anon_key'
        LIMIT 1
      ),
      'apikey', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'supabase_anon_key'
        LIMIT 1
      ),
      'x-agent-id', 'legal-notice-agent',
      'x-agent-secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'agent_secret_legal_notice'
        LIMIT 1
      )
    ),
    body := jsonb_build_object(
      'action', 'scan_and_send',
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'minDaysOverdue', 10,
      'gracePeriodDays', 7,
      'maxNotices', 25
    ),
    timeout_milliseconds := 120000
  );
  $command$
);

COMMENT ON TABLE public.legal_notice_agent_jobs IS
  'Immutable-snapshot workflow for automatic formal WhatsApp notices and delivery evidence.';

COMMIT;

;
