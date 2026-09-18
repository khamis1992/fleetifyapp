-- Completes the cross-agent failure-containment layer: mutation budgets,
-- evidence version conflicts, stale OCR quarantine, direct legal-document
-- ownership, secure upload tokens and operational escalation.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $preflight$
BEGIN
  IF to_regclass('public.agent_safety_policies') IS NULL
     OR to_regclass('public.agent_safety_events') IS NULL
     OR to_regclass('public.missing_contract_pdf_requests') IS NULL
     OR to_regclass('public.contract_documents') IS NULL
     OR to_regclass('public.lawsuit_preparations') IS NULL
     OR to_regclass('public.taqadi_filing_jobs') IS NULL
     OR to_regprocedure('public.verify_scheduled_agent_invocation_v2(text,uuid,text,text)') IS NULL
     OR to_regprocedure('public.upsert_agent_operational_alert_task_v1(uuid,text,text,text,text,boolean)') IS NULL
     OR to_regprocedure('public.process_vehicle_depreciation_monthly(uuid,date)') IS NULL
  THEN
    RAISE EXCEPTION 'Agent safety kernel, legal evidence and operational alerts must exist';
  END IF;
END;
$preflight$;

ALTER TABLE public.agent_safety_policies
  ADD COLUMN max_mutations_per_run integer NOT NULL DEFAULT 100
    CHECK (max_mutations_per_run BETWEEN 0 AND 10000),
  ADD COLUMN max_findings_per_run integer NOT NULL DEFAULT 5000
    CHECK (max_findings_per_run BETWEEN 0 AND 100000),
  ADD COLUMN max_attempts integer NOT NULL DEFAULT 5
    CHECK (max_attempts BETWEEN 1 AND 20),
  ADD COLUMN requires_before_after boolean NOT NULL DEFAULT true,
  ADD COLUMN requires_postcondition boolean NOT NULL DEFAULT true,
  ADD COLUMN escalation_after interval NOT NULL DEFAULT interval '1 hour'
    CHECK (escalation_after BETWEEN interval '1 minute' AND interval '30 days'),
  ADD COLUMN data_classification text NOT NULL DEFAULT 'internal'
    CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  ADD COLUMN execution_ledger_enabled boolean NOT NULL DEFAULT false;

UPDATE public.agent_safety_policies
SET max_mutations_per_run = CASE agent_id
      WHEN 'system-audit-orchestrator' THEN 100
      WHEN 'generate-monthly-invoices' THEN 200
      WHEN 'historical-invoice-backfill' THEN 5000
      WHEN 'monthly-vehicle-depreciation' THEN 500
      WHEN 'payment-reminder-agent' THEN 200
      WHEN 'monthly-contract-invoice-reconciliation' THEN 100
      WHEN 'missing-contract-pdf-agent' THEN 50
      WHEN 'legal-notice-agent' THEN 50
      WHEN 'taqadi-filing-agent' THEN 1
      WHEN 'close-stale-system-audit-reviews' THEN 10000
      ELSE LEAST(max_mutations_per_run, 100)
    END,
    max_attempts = CASE agent_id
      WHEN 'taqadi-filing-agent' THEN 3
      WHEN 'legal-notice-agent' THEN 3
      WHEN 'missing-contract-pdf-agent' THEN 5
      ELSE max_attempts
    END,
    data_classification = CASE
      WHEN risk_level IN ('critical', 'high') THEN 'restricted'
      ELSE 'internal'
    END,
    updated_at = now();

UPDATE public.agent_safety_policies
SET execution_ledger_enabled = true, updated_at = now()
WHERE agent_id IN (
  'missing-contract-pdf-agent',
  'legal-notice-agent',
  'smart-contract-assigner',
  'monthly-vehicle-depreciation'
);

-- Move the remaining live financial/collection schedulers off shared legacy
-- secrets and align their runtime IDs with the safety-policy catalog.
DO $scheduled_identities$
DECLARE
  v_identity record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets secret
    WHERE secret.name = 'supabase_project_url'
      AND NULLIF(secret.decrypted_secret, '') IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets secret
    WHERE secret.name = 'supabase_anon_key'
      AND NULLIF(secret.decrypted_secret, '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Scheduled agent project URL and anon key must exist in Vault';
  END IF;

  FOR v_identity IN
    SELECT * FROM (VALUES
      ('system-audit-orchestrator', 'agent_secret_system_audit_orchestrator'),
      ('generate-monthly-invoices', 'agent_secret_generate_monthly_invoices'),
      ('monthly-vehicle-depreciation', 'agent_secret_monthly_vehicle_depreciation'),
      ('payment-reminder-agent', 'agent_secret_payment_reminders'),
      ('traffic-mail-ingest', 'agent_secret_traffic_mail_ingest')
    ) AS identity(agent_id, secret_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM vault.secrets secret WHERE secret.name = v_identity.secret_name
    ) THEN
      PERFORM vault.create_secret(
        pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
        v_identity.secret_name,
        'Dedicated governed identity for ' || v_identity.agent_id
      );
    END IF;

    INSERT INTO public.agent_invocation_registry (
      agent_id, vault_secret_name, allowed_company_id, enabled, updated_at
    ) VALUES (
      v_identity.agent_id,
      v_identity.secret_name,
      '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
      true,
      now()
    )
    ON CONFLICT (agent_id) DO UPDATE
    SET vault_secret_name = EXCLUDED.vault_secret_name,
        allowed_company_id = EXCLUDED.allowed_company_id,
        enabled = true,
        updated_at = now();
  END LOOP;
END;
$scheduled_identities$;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname IN (
  'generate-monthly-invoices',
  'monthly-vehicle-depreciation',
  'process-payment-reminders',
  'traffic-mail-ingest-v1',
  'whatsapp-reminder-day28-pre-due',
  'whatsapp-reminder-day2-overdue',
  'whatsapp-reminder-day5-final-warning',
  'whatsapp-reminder-day10-legal-action',
  'daily-fleet-report',
  'weekly-fleet-report'
);

-- The Graph credentials live in Edge secrets and cannot be verified from this
-- database migration. Install the governed invoker now, but leave its cron
-- paused until a manual status + sync canary succeeds.
CREATE OR REPLACE FUNCTION public.invoke_traffic_mail_ingest_v2()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1)
      || '/functions/v1/ingest-traffic-mail',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'x-agent-id', 'traffic-mail-ingest',
      'x-agent-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agent_secret_traffic_mail_ingest' LIMIT 1),
      'x-request-id', 'traffic-mail:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD-HH24-MI')
    ),
    body := jsonb_build_object(
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'action', 'sync'
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.invoke_traffic_mail_ingest_v2()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_traffic_mail_ingest_v2()
TO service_role;

SELECT cron.schedule(
  'generate-monthly-invoices',
  '0 2 28 * *',
  $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1)
      || '/functions/v1/generate-monthly-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'x-agent-id', 'generate-monthly-invoices',
      'x-agent-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agent_secret_generate_monthly_invoices' LIMIT 1),
      'x-request-id', 'invoice-generation:' || to_char(timezone('UTC', now()), 'YYYY-MM')
    ),
    body := jsonb_build_object(
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'batchSize', 200,
      'sendNotifications', true
    )
  );
  $command$
);

SELECT cron.schedule(
  'monthly-vehicle-depreciation',
  '15 2 1 * *',
  $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1)
      || '/functions/v1/monthly-vehicle-depreciation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'x-agent-id', 'monthly-vehicle-depreciation',
      'x-agent-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agent_secret_monthly_vehicle_depreciation' LIMIT 1),
      'x-request-id', 'vehicle-depreciation:' || to_char(timezone('UTC', now()), 'YYYY-MM')
    ),
    body := jsonb_build_object(
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'depreciationMonth', to_char(timezone('UTC', now()), 'YYYY-MM'),
      'maxVehicles', 500
    )
  );
  $command$
);

SELECT cron.schedule(
  'process-payment-reminders',
  '0 4 * * *',
  $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1)
      || '/functions/v1/process-payment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'x-agent-id', 'payment-reminder-agent',
      'x-agent-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agent_secret_payment_reminders' LIMIT 1),
      'x-request-id', 'payment-reminders:' || to_char(timezone('Asia/Riyadh', now()), 'YYYY-MM-DD')
    ),
    body := jsonb_build_object(
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'batchSize', 200,
      'processUpcoming', true,
      'processOverdue', true
    )
  );
  $command$
);

CREATE OR REPLACE FUNCTION public.invoke_system_audit_orchestrator_v3()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.functions.supabase.co/system-audit-orchestrator-v14',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-id', 'system-audit-orchestrator',
      'x-agent-secret', COALESCE((
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'agent_secret_system_audit_orchestrator' LIMIT 1
      ), ''),
      'x-request-id', 'system-audit:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD')
    ),
    body := jsonb_build_object(
      'mode', 'apply',
      'triggerSource', 'cron',
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'idempotencyKey', 'system-audit:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD')
        || ':24bc0b21-4e2d-4413-9842-31719a3669f4:apply:contracts,accounting,fleet,customers,inventory,legal,employees',
      'domains', jsonb_build_array('contracts','accounting','fleet','customers','inventory','legal','employees'),
      'batchSize', 100,
      'maxCompanies', 1,
      'includeAiTriage', true,
      'resumeStale', true,
      'waitForDispatch', false
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.invoke_system_audit_orchestrator_resume_v1()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.functions.supabase.co/system-audit-orchestrator-v14',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-id', 'system-audit-orchestrator',
      'x-agent-secret', COALESCE((
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'agent_secret_system_audit_orchestrator' LIMIT 1
      ), ''),
      'x-request-id', 'system-audit-resume:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD-HH24')
    ),
    body := jsonb_build_object(
      'mode', 'apply',
      'triggerSource', 'cron',
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'idempotencyKey', 'system-audit:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD')
        || ':24bc0b21-4e2d-4413-9842-31719a3669f4:apply:contracts,accounting,fleet,customers,inventory,legal,employees',
      'domains', jsonb_build_array('contracts','accounting','fleet','customers','inventory','legal','employees'),
      'resumeOnly', true,
      'resumeStale', true,
      'waitForDispatch', false
    )
  );
$function$;

-- Authenticated/manual and trusted service-role calls must obey the same
-- policy switch and conflict lease as scheduled calls. The Edge function owns
-- the hard-coded agent id; a user cannot select an arbitrary policy.
CREATE OR REPLACE FUNCTION public.begin_trusted_agent_invocation_v1(
  p_agent_id text,
  p_company_id uuid,
  p_request_id text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_policy public.agent_safety_policies%ROWTYPE;
  v_request_id text := NULLIF(pg_catalog.left(BTRIM(COALESCE(p_request_id, '')), 200), '');
  v_claimed boolean := false;
BEGIN
  IF p_company_id IS NULL OR v_request_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_policy
  FROM public.agent_safety_policies policy
  WHERE policy.agent_id = p_agent_id;

  -- There is no valid FK target for an unknown agent, so fail closed without
  -- fabricating an audit row under a different identity.
  IF v_policy.agent_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_actor_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = p_actor_id AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = p_actor_id
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    INSERT INTO public.agent_safety_events (
      company_id, agent_id, request_id, operation, outcome, reason_code, evidence
    ) VALUES (
      p_company_id, p_agent_id, v_request_id, 'trusted_invocation', 'blocked',
      'company_scope_denied', jsonb_build_object('source', 'authenticated_user')
    );
    RETURN false;
  END IF;

  IF NOT v_policy.enabled THEN
    INSERT INTO public.agent_safety_events (
      company_id, agent_id, request_id, operation, outcome, reason_code, evidence
    ) VALUES (
      p_company_id, p_agent_id, v_request_id, 'trusted_invocation', 'blocked',
      'policy_disabled',
      jsonb_build_object('source', CASE WHEN p_actor_id IS NULL THEN 'service_role' ELSE 'authenticated_user' END)
    );
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.agent_invocation_leases lease
    WHERE lease.company_id = p_company_id
      AND lease.conflict_group = v_policy.conflict_group
      AND lease.agent_id = p_agent_id
      AND lease.request_id = v_request_id
      AND lease.expires_at > now()
  ) THEN
    INSERT INTO public.agent_safety_events (
      company_id, agent_id, request_id, operation, outcome, reason_code, evidence
    ) VALUES (
      p_company_id, p_agent_id, v_request_id, 'trusted_invocation', 'duplicate',
      'same_request_already_claimed', '{}'::jsonb
    );
    -- A repeated active request is not a fresh authorization. Returning true
    -- here would let concurrent HTTP replays execute the same manual action.
    RETURN false;
  END IF;

  INSERT INTO public.agent_invocation_leases (
    company_id, conflict_group, agent_id, request_id, expires_at
  ) VALUES (
    p_company_id, v_policy.conflict_group, p_agent_id, v_request_id,
    now() + make_interval(secs => v_policy.max_runtime_seconds)
  )
  ON CONFLICT (company_id, conflict_group) DO UPDATE
  SET agent_id = EXCLUDED.agent_id,
      request_id = EXCLUDED.request_id,
      claimed_at = now(),
      expires_at = EXCLUDED.expires_at
  WHERE public.agent_invocation_leases.expires_at <= now()
  RETURNING true INTO v_claimed;

  INSERT INTO public.agent_safety_events (
    company_id, agent_id, request_id, operation, outcome, reason_code, evidence
  ) VALUES (
    p_company_id, p_agent_id, v_request_id, 'trusted_invocation',
    CASE WHEN v_claimed THEN 'allowed' ELSE 'busy' END,
    CASE WHEN v_claimed THEN 'policy_and_scope_valid' ELSE 'conflict_group_lease_active' END,
    jsonb_build_object('source', CASE WHEN p_actor_id IS NULL THEN 'service_role' ELSE 'authenticated_user' END)
  );

  RETURN v_claimed;
END;
$function$;

REVOKE ALL ON FUNCTION public.begin_trusted_agent_invocation_v1(text,uuid,text,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_trusted_agent_invocation_v1(text,uuid,text,uuid)
TO service_role;

-- Customer merging moves records across several business tables. Keep the
-- entire accepted proposal in one database transaction so a constraint error
-- cannot leave half the customer's records under each identity.
CREATE OR REPLACE FUNCTION public.apply_customer_merge_proposal_v1(
  p_company_id uuid,
  p_proposal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_proposal public.customer_merge_proposals%ROWTYPE;
  v_count integer;
  v_contracts integer := 0;
  v_invoices integer := 0;
  v_payments integer := 0;
  v_penalties integer := 0;
  v_communications integer := 0;
  v_legal_cases integer := 0;
BEGIN
  SELECT * INTO v_proposal
  FROM public.customer_merge_proposals proposal
  WHERE proposal.id = p_proposal_id
    AND proposal.company_id = p_company_id
    AND proposal.status = 'pending'
  FOR UPDATE;

  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_MERGE_PROPOSAL_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.customers customer
  WHERE customer.company_id = p_company_id
    AND customer.id IN (
      v_proposal.primary_customer_id,
      v_proposal.duplicate_customer_id
    )
    AND customer.merged_into_customer_id IS NULL;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'CUSTOMER_MERGE_PARTY_SCOPE_OR_STATE_INVALID' USING ERRCODE = '23514';
  END IF;

  PERFORM customer.id
  FROM public.customers customer
  WHERE customer.company_id = p_company_id
    AND customer.id IN (
      v_proposal.primary_customer_id,
      v_proposal.duplicate_customer_id
    )
  ORDER BY customer.id
  FOR UPDATE;

  UPDATE public.contracts
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_contracts = ROW_COUNT;

  UPDATE public.invoices
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_invoices = ROW_COUNT;

  UPDATE public.payments
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_payments = ROW_COUNT;

  UPDATE public.penalties
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_penalties = ROW_COUNT;

  UPDATE public.customer_communications
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_communications = ROW_COUNT;

  UPDATE public.legal_cases
  SET client_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND client_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_legal_cases = ROW_COUNT;

  UPDATE public.customers
  SET merged_into_customer_id = v_proposal.primary_customer_id,
      updated_at = now()
  WHERE id = v_proposal.duplicate_customer_id
    AND company_id = p_company_id
    AND merged_into_customer_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_MERGE_DUPLICATE_CHANGED_DURING_APPLY' USING ERRCODE = '40001';
  END IF;

  UPDATE public.customer_merge_proposals
  SET status = 'accepted', reviewed_at = now(), updated_at = now()
  WHERE id = v_proposal.id
    AND company_id = p_company_id
    AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_MERGE_PROPOSAL_CHANGED_DURING_APPLY' USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'merged', true,
    'primaryCustomerId', v_proposal.primary_customer_id,
    'duplicateCustomerId', v_proposal.duplicate_customer_id,
    'moved', jsonb_build_object(
      'contracts', v_contracts,
      'invoices', v_invoices,
      'payments', v_payments,
      'penalties', v_penalties,
      'customer_communications', v_communications,
      'legal_cases', v_legal_cases
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_customer_merge_proposal_v1(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_customer_merge_proposal_v1(uuid,uuid)
TO service_role;

-- Applying an OCR proposal can touch both customers and contracts. Validate
-- the proposal again under row locks and commit every field plus the proposal
-- status as one transaction; a stale value, invalid field, duplicate national
-- ID, or downstream constraint therefore leaves all business rows unchanged.
CREATE OR REPLACE FUNCTION public.apply_customer_id_scan_proposal_v1(
  p_company_id uuid,
  p_proposal_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_proposal public.customer_id_scan_proposals%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_change jsonb;
  v_field text;
  v_current text;
  v_proposed text;
  v_customer_updates jsonb := '{}'::jsonb;
  v_contract_updates jsonb := '{}'::jsonb;
  v_identity_change boolean := false;
  v_scanned_national_id text;
  v_seen_fields text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_proposal
  FROM public.customer_id_scan_proposals proposal
  WHERE proposal.id = p_proposal_id
    AND proposal.company_id = p_company_id
    AND proposal.status = 'pending'
  FOR UPDATE;

  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_typeof(v_proposal.proposed_changes) <> 'array'
     OR jsonb_array_length(v_proposal.proposed_changes) = 0 THEN
    RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_HAS_NO_CHANGES' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers customer
  WHERE customer.id = v_proposal.customer_id
    AND customer.company_id = p_company_id
    AND customer.merged_into_customer_id IS NULL
  FOR UPDATE;
  IF v_customer.id IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_CUSTOMER_SCOPE_INVALID' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_proposal.contract_id
    AND contract.customer_id = v_customer.id
    AND contract.company_id = p_company_id
  FOR UPDATE;
  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_CONTRACT_SCOPE_INVALID' USING ERRCODE = '23514';
  END IF;

  FOR v_change IN SELECT value FROM jsonb_array_elements(v_proposal.proposed_changes)
  LOOP
    IF jsonb_typeof(v_change) <> 'object' THEN
      RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_CHANGE_INVALID' USING ERRCODE = '23514';
    END IF;
    v_field := v_change ->> 'field';
    v_current := COALESCE(v_change ->> 'current_value', '');
    v_proposed := pg_catalog.btrim(COALESCE(v_change ->> 'proposed_value', ''));

    IF v_field NOT IN (
      'first_name_ar', 'last_name_ar', 'national_id', 'national_id_expiry',
      'nationality', 'date_of_birth', 'monthly_amount'
    ) THEN
      RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_FIELD_NOT_ALLOWED' USING ERRCODE = '23514';
    END IF;
    IF v_field = ANY(v_seen_fields) THEN
      RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_DUPLICATE_FIELD' USING ERRCODE = '23514';
    END IF;
    v_seen_fields := pg_catalog.array_append(v_seen_fields, v_field);
    IF (v_change ->> 'confidence') IS NULL
       OR (v_change ->> 'confidence')::numeric < 0.95
       OR (v_change ->> 'confidence')::numeric > 1 THEN
      RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_CONFIDENCE_TOO_LOW' USING ERRCODE = '23514';
    END IF;
    IF v_proposed = '' THEN
      RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_EMPTY_VALUE' USING ERRCODE = '23514';
    END IF;

    CASE v_field
      WHEN 'first_name_ar' THEN
        IF COALESCE(v_customer.first_name_ar, '') <> v_current THEN
          RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_STALE_CURRENT_VALUE' USING ERRCODE = '40001';
        END IF;
        v_customer_updates := v_customer_updates || jsonb_build_object(v_field, v_proposed);
        v_identity_change := true;
      WHEN 'last_name_ar' THEN
        IF COALESCE(v_customer.last_name_ar, '') <> v_current THEN
          RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_STALE_CURRENT_VALUE' USING ERRCODE = '40001';
        END IF;
        v_customer_updates := v_customer_updates || jsonb_build_object(v_field, v_proposed);
        v_identity_change := true;
      WHEN 'national_id' THEN
        IF COALESCE(v_customer.national_id, '') <> v_current
           OR v_proposed !~ '^[0-9]{11}$' THEN
          RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_NATIONAL_ID_INVALID_OR_STALE' USING ERRCODE = '23514';
        END IF;
        v_customer_updates := v_customer_updates || jsonb_build_object(v_field, v_proposed);
        v_identity_change := true;
      WHEN 'nationality' THEN
        IF COALESCE(v_customer.nationality, '') <> v_current THEN
          RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_STALE_CURRENT_VALUE' USING ERRCODE = '40001';
        END IF;
        v_customer_updates := v_customer_updates || jsonb_build_object(v_field, v_proposed);
      WHEN 'date_of_birth' THEN
        IF COALESCE(v_customer.date_of_birth::text, '') <> v_current
           OR v_proposed !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
           OR pg_catalog.to_char(pg_catalog.to_date(v_proposed, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_proposed
           OR v_proposed::date < DATE '1920-01-01'
           OR v_proposed::date > DATE '2015-12-31' THEN
          RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_BIRTH_DATE_INVALID_OR_STALE' USING ERRCODE = '23514';
        END IF;
        v_customer_updates := v_customer_updates || jsonb_build_object(v_field, v_proposed);
      WHEN 'national_id_expiry' THEN
        IF COALESCE(v_customer.national_id_expiry::text, '') <> v_current
           OR v_proposed !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
           OR pg_catalog.to_char(pg_catalog.to_date(v_proposed, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_proposed
           OR v_proposed::date < DATE '2010-01-01'
           OR v_proposed::date > DATE '2100-12-31' THEN
          RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_EXPIRY_INVALID_OR_STALE' USING ERRCODE = '23514';
        END IF;
        v_customer_updates := v_customer_updates || jsonb_build_object(v_field, v_proposed);
      WHEN 'monthly_amount' THEN
        IF v_proposed !~ '^[0-9]+([.][0-9]{1,2})?$'
           OR v_proposed::numeric < 100 OR v_proposed::numeric > 100000
           OR v_current !~ '^[0-9]+([.][0-9]+)?$'
           OR v_contract.monthly_amount IS DISTINCT FROM v_current::numeric THEN
          RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_MONTHLY_AMOUNT_INVALID_OR_STALE' USING ERRCODE = '23514';
        END IF;
        v_contract_updates := v_contract_updates || jsonb_build_object(v_field, v_proposed::numeric);
    END CASE;
  END LOOP;

  IF v_identity_change THEN
    v_scanned_national_id := v_proposal.extracted_data ->> 'nationalId';
    IF v_scanned_national_id IS NULL
       OR v_customer.national_id IS NULL
       OR v_scanned_national_id <> v_customer.national_id THEN
      RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_IDENTITY_NOT_CONFIRMED' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_customer_updates <> '{}'::jsonb THEN
    UPDATE public.customers
    SET first_name_ar = CASE WHEN v_customer_updates ? 'first_name_ar' THEN v_customer_updates ->> 'first_name_ar' ELSE first_name_ar END,
        first_name = CASE WHEN v_customer_updates ? 'first_name_ar' THEN v_customer_updates ->> 'first_name_ar' ELSE first_name END,
        last_name_ar = CASE WHEN v_customer_updates ? 'last_name_ar' THEN v_customer_updates ->> 'last_name_ar' ELSE last_name_ar END,
        last_name = CASE WHEN v_customer_updates ? 'last_name_ar' THEN v_customer_updates ->> 'last_name_ar' ELSE last_name END,
        national_id = CASE WHEN v_customer_updates ? 'national_id' THEN v_customer_updates ->> 'national_id' ELSE national_id END,
        national_id_expiry = CASE WHEN v_customer_updates ? 'national_id_expiry' THEN (v_customer_updates ->> 'national_id_expiry')::date ELSE national_id_expiry END,
        nationality = CASE WHEN v_customer_updates ? 'nationality' THEN v_customer_updates ->> 'nationality' ELSE nationality END,
        date_of_birth = CASE WHEN v_customer_updates ? 'date_of_birth' THEN (v_customer_updates ->> 'date_of_birth')::date ELSE date_of_birth END,
        updated_at = now()
    WHERE id = v_customer.id AND company_id = p_company_id;
  END IF;

  IF v_contract_updates <> '{}'::jsonb THEN
    UPDATE public.contracts
    SET monthly_amount = (v_contract_updates ->> 'monthly_amount')::numeric,
        updated_at = now()
    WHERE id = v_contract.id AND company_id = p_company_id;

    INSERT INTO public.contract_operations_log (
      contract_id, company_id, operation_type, operation_details, notes, performed_by
    ) VALUES (
      v_contract.id, p_company_id, 'contract_fields_updated_from_id_review',
      jsonb_build_object(
        'proposal_id', v_proposal.id,
        'auto_approved', true,
        'applied_fields', (SELECT jsonb_agg(change ->> 'field') FROM jsonb_array_elements(v_proposal.proposed_changes) change)
      ),
      'اعتمد الوكيل تلقائياً قيماً مؤكدة من مستند العقد (ثقة 95%+ وهوية متحققة)',
      NULL
    );
  END IF;

  UPDATE public.customer_id_scan_proposals
  SET status = 'accepted', reviewed_at = now(), updated_at = now()
  WHERE id = v_proposal.id AND company_id = p_company_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_ID_PROPOSAL_CHANGED_DURING_APPLY' USING ERRCODE = '40001';
  END IF;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_customer_id_scan_proposal_v1(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_customer_id_scan_proposal_v1(uuid,uuid)
TO service_role;

CREATE TABLE public.agent_execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id text NOT NULL REFERENCES public.agent_safety_policies(agent_id) ON DELETE RESTRICT,
  request_id text NOT NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'failed', 'blocked', 'timed_out')),
  mutation_count integer NOT NULL DEFAULT 0 CHECK (mutation_count >= 0),
  finding_count integer NOT NULL DEFAULT 0 CHECK (finding_count >= 0),
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
  started_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  failure_code text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (company_id, agent_id, request_id)
);

CREATE TABLE public.agent_execution_mutations (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.agent_execution_runs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id text NOT NULL REFERENCES public.agent_safety_policies(agent_id) ON DELETE RESTRICT,
  operation text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  idempotency_key text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  postcondition jsonb NOT NULL,
  verified boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, agent_id, idempotency_key),
  CHECK (before_state IS DISTINCT FROM after_state),
  CHECK (jsonb_typeof(postcondition) = 'object')
);

CREATE INDEX agent_execution_runs_active_idx
  ON public.agent_execution_runs(company_id, agent_id, started_at DESC)
  WHERE status = 'running';
CREATE INDEX agent_execution_mutations_run_idx
  ON public.agent_execution_mutations(run_id, created_at);

ALTER TABLE public.agent_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_mutations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_execution_runs, public.agent_execution_mutations
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agent_execution_runs TO service_role;
GRANT SELECT, INSERT ON TABLE public.agent_execution_mutations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.agent_execution_mutations_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.record_agent_mutation_v1(
  p_company_id uuid,
  p_agent_id text,
  p_request_id text,
  p_operation text,
  p_entity_type text,
  p_entity_id text,
  p_idempotency_key text,
  p_before_state jsonb,
  p_after_state jsonb,
  p_postcondition jsonb,
  p_verified boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_run public.agent_execution_runs%ROWTYPE;
  v_policy public.agent_safety_policies%ROWTYPE;
  v_mutation public.agent_execution_mutations%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(COALESCE(p_idempotency_key, '')), '') IS NULL
     OR NULLIF(BTRIM(COALESCE(p_entity_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'AGENT_MUTATION_IDENTITY_REQUIRED' USING ERRCODE = '23514';
  END IF;

  SELECT run.*
  INTO v_run
  FROM public.agent_execution_runs run
  JOIN public.agent_safety_policies policy ON policy.agent_id = run.agent_id
  WHERE run.company_id = p_company_id
    AND run.agent_id = p_agent_id
    AND run.request_id = p_request_id
    AND run.status = 'running'
    AND policy.enabled = true
  FOR UPDATE OF run;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'AGENT_EXECUTION_RUN_NOT_ACTIVE' USING ERRCODE = 'P0001';
  END IF;

  SELECT policy.*
  INTO STRICT v_policy
  FROM public.agent_safety_policies policy
  WHERE policy.agent_id = p_agent_id
    AND policy.enabled = true;

  IF v_run.mutation_count >= v_policy.max_mutations_per_run THEN
    UPDATE public.agent_execution_runs
    SET status = 'blocked', finished_at = now(), failure_code = 'mutation_budget_exhausted'
    WHERE id = v_run.id;
    DELETE FROM public.agent_invocation_leases lease
    WHERE lease.company_id = p_company_id
      AND lease.agent_id = p_agent_id
      AND lease.request_id = p_request_id;
    RETURN jsonb_build_object(
      'recorded', false,
      'blocked', true,
      'reason', 'AGENT_MUTATION_BUDGET_EXHAUSTED',
      'mutationCount', v_run.mutation_count,
      'remaining', 0
    );
  END IF;
  IF v_policy.requires_before_after
     AND (p_before_state IS NULL OR p_after_state IS NULL OR p_before_state = p_after_state) THEN
    RAISE EXCEPTION 'AGENT_BEFORE_AFTER_EVIDENCE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF v_policy.requires_postcondition
     AND (NOT COALESCE(p_verified, false) OR p_postcondition IS NULL OR p_postcondition = '{}'::jsonb) THEN
    RAISE EXCEPTION 'AGENT_POSTCONDITION_VERIFICATION_REQUIRED' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.agent_execution_mutations (
    run_id, company_id, agent_id, operation, entity_type, entity_id,
    idempotency_key, before_state, after_state, postcondition, verified
  ) VALUES (
    v_run.id, p_company_id, p_agent_id, p_operation, p_entity_type, p_entity_id,
    p_idempotency_key, p_before_state, p_after_state, p_postcondition, p_verified
  )
  ON CONFLICT (company_id, agent_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_mutation;

  IF v_mutation.id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'duplicate', true);
  END IF;

  UPDATE public.agent_execution_runs
  SET mutation_count = mutation_count + 1, heartbeat_at = now()
  WHERE id = v_run.id;

  RETURN jsonb_build_object(
    'recorded', true,
    'mutationId', v_mutation.id,
    'mutationCount', v_run.mutation_count + 1,
    'remaining', v_policy.max_mutations_per_run - v_run.mutation_count - 1
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_agent_mutation_v1(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb,boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_agent_mutation_v1(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb,boolean)
TO service_role;

CREATE OR REPLACE FUNCTION public.process_vehicle_depreciation_monthly_agent_v1(
  p_company_id uuid,
  p_depreciation_date date,
  p_request_id text,
  p_max_vehicles integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_period_start date := pg_catalog.date_trunc('month', p_depreciation_date)::date;
  v_current_period date := pg_catalog.date_trunc(
    'month', pg_catalog.timezone('Asia/Riyadh', now())
  )::date;
  v_eligible integer;
  v_existing_entry_ids uuid[] := ARRAY[]::uuid[];
  v_before_states jsonb := '{}'::jsonb;
  v_row record;
  v_before_accumulated numeric;
  v_created integer := 0;
  v_existing integer := 0;
  v_processed integer := 0;
  v_verified boolean;
  v_mutation jsonb;
BEGIN
  -- Execution is restricted by the explicit function ACL below; do not rely
  -- on a session-role helper inside a SECURITY DEFINER boundary.
  IF p_company_id IS NULL
     OR p_depreciation_date IS NULL
     OR NULLIF(pg_catalog.btrim(COALESCE(p_request_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'DEPRECIATION_AGENT_INPUT_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF p_depreciation_date <> v_period_start THEN
    RAISE EXCEPTION 'DEPRECIATION_DATE_MUST_BE_FIRST_OF_MONTH' USING ERRCODE = '23514';
  END IF;
  IF v_period_start > v_current_period THEN
    RAISE EXCEPTION 'FUTURE_DEPRECIATION_FORBIDDEN' USING ERRCODE = '23514';
  END IF;
  IF p_max_vehicles NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'DEPRECIATION_VEHICLE_LIMIT_INVALID' USING ERRCODE = '23514';
  END IF;

  -- Same lock key as the canonical posting RPC. This makes the snapshot,
  -- postings and execution evidence one transaction and one serial order.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_company_id::text || ':vehicle-depreciation:' || v_period_start,
      0
    )
  );

  SELECT count(*)::integer,
         COALESCE(
           jsonb_object_agg(
             vehicle.id::text,
             COALESCE(vehicle.accumulated_depreciation, 0)
           ),
           '{}'::jsonb
         )
  INTO v_eligible, v_before_states
  FROM public.vehicles vehicle
  WHERE vehicle.company_id = p_company_id
    AND COALESCE(vehicle.is_active, true)
    AND COALESCE(vehicle.purchase_cost, 0) > 0
    AND COALESCE(vehicle.depreciation_rate, 0) > 0;

  IF v_eligible > p_max_vehicles THEN
    RAISE EXCEPTION 'DEPRECIATION_VEHICLE_LIMIT_EXCEEDED:%', v_eligible
      USING ERRCODE = '54000';
  END IF;

  SELECT COALESCE(pg_catalog.array_agg(entry.id), ARRAY[]::uuid[])
  INTO v_existing_entry_ids
  FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id
    AND entry.reference_type = 'vehicle_depreciation'
    AND entry.entry_date >= v_period_start
    AND entry.entry_date < (v_period_start + interval '1 month')::date
    AND pg_catalog.lower(entry.status) <> 'reversed';

  FOR v_row IN
    SELECT *
    FROM public.process_vehicle_depreciation_monthly(
      p_company_id,
      p_depreciation_date
    )
  LOOP
    v_processed := v_processed + 1;
    IF v_row.journal_entry_id = ANY(v_existing_entry_ids) THEN
      v_existing := v_existing + 1;
      CONTINUE;
    END IF;

    v_before_accumulated := COALESCE(
      (v_before_states ->> v_row.vehicle_id::text)::numeric,
      0
    );
    SELECT EXISTS (
      SELECT 1
      FROM public.journal_entries entry
      JOIN public.vehicles vehicle
        ON vehicle.id = v_row.vehicle_id
       AND vehicle.company_id = p_company_id
      WHERE entry.id = v_row.journal_entry_id
        AND entry.company_id = p_company_id
        AND entry.reference_type = 'vehicle_depreciation'
        AND entry.reference_id = v_row.vehicle_id
        AND pg_catalog.lower(entry.status) = 'posted'
        AND pg_catalog.abs(COALESCE(entry.total_debit, 0) - COALESCE(entry.total_credit, 0)) <= 0.01
        AND COALESCE(vehicle.accumulated_depreciation, 0) = v_row.accumulated_depreciation
        AND (
          SELECT count(*)
          FROM public.journal_entry_lines line
          WHERE line.journal_entry_id = entry.id
        ) >= 2
    ) INTO v_verified;
    IF NOT COALESCE(v_verified, false) THEN
      RAISE EXCEPTION 'DEPRECIATION_POSTCONDITION_FAILED:%', v_row.vehicle_id
        USING ERRCODE = 'P0001';
    END IF;

    v_mutation := public.record_agent_mutation_v1(
      p_company_id,
      'monthly-vehicle-depreciation',
      p_request_id,
      'post_monthly_vehicle_depreciation',
      'vehicles',
      v_row.vehicle_id::text,
      'vehicle-depreciation:' || v_row.vehicle_id::text || ':' || to_char(v_period_start, 'YYYY-MM'),
      jsonb_build_object(
        'accumulatedDepreciation', v_before_accumulated,
        'journalEntryId', NULL
      ),
      jsonb_build_object(
        'accumulatedDepreciation', v_row.accumulated_depreciation,
        'journalEntryId', v_row.journal_entry_id
      ),
      jsonb_build_object(
        'balanced', true,
        'posted', true,
        'lineCountAtLeastTwo', true,
        'period', to_char(v_period_start, 'YYYY-MM')
      ),
      true
    );
    IF COALESCE((v_mutation ->> 'blocked')::boolean, false) THEN
      RAISE EXCEPTION 'AGENT_MUTATION_BUDGET_EXHAUSTED' USING ERRCODE = '54000';
    END IF;
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'period', v_period_start,
    'eligibleVehicles', v_eligible,
    'processed', v_processed,
    'created', v_created,
    'existing', v_existing
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.process_vehicle_depreciation_monthly_agent_v1(uuid,date,text,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_vehicle_depreciation_monthly_agent_v1(uuid,date,text,integer)
TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_user_account_creation_v1(
  p_employee_id uuid,
  p_company_id uuid,
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_first_name_ar text,
  p_last_name_ar text,
  p_roles text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_is_super_admin boolean;
  v_is_company_admin boolean;
  v_employee public.employees%ROWTYPE;
  v_existing_profile public.profiles%ROWTYPE;
  v_role text;
  v_distinct_role_count integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_employee_id IS NULL OR p_company_id IS NULL OR p_user_id IS NULL
     OR NULLIF(pg_catalog.btrim(COALESCE(p_email, '')), '') IS NULL
     OR NULLIF(pg_catalog.btrim(COALESCE(p_first_name, '')), '') IS NULL
     OR NULLIF(pg_catalog.btrim(COALESCE(p_last_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'ACCOUNT_CREATION_INPUT_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF COALESCE(pg_catalog.array_length(p_roles, 1), 0) NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'ACCOUNT_ROLE_COUNT_INVALID' USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles role
    WHERE role.user_id = v_actor_id AND role.role::text = 'super_admin'
  ) INTO v_is_super_admin;
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles role
    JOIN public.profiles profile ON profile.user_id = v_actor_id
    WHERE role.user_id = v_actor_id
      AND role.company_id = p_company_id
      AND role.role::text = 'company_admin'
      AND profile.company_id = p_company_id
      AND profile.is_active IS TRUE
  ) INTO v_is_company_admin;
  IF NOT v_is_super_admin AND NOT v_is_company_admin THEN
    RAISE EXCEPTION 'PRIVILEGED_COMPANY_ACCESS_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT count(DISTINCT pg_catalog.btrim(role_name))::integer
  INTO v_distinct_role_count
  FROM pg_catalog.unnest(p_roles) role_name
  WHERE NULLIF(pg_catalog.btrim(role_name), '') IS NOT NULL;
  IF v_distinct_role_count <> pg_catalog.array_length(p_roles, 1) THEN
    RAISE EXCEPTION 'ACCOUNT_ROLES_MUST_BE_UNIQUE_AND_NONEMPTY' USING ERRCODE = '23514';
  END IF;
  IF NOT v_is_super_admin AND EXISTS (
    SELECT 1 FROM pg_catalog.unnest(p_roles) role_name
    WHERE pg_catalog.btrim(role_name) IN ('super_admin', 'company_admin')
  ) THEN
    RAISE EXCEPTION 'ADMIN_ROLE_GRANT_REQUIRES_SUPER_ADMIN' USING ERRCODE = '42501';
  END IF;

  -- Casting every requested role before any mutation rejects invented values.
  PERFORM pg_catalog.btrim(role_name)::public.user_role
  FROM pg_catalog.unnest(p_roles) role_name;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users auth_user
    WHERE auth_user.id = p_user_id
      AND pg_catalog.lower(auth_user.email) = pg_catalog.lower(pg_catalog.btrim(p_email))
  ) THEN
    RAISE EXCEPTION 'AUTH_USER_EMAIL_MISMATCH' USING ERRCODE = '23503';
  END IF;

  SELECT * INTO v_employee
  FROM public.employees employee
  WHERE employee.id = p_employee_id
    AND employee.company_id = p_company_id
  FOR UPDATE;
  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND_IN_COMPANY' USING ERRCODE = '23503';
  END IF;
  IF v_employee.user_id IS NOT NULL AND v_employee.user_id <> p_user_id THEN
    RAISE EXCEPTION 'EMPLOYEE_ALREADY_LINKED_TO_ANOTHER_USER' USING ERRCODE = '23505';
  END IF;
  IF NULLIF(pg_catalog.btrim(COALESCE(v_employee.email, '')), '') IS NOT NULL
     AND pg_catalog.lower(pg_catalog.btrim(v_employee.email)) <>
         pg_catalog.lower(pg_catalog.btrim(p_email)) THEN
    RAISE EXCEPTION 'EMPLOYEE_EMAIL_MISMATCH' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_existing_profile
  FROM public.profiles profile
  WHERE profile.user_id = p_user_id
  FOR UPDATE;
  IF v_existing_profile.id IS NOT NULL
     AND v_existing_profile.company_id IS NOT NULL
     AND v_existing_profile.company_id <> p_company_id THEN
    RAISE EXCEPTION 'ACCOUNT_REQUIRES_AUDITED_COMPANY_TRANSFER' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.profiles (
    user_id, company_id, email, first_name, last_name,
    first_name_ar, last_name_ar, is_active, updated_at
  ) VALUES (
    p_user_id, p_company_id, pg_catalog.lower(pg_catalog.btrim(p_email)),
    pg_catalog.btrim(p_first_name), pg_catalog.btrim(p_last_name),
    pg_catalog.btrim(p_first_name_ar), pg_catalog.btrim(p_last_name_ar),
    true, now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET company_id = EXCLUDED.company_id,
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      first_name_ar = EXCLUDED.first_name_ar,
      last_name_ar = EXCLUDED.last_name_ar,
      is_active = true,
      updated_at = now();

  UPDATE public.employees employee
  SET user_id = p_user_id,
      has_system_access = true,
      account_status = 'active',
      updated_at = now()
  WHERE employee.id = p_employee_id
    AND employee.company_id = p_company_id
    AND (employee.user_id IS NULL OR employee.user_id = p_user_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EMPLOYEE_LINK_CONFLICT' USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.user_roles role
  WHERE role.user_id = p_user_id
    AND (
      role.company_id = p_company_id
      OR (v_is_super_admin AND role.role::text = 'super_admin')
    );
  FOR v_role IN
    SELECT pg_catalog.btrim(role_name)
    FROM pg_catalog.unnest(p_roles) role_name
    ORDER BY 1
  LOOP
    INSERT INTO public.user_roles (
      user_id, role, company_id, granted_by, granted_at
    ) VALUES (
      p_user_id,
      v_role::public.user_role,
      CASE WHEN v_role = 'super_admin' THEN NULL ELSE p_company_id END,
      v_actor_id,
      now()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'userId', p_user_id,
    'employeeId', p_employee_id,
    'companyId', p_company_id,
    'roleCount', v_distinct_role_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_user_account_creation_v1(uuid,uuid,uuid,text,text,text,text,text,text[])
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_user_account_creation_v1(uuid,uuid,uuid,text,text,text,text,text,text[])
TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_user_to_company(
  p_user_id uuid,
  p_from_company_id uuid,
  p_to_company_id uuid,
  p_new_roles text[],
  p_transfer_reason text DEFAULT NULL,
  p_data_handling_strategy jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_transfer_log_id uuid;
  v_old_roles text[] := ARRAY[]::text[];
  v_role text;
  v_strategy_value text;
BEGIN
  IF v_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles role
    WHERE role.user_id = v_actor_id AND role.role::text = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_from_company_id IS NULL OR p_to_company_id IS NULL
     OR p_from_company_id = p_to_company_id
     OR COALESCE(pg_catalog.array_length(p_new_roles, 1), 0) NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'USER_TRANSFER_INPUT_INVALID' USING ERRCODE = '23514';
  END IF;
  IF p_user_id = v_actor_id THEN
    RAISE EXCEPTION 'SUPER_ADMIN_SELF_TRANSFER_FORBIDDEN' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles role
    WHERE role.user_id = p_user_id AND role.role::text = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.unnest(p_new_roles) role_name
    WHERE pg_catalog.btrim(role_name) = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_ACCOUNTS_USE_DEDICATED_ROLE_MANAGEMENT' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_catalog.btrim(role_name)::public.user_role
  FROM pg_catalog.unnest(p_new_roles) role_name;
  IF (
    SELECT count(DISTINCT pg_catalog.btrim(role_name))
    FROM pg_catalog.unnest(p_new_roles) role_name
  ) <> pg_catalog.array_length(p_new_roles, 1) THEN
    RAISE EXCEPTION 'TRANSFER_ROLES_MUST_BE_UNIQUE' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies company WHERE company.id = p_to_company_id) THEN
    RAISE EXCEPTION 'TARGET_COMPANY_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  -- Business records are never moved or copied by an identity transfer. The UI
  -- may send legacy choices, but only the explicit safe "keep" value is valid.
  FOR v_strategy_value IN
    SELECT value FROM jsonb_each_text(COALESCE(p_data_handling_strategy, '{}'::jsonb))
  LOOP
    IF v_strategy_value <> 'keep' THEN
      RAISE EXCEPTION 'BUSINESS_DATA_TRANSFER_NOT_IMPLEMENTED_USE_KEEP'
        USING ERRCODE = '0A000';
    END IF;
  END LOOP;

  SELECT * INTO v_profile
  FROM public.profiles profile
  WHERE profile.user_id = p_user_id
    AND profile.company_id = p_from_company_id
  FOR UPDATE;
  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'USER_PROFILE_NOT_FOUND_IN_SOURCE_COMPANY' USING ERRCODE = '23503';
  END IF;

  SELECT COALESCE(pg_catalog.array_agg(role.role::text ORDER BY role.role::text), ARRAY[]::text[])
  INTO v_old_roles
  FROM public.user_roles role
  WHERE role.user_id = p_user_id;

  UPDATE public.profiles profile
  SET company_id = p_to_company_id, updated_at = now()
  WHERE profile.user_id = p_user_id
    AND profile.company_id = p_from_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_TRANSFER_PROFILE_CONFLICT' USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.user_roles role WHERE role.user_id = p_user_id;
  FOR v_role IN
    SELECT pg_catalog.btrim(role_name)
    FROM pg_catalog.unnest(p_new_roles) role_name
    ORDER BY 1
  LOOP
    INSERT INTO public.user_roles (
      user_id, role, company_id, granted_by, granted_at
    ) VALUES (
      p_user_id, v_role::public.user_role, p_to_company_id, v_actor_id, now()
    );
  END LOOP;

  INSERT INTO public.user_transfer_logs (
    user_id, from_company_id, to_company_id, transferred_by,
    completed_at, status, transfer_reason,
    data_handling_strategy, old_roles, new_roles
  ) VALUES (
    p_user_id, p_from_company_id, p_to_company_id, v_actor_id,
    now(), 'completed', NULLIF(pg_catalog.btrim(COALESCE(p_transfer_reason, '')), ''),
    COALESCE(p_data_handling_strategy, '{}'::jsonb), v_old_roles, p_new_roles
  ) RETURNING id INTO v_transfer_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'transferLogId', v_transfer_log_id,
    'transfer_log_id', v_transfer_log_id,
    'businessDataMoved', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.transfer_user_to_company(uuid,uuid,uuid,text[],text,jsonb)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_user_to_company(uuid,uuid,uuid,text[],text,jsonb)
TO authenticated;

CREATE OR REPLACE FUNCTION public.finish_agent_execution_v1(
  p_company_id uuid,
  p_agent_id text,
  p_request_id text,
  p_success boolean,
  p_summary jsonb DEFAULT '{}'::jsonb,
  p_failure_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_run public.agent_execution_runs%ROWTYPE;
BEGIN
  UPDATE public.agent_execution_runs
  SET status = CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,
      summary = COALESCE(p_summary, '{}'::jsonb),
      failure_code = CASE WHEN p_success THEN NULL ELSE COALESCE(NULLIF(p_failure_code, ''), 'agent_failed') END,
      heartbeat_at = now(),
      finished_at = now()
  WHERE company_id = p_company_id
    AND agent_id = p_agent_id
    AND request_id = p_request_id
    AND status = 'running'
  RETURNING * INTO v_run;
  -- Release the exact lease even when this policy does not use the detailed
  -- execution ledger. This avoids successful review/proposal agents remaining
  -- artificially busy until max_runtime_seconds expires.
  DELETE FROM public.agent_invocation_leases lease
  USING public.agent_safety_policies policy
  WHERE policy.agent_id = p_agent_id
    AND lease.company_id = p_company_id
    AND lease.conflict_group = policy.conflict_group
    AND lease.agent_id = p_agent_id
    AND lease.request_id = p_request_id;
  RETURN COALESCE(to_jsonb(v_run), jsonb_build_object('status', 'already_terminal'));
END;
$function$;

REVOKE ALL ON FUNCTION public.finish_agent_execution_v1(uuid,text,text,boolean,jsonb,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_agent_execution_v1(uuid,text,text,boolean,jsonb,text)
TO service_role;

CREATE OR REPLACE FUNCTION public.timeout_stale_agent_executions_v1(
  p_company_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_run record;
  v_timed_out integer := 0;
BEGIN
  FOR v_run IN
    SELECT run.id, run.agent_id, run.request_id, run.heartbeat_at
    FROM public.agent_execution_runs run
    JOIN public.agent_safety_policies policy ON policy.agent_id = run.agent_id
    WHERE run.company_id = p_company_id
      AND run.status = 'running'
      AND run.heartbeat_at <= now()
        - pg_catalog.make_interval(secs => policy.max_runtime_seconds + 300)
    ORDER BY run.heartbeat_at, run.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    FOR UPDATE OF run SKIP LOCKED
  LOOP
    UPDATE public.agent_execution_runs
    SET status = 'timed_out',
        failure_code = 'execution_heartbeat_expired',
        finished_at = now(),
        summary = summary || jsonb_build_object(
          'timedOutAt', now(),
          'lastHeartbeatAt', v_run.heartbeat_at
        )
    WHERE id = v_run.id;
    DELETE FROM public.agent_invocation_leases lease
    USING public.agent_safety_policies policy
    WHERE policy.agent_id = v_run.agent_id
      AND lease.company_id = p_company_id
      AND lease.conflict_group = policy.conflict_group
      AND lease.agent_id = v_run.agent_id
      AND lease.request_id = v_run.request_id;
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'agent-execution-timeout:' || v_run.agent_id || ':' || v_run.request_id,
      'توقف تشغيل الوكيل ' || v_run.agent_id,
      'لم يغلق الوكيل تشغيله ولم يرسل heartbeat ضمن مهلة السياسة. راجع السجل قبل إعادة التشغيل.',
      'high',
      true
    );
    v_timed_out := v_timed_out + 1;
  END LOOP;
  RETURN jsonb_build_object('timedOut', v_timed_out);
END;
$function$;

REVOKE ALL ON FUNCTION public.timeout_stale_agent_executions_v1(uuid,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.timeout_stale_agent_executions_v1(uuid,integer)
TO service_role;

-- Every accepted scheduled invocation receives a durable execution identity.
CREATE OR REPLACE FUNCTION public.guard_agent_execution_run_from_safety_event_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.operation IN ('scheduled_invocation', 'trusted_invocation')
     AND NEW.outcome = 'allowed'
     AND NEW.company_id IS NOT NULL AND NEW.request_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.agent_safety_policies policy
       WHERE policy.agent_id = NEW.agent_id
         AND policy.execution_ledger_enabled = true
     ) THEN
    INSERT INTO public.agent_execution_runs (company_id, agent_id, request_id)
    VALUES (NEW.company_id, NEW.agent_id, NEW.request_id)
    ON CONFLICT (company_id, agent_id, request_id) DO UPDATE
    SET attempt_count = public.agent_execution_runs.attempt_count + 1,
        heartbeat_at = now()
    WHERE public.agent_execution_runs.status = 'running';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_agent_execution_run_from_safety_event
AFTER INSERT ON public.agent_safety_events
FOR EACH ROW EXECUTE FUNCTION public.guard_agent_execution_run_from_safety_event_v1();

REVOKE ALL ON FUNCTION public.guard_agent_execution_run_from_safety_event_v1()
FROM PUBLIC, anon, authenticated;

-- System-audit repairs already carry run/job/finding and before/after state.
-- Enforce the central mutation budget at the database boundary as well.
CREATE OR REPLACE FUNCTION public.guard_system_agent_repair_budget_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  SELECT policy.max_mutations_per_run INTO v_limit
  FROM public.agent_safety_policies policy
  WHERE policy.agent_id = 'system-audit-orchestrator' AND policy.enabled = true;
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'SYSTEM_AUDIT_SAFETY_POLICY_DISABLED' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.before_state IS NULL OR NEW.after_state IS NULL
     OR NEW.before_state = NEW.after_state THEN
    RAISE EXCEPTION 'SYSTEM_AGENT_REPAIR_REQUIRES_DISTINCT_BEFORE_AFTER' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.run_id::text, 918272)
  );
  SELECT count(*) INTO v_count
  FROM public.system_agent_repairs repair
  WHERE repair.run_id = NEW.run_id AND repair.status = 'applied';
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'SYSTEM_AGENT_REPAIR_MUTATION_BUDGET_EXHAUSTED' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_system_agent_repair_budget
BEFORE INSERT ON public.system_agent_repairs
FOR EACH ROW EXECUTE FUNCTION public.guard_system_agent_repair_budget_v1();

REVOKE ALL ON FUNCTION public.guard_system_agent_repair_budget_v1()
FROM PUBLIC, anon, authenticated;

-- Findings are useful only while operators can consume them. Serialize each
-- run's inserts and stop a runaway rule at the configured ceiling instead of
-- allowing another six-figure alert flood.
CREATE OR REPLACE FUNCTION public.guard_system_agent_finding_budget_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  SELECT policy.max_findings_per_run INTO v_limit
  FROM public.agent_safety_policies policy
  WHERE policy.agent_id = 'system-audit-orchestrator' AND policy.enabled = true;
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'SYSTEM_AUDIT_SAFETY_POLICY_DISABLED' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.run_id::text, 918273)
  );
  SELECT count(*) INTO v_count
  FROM public.system_agent_findings finding
  WHERE finding.run_id = NEW.run_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'SYSTEM_AGENT_FINDING_BUDGET_EXHAUSTED'
      USING ERRCODE = '54000',
            DETAIL = 'Run finding cap reached; the worker will fail and the operational alert bridge will escalate it.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_system_agent_finding_budget
BEFORE INSERT ON public.system_agent_findings
FOR EACH ROW EXECUTE FUNCTION public.guard_system_agent_finding_budget_v1();

REVOKE ALL ON FUNCTION public.guard_system_agent_finding_budget_v1()
FROM PUBLIC, anon, authenticated;

-- Signed-contract evidence lifecycle and OCR quality containment.
ALTER TABLE public.contract_documents
  DROP CONSTRAINT IF EXISTS contract_documents_legal_identity_match_status_check;
ALTER TABLE public.contract_documents
  ADD CONSTRAINT contract_documents_legal_identity_match_status_check CHECK (
    legal_identity_match_status IN (
      'pending', 'matched', 'mismatch', 'unverified', 'expired_unverified', 'failed'
    )
  );
ALTER TABLE public.contract_documents
  ADD COLUMN legal_identity_expires_at timestamptz,
  ADD COLUMN legal_evidence_state text NOT NULL DEFAULT 'active'
    CHECK (legal_evidence_state IN ('active', 'superseded', 'quarantined')),
  ADD COLUMN superseded_by_document_id uuid REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  ADD COLUMN ocr_quality_score numeric CHECK (ocr_quality_score IS NULL OR ocr_quality_score BETWEEN 0 AND 1),
  ADD COLUMN ocr_review_reason text;

CREATE INDEX contract_documents_identity_expiry_idx
  ON public.contract_documents(company_id, legal_identity_expires_at)
  WHERE document_type IN ('signed_contract', 'signed_contract_image')
    AND legal_identity_match_status IN ('pending', 'unverified');
CREATE INDEX contract_documents_active_legal_evidence_idx
  ON public.contract_documents(company_id, contract_id, created_at DESC)
  WHERE document_type IN ('signed_contract', 'signed_contract_image')
    AND legal_evidence_state = 'active';
CREATE UNIQUE INDEX contract_documents_company_contract_id_key
  ON public.contract_documents(company_id, contract_id, id);

CREATE OR REPLACE FUNCTION public.guard_contract_document_lifecycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_successor public.contract_documents%ROWTYPE;
BEGIN
  IF NEW.document_type NOT IN ('signed_contract', 'signed_contract_image') THEN
    RETURN NEW;
  END IF;
  IF NEW.legal_identity_match_status IN ('pending', 'unverified') THEN
    NEW.legal_identity_expires_at := COALESCE(
      NEW.legal_identity_expires_at,
      NEW.created_at,
      now()
    ) + interval '24 hours';
  ELSE
    NEW.legal_identity_expires_at := NULL;
  END IF;
  IF NEW.legal_identity_match_status = 'matched'
     AND COALESCE(NEW.ocr_quality_score, 1) < 0.70
     AND NULLIF(pg_catalog.regexp_replace(COALESCE(NEW.legal_identity_extracted_id, ''), '[^0-9]', '', 'g'), '') IS NULL THEN
    RAISE EXCEPTION 'LOW_OCR_QUALITY_REQUIRES_EXACT_ID_EVIDENCE' USING ERRCODE = '23514';
  END IF;
  IF NEW.legal_evidence_state = 'active' AND NEW.superseded_by_document_id IS NOT NULL THEN
    RAISE EXCEPTION 'ACTIVE_EVIDENCE_CANNOT_HAVE_SUCCESSOR' USING ERRCODE = '23514';
  END IF;
  IF NEW.legal_evidence_state = 'superseded' THEN
    IF NEW.superseded_by_document_id IS NULL THEN
      RAISE EXCEPTION 'SUPERSEDED_EVIDENCE_REQUIRES_SUCCESSOR' USING ERRCODE = '23514';
    END IF;
    SELECT document.* INTO v_successor
    FROM public.contract_documents document
    WHERE document.id = NEW.superseded_by_document_id
      AND document.company_id = NEW.company_id
      AND document.contract_id = NEW.contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active';
    IF v_successor.id IS NULL OR v_successor.id = NEW.id THEN
      RAISE EXCEPTION 'SUPERSEDED_EVIDENCE_SUCCESSOR_INVALID' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.legal_evidence_state = 'quarantined'
     AND NULLIF(BTRIM(COALESCE(NEW.ocr_review_reason, NEW.legal_identity_match_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'QUARANTINED_EVIDENCE_REQUIRES_REASON' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_contract_document_lifecycle
BEFORE INSERT OR UPDATE OF document_type, legal_identity_match_status,
  legal_identity_expires_at, legal_evidence_state, superseded_by_document_id,
  ocr_quality_score, ocr_review_reason
ON public.contract_documents
FOR EACH ROW EXECUTE FUNCTION public.guard_contract_document_lifecycle_v1();

REVOKE ALL ON FUNCTION public.guard_contract_document_lifecycle_v1()
FROM PUBLIC, anon, authenticated;

-- Prevent replacement or deletion of the storage bytes behind an already
-- identity-matched signed-contract row. A replacement must use a new path and
-- a new row so it receives its own verification lifecycle.
DROP POLICY IF EXISTS "Users can update contract documents in their company"
ON storage.objects;
CREATE POLICY "Users can update contract documents in their company"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    JOIN public.contracts contract ON contract.id = document.contract_id
    WHERE document.file_path = storage.objects.name
      AND contract.company_id = public.get_user_company(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_documents evidence
    WHERE evidence.file_path = storage.objects.name
      AND evidence.document_type IN ('signed_contract', 'signed_contract_image')
      AND evidence.legal_identity_match_status = 'matched'
  )
)
WITH CHECK (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    JOIN public.contracts contract ON contract.id = document.contract_id
    WHERE document.file_path = storage.objects.name
      AND contract.company_id = public.get_user_company(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_documents evidence
    WHERE evidence.file_path = storage.objects.name
      AND evidence.document_type IN ('signed_contract', 'signed_contract_image')
      AND evidence.legal_identity_match_status = 'matched'
  )
);

DROP POLICY IF EXISTS "Users can delete contract documents in their company"
ON storage.objects;
CREATE POLICY "Users can delete contract documents in their company"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    JOIN public.contracts contract ON contract.id = document.contract_id
    WHERE document.file_path = storage.objects.name
      AND contract.company_id = public.get_user_company(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_documents evidence
    WHERE evidence.file_path = storage.objects.name
      AND evidence.document_type IN ('signed_contract', 'signed_contract_image')
      AND evidence.legal_identity_match_status = 'matched'
  )
);

UPDATE public.contract_documents
SET legal_identity_expires_at = COALESCE(created_at, now()) + interval '24 hours'
WHERE document_type IN ('signed_contract', 'signed_contract_image')
  AND legal_identity_match_status IN ('pending', 'unverified')
  AND legal_identity_expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.expire_unverified_signed_contracts_v1(
  p_company_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_document record;
  v_expired integer := 0;
BEGIN
  FOR v_document IN
    SELECT document.id, document.contract_id
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status IN ('pending', 'unverified')
      AND document.legal_identity_expires_at <= now()
    ORDER BY document.legal_identity_expires_at, document.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.contract_documents
    SET legal_identity_match_status = 'expired_unverified',
        legal_evidence_state = 'quarantined',
        ocr_review_reason = COALESCE(
          NULLIF(ocr_review_reason, ''),
          'Identity verification did not complete within 24 hours'
        ),
        legal_identity_match_reason = COALESCE(
          NULLIF(legal_identity_match_reason, ''),
          'Identity verification expired after 24 hours'
        ),
        legal_identity_checked_at = COALESCE(legal_identity_checked_at, now()),
        updated_at = now()
    WHERE id = v_document.id;
    PERFORM public.enqueue_missing_contract_pdf_request_v1(
      p_company_id, v_document.contract_id, 'identity_mismatch', NULL
    );
    v_expired := v_expired + 1;
  END LOOP;
  RETURN jsonb_build_object('expired', v_expired);
END;
$function$;

REVOKE ALL ON FUNCTION public.expire_unverified_signed_contracts_v1(uuid,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_unverified_signed_contracts_v1(uuid,integer)
TO service_role;

-- Multiple active matched copies are explicitly ambiguous. Legal filing must
-- stop until older evidence is marked superseded.
CREATE OR REPLACE FUNCTION public.get_direct_signed_contract_evidence_state_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'ready', count(*) FILTER (
      WHERE document.legal_identity_match_status = 'matched'
        AND document.legal_evidence_state = 'active'
    ) = 1,
    'activeMatchedCount', count(*) FILTER (
      WHERE document.legal_identity_match_status = 'matched'
        AND document.legal_evidence_state = 'active'
    ),
    'pendingCount', count(*) FILTER (
      WHERE document.legal_identity_match_status IN ('pending', 'unverified')
        AND document.legal_evidence_state = 'active'
    ),
    'quarantinedCount', count(*) FILTER (
      WHERE document.legal_evidence_state = 'quarantined'
    ),
    'documentId', (array_agg(document.id ORDER BY document.created_at DESC, document.id) FILTER (
      WHERE document.legal_identity_match_status = 'matched'
        AND document.legal_evidence_state = 'active'
    ))[1],
    'reason', CASE
      WHEN count(*) FILTER (
        WHERE document.legal_identity_match_status = 'matched'
          AND document.legal_evidence_state = 'active'
      ) = 1 THEN 'one_direct_active_identity_matched_document'
      WHEN count(*) FILTER (
        WHERE document.legal_identity_match_status = 'matched'
          AND document.legal_evidence_state = 'active'
      ) > 1 THEN 'ambiguous_multiple_active_matched_documents'
      ELSE 'missing_active_identity_matched_document'
    END
  )
  FROM public.contract_documents document
  WHERE document.company_id = p_company_id
    AND document.contract_id = p_contract_id
    AND document.document_type IN ('signed_contract', 'signed_contract_image')
    AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.get_direct_signed_contract_evidence_state_v1(uuid,uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_direct_signed_contract_evidence_state_v1(uuid,uuid)
TO authenticated, service_role;

ALTER FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid)
  RENAME TO get_legal_transfer_readiness_v1_pre_failure_containment;

CREATE FUNCTION public.get_legal_transfer_readiness_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_evidence jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = auth.uid() AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = auth.uid()
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RAISE EXCEPTION 'COMPANY_SCOPE_DENIED' USING ERRCODE = '42501';
  END IF;
  v_result := public.get_legal_transfer_readiness_v1_pre_failure_containment(
    p_company_id, p_contract_id
  );
  v_evidence := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id, p_contract_id
  );
  IF COALESCE((v_evidence ->> 'activeMatchedCount')::integer, 0) > 1 THEN
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'ambiguous-contract-evidence:' || p_contract_id::text,
      'تعارض نسخ العقد الموقعة',
      'يوجد أكثر من مستند عقد موقّع مطابق وفعال. يجب تحديد النسخة الحالية ووضع النسخ الأقدم كمنسوخة superseded قبل رفع الدعوى.',
      'high',
      true
    );
  ELSE
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'ambiguous-contract-evidence:' || p_contract_id::text,
      'تعارض نسخ العقد الموقعة',
      'لا يوجد تعارض حالي في نسخة العقد.',
      'low',
      false
    );
  END IF;
  RETURN v_result || jsonb_build_object(
    'signed_contract_ready', COALESCE((v_evidence ->> 'ready')::boolean, false),
    'signed_contract_evidence', v_evidence,
    'signed_contract_block_code', CASE
      WHEN COALESCE((v_evidence ->> 'ready')::boolean, false) THEN NULL
      ELSE v_evidence ->> 'reason'
    END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid)
TO authenticated, service_role;

ALTER FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid)
  RENAME TO complete_legal_transfer_readiness_v1_pre_failure_containment;

CREATE FUNCTION public.complete_legal_transfer_readiness_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_payload jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_evidence jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = auth.uid() AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = auth.uid()
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RAISE EXCEPTION 'COMPANY_SCOPE_DENIED' USING ERRCODE = '42501';
  END IF;
  v_evidence := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id, p_contract_id
  );
  IF COALESCE((v_evidence ->> 'activeMatchedCount')::integer, 0) > 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'blocked', true,
      'code', 'ambiguous_multiple_active_matched_documents',
      'message_ar', 'توجد أكثر من نسخة عقد مطابقة وفعالة. يجب اعتماد نسخة واحدة ووضع البقية كنسخ مستبدلة قبل المتابعة.',
      'signed_contract_evidence', v_evidence
    );
  END IF;
  RETURN public.complete_legal_transfer_readiness_v1_pre_failure_containment(
    p_company_id, p_contract_id, p_payload, p_actor_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid)
TO authenticated, service_role;

ALTER FUNCTION public.convert_contract_to_legal_v1(
  uuid,uuid,text,text,text,boolean,uuid
) RENAME TO convert_contract_to_legal_v1_pre_failure_containment;

CREATE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_vehicle_returned boolean,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_evidence jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = auth.uid() AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = auth.uid()
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RAISE EXCEPTION 'COMPANY_SCOPE_DENIED' USING ERRCODE = '42501';
  END IF;
  v_evidence := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id, p_contract_id
  );
  IF COALESCE((v_evidence ->> 'activeMatchedCount')::integer, 0) > 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'blocked', true,
      'code', 'ambiguous_multiple_active_matched_documents',
      'message_ar', 'توجد عدة نسخ عقود مطابقة وفعالة؛ أوقف النظام إنشاء القضية حتى حسم النسخة القانونية الحالية.',
      'signed_contract_evidence', v_evidence
    );
  END IF;
  RETURN public.convert_contract_to_legal_v1_pre_failure_containment(
    p_company_id, p_contract_id, p_notes, p_priority, p_case_type,
    p_vehicle_returned, p_actor_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid,uuid,text,text,text,boolean,uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid,uuid,text,text,text,boolean,uuid
) TO authenticated, service_role;

-- Structural ownership: a filed preparation's source document must belong to
-- the same company and contract. Draft rows remain nullable for compatibility.
ALTER TABLE public.lawsuit_preparations
  ADD COLUMN source_document_id uuid;
ALTER TABLE public.lawsuit_preparations
  ADD CONSTRAINT lawsuit_preparations_direct_source_document_fkey
  FOREIGN KEY (company_id, contract_id, source_document_id)
  REFERENCES public.contract_documents(company_id, contract_id, id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.guard_lawsuit_preparation_source_document_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_source uuid;
BEGIN
  IF NEW.status NOT IN ('submitted', 'registered') THEN RETURN NEW; END IF;
  v_source := NEW.source_document_id;
  IF v_source IS NULL THEN
    SELECT CASE
      WHEN COALESCE(document ->> 'sourceDocumentId', '')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (document ->> 'sourceDocumentId')::uuid
      ELSE NULL
    END
    INTO v_source
    FROM public.taqadi_filing_jobs job
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(job.payload -> 'documents', '[]'::jsonb)) document
    WHERE job.company_id = NEW.company_id
      AND job.contract_id = NEW.contract_id
      AND (NEW.legal_case_id IS NULL OR job.legal_case_id = NEW.legal_case_id)
      AND document ->> 'key' = 'contract'
      AND NULLIF(document ->> 'sourceDocumentId', '') IS NOT NULL
    ORDER BY job.created_at DESC
    LIMIT 1;
    NEW.source_document_id := v_source;
  END IF;
  IF v_source IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.contract_documents document
    WHERE document.id = v_source
      AND document.company_id = NEW.company_id
      AND document.contract_id = NEW.contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
      AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'LAWSUIT_SOURCE_DOCUMENT_NOT_DIRECT_ACTIVE_MATCH' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_lawsuit_preparation_source_document
BEFORE INSERT OR UPDATE OF status, company_id, contract_id, source_document_id
ON public.lawsuit_preparations
FOR EACH ROW EXECUTE FUNCTION public.guard_lawsuit_preparation_source_document_v1();

REVOKE ALL ON FUNCTION public.guard_lawsuit_preparation_source_document_v1()
FROM PUBLIC, anon, authenticated;

-- Validate the actual source document embedded in the frozen Taqadi payload.
ALTER FUNCTION public.validate_taqadi_filing_payload_v1(uuid,uuid,jsonb)
  RENAME TO validate_taqadi_filing_payload_v1_pre_failure_containment;

CREATE FUNCTION public.validate_taqadi_filing_payload_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_source_document_id uuid;
  v_evidence_state jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = auth.uid() AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = auth.uid()
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RAISE EXCEPTION 'COMPANY_SCOPE_DENIED' USING ERRCODE = '42501';
  END IF;
  v_result := public.validate_taqadi_filing_payload_v1_pre_failure_containment(
    p_company_id, p_contract_id, p_payload
  );
  SELECT CASE
    WHEN COALESCE(document ->> 'sourceDocumentId', '')
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN (document ->> 'sourceDocumentId')::uuid
    ELSE NULL
  END
  INTO v_source_document_id
  FROM jsonb_array_elements(COALESCE(p_payload -> 'documents', '[]'::jsonb)) document
  WHERE document ->> 'key' = 'contract'
  LIMIT 1;
  v_evidence_state := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id, p_contract_id
  );
  IF v_source_document_id IS NULL OR COALESCE((v_evidence_state ->> 'ready')::boolean, false) = false
     OR NOT EXISTS (
       SELECT 1 FROM public.contract_documents document
       WHERE document.id = v_source_document_id
         AND document.company_id = p_company_id
         AND document.contract_id = p_contract_id
         AND document.legal_identity_match_status = 'matched'
         AND document.legal_evidence_state = 'active'
         AND document.document_type IN ('signed_contract', 'signed_contract_image')
     ) THEN
    v_result := jsonb_set(v_result, '{ready}', 'false'::jsonb, true);
    v_result := jsonb_set(
      v_result,
      '{missing}',
      COALESCE(v_result -> 'missing', '[]'::jsonb)
        || jsonb_build_array('documents.contract.sourceDocumentId:' || COALESCE(v_evidence_state ->> 'reason', 'missing')),
      true
    );
  END IF;
  RETURN v_result || jsonb_build_object('contractEvidence', v_evidence_state);
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_taqadi_filing_payload_v1(uuid,uuid,jsonb)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_taqadi_filing_payload_v1(uuid,uuid,jsonb)
TO authenticated, service_role;

-- Secure, one-use upload links. The public endpoint receives only an opaque
-- random token; company/customer/contract identifiers never appear in the URL.
CREATE TABLE public.missing_contract_pdf_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.missing_contract_pdf_requests(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  uploaded_document_id uuid REFERENCES public.contract_documents(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  claim_nonce text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (used_at IS NULL OR uploaded_document_id IS NOT NULL)
);

CREATE INDEX missing_contract_pdf_upload_tokens_request_idx
  ON public.missing_contract_pdf_upload_tokens(request_id, expires_at DESC);
ALTER TABLE public.missing_contract_pdf_upload_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.missing_contract_pdf_upload_tokens
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.missing_contract_pdf_upload_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.issue_missing_contract_pdf_upload_token_v1(
  p_request_id uuid,
  p_ttl interval DEFAULT interval '7 days'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_request public.missing_contract_pdf_requests%ROWTYPE;
  v_raw_token text;
  v_token public.missing_contract_pdf_upload_tokens%ROWTYPE;
BEGIN
  IF p_ttl < interval '15 minutes' OR p_ttl > interval '14 days' THEN
    RAISE EXCEPTION 'Upload token TTL is outside the safe range' USING ERRCODE = '22023';
  END IF;
  SELECT request.* INTO v_request
  FROM public.missing_contract_pdf_requests request
  WHERE request.id = p_request_id
    AND request.status NOT IN ('fulfilled', 'cancelled')
  FOR UPDATE;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Open PDF request not found' USING ERRCODE = 'P0001';
  END IF;
  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.missing_contract_pdf_upload_tokens (
    request_id, company_id, contract_id, token_hash, expires_at
  ) VALUES (
    v_request.id, v_request.company_id, v_request.contract_id,
    encode(extensions.digest(v_raw_token, 'sha256'), 'hex'), now() + p_ttl
  ) RETURNING * INTO v_token;
  RETURN jsonb_build_object(
    'token', v_raw_token,
    'expiresAt', v_token.expires_at,
    'requestId', v_request.id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_missing_contract_pdf_upload_token_v1(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_token public.missing_contract_pdf_upload_tokens%ROWTYPE;
  v_request public.missing_contract_pdf_requests%ROWTYPE;
BEGIN
  SELECT token.* INTO v_token
  FROM public.missing_contract_pdf_upload_tokens token
  WHERE token.token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex');
  IF v_token.id IS NULL OR v_token.revoked_at IS NOT NULL OR v_token.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_expired');
  END IF;
  SELECT request.* INTO v_request
  FROM public.missing_contract_pdf_requests request
  WHERE request.id = v_token.request_id;
  IF v_token.used_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false, 'reason', 'already_used', 'documentId', v_token.uploaded_document_id
    );
  END IF;
  IF v_request.status IN ('fulfilled', 'cancelled') THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'request_closed');
  END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'tokenId', v_token.id,
    'requestId', v_request.id,
    'companyId', v_token.company_id,
    'contractId', v_token.contract_id,
    'contractNumber', v_request.contract_number,
    'reason', v_request.reason,
    'expiresAt', v_token.expires_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_missing_contract_pdf_upload_token_v1(
  p_token text,
  p_claim_nonce text,
  p_document_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_token public.missing_contract_pdf_upload_tokens%ROWTYPE;
BEGIN
  SELECT token.* INTO v_token
  FROM public.missing_contract_pdf_upload_tokens token
  WHERE token.token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex')
  FOR UPDATE;
  IF v_token.id IS NULL OR v_token.revoked_at IS NOT NULL OR v_token.expires_at <= now()
     OR v_token.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'UPLOAD_TOKEN_NOT_USABLE' USING ERRCODE = 'P0001';
  END IF;
  IF v_token.claim_nonce IS DISTINCT FROM NULLIF(BTRIM(COALESCE(p_claim_nonce, '')), '')
     OR v_token.claimed_at IS NULL
     OR v_token.claimed_at <= now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'UPLOAD_TOKEN_CLAIM_LOST' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.contract_documents document
    WHERE document.id = p_document_id
      AND document.company_id = v_token.company_id
      AND document.contract_id = v_token.contract_id
      AND document.document_type = 'signed_contract'
      AND document.legal_identity_match_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'UPLOAD_DOCUMENT_NOT_DIRECT_PENDING_CONTRACT' USING ERRCODE = '23514';
  END IF;
  UPDATE public.missing_contract_pdf_upload_tokens
  SET used_at = now(), uploaded_document_id = p_document_id,
      claim_nonce = NULL, claimed_at = NULL
  WHERE id = v_token.id;
  RETURN jsonb_build_object('consumed', true, 'documentId', p_document_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_missing_contract_pdf_upload_token_claim_v1(
  p_token text,
  p_claim_nonce text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_released boolean := false;
BEGIN
  UPDATE public.missing_contract_pdf_upload_tokens token
  SET claimed_at = NULL, claim_nonce = NULL
  WHERE token.token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex')
    AND token.used_at IS NULL
    AND token.revoked_at IS NULL
    AND token.claim_nonce = NULLIF(BTRIM(COALESCE(p_claim_nonce, '')), '')
  RETURNING true INTO v_released;
  RETURN COALESCE(v_released, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_missing_contract_pdf_upload_token_v1(
  p_token text,
  p_claim_nonce text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_token public.missing_contract_pdf_upload_tokens%ROWTYPE;
  v_nonce text := NULLIF(BTRIM(COALESCE(p_claim_nonce, '')), '');
BEGIN
  IF v_nonce IS NULL OR length(v_nonce) < 16 THEN
    RAISE EXCEPTION 'UPLOAD_CLAIM_NONCE_REQUIRED' USING ERRCODE = '22023';
  END IF;
  SELECT token.* INTO v_token
  FROM public.missing_contract_pdf_upload_tokens token
  WHERE token.token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex')
  FOR UPDATE;
  IF v_token.id IS NULL OR v_token.revoked_at IS NOT NULL OR v_token.expires_at <= now()
     OR v_token.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'invalid_expired_or_used');
  END IF;
  IF v_token.claimed_at IS NOT NULL
     AND v_token.claimed_at > now() - interval '10 minutes'
     AND v_token.claim_nonce IS DISTINCT FROM v_nonce THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'upload_already_in_progress');
  END IF;
  UPDATE public.missing_contract_pdf_upload_tokens
  SET claimed_at = now(), claim_nonce = v_nonce
  WHERE id = v_token.id;
  RETURN public.resolve_missing_contract_pdf_upload_token_v1(p_token)
    || jsonb_build_object('claimed', true, 'claimNonce', v_nonce);
END;
$function$;

REVOKE ALL ON FUNCTION public.issue_missing_contract_pdf_upload_token_v1(uuid,interval)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_missing_contract_pdf_upload_token_v1(text)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_missing_contract_pdf_upload_token_v1(text,text,uuid)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_missing_contract_pdf_upload_token_claim_v1(text,text)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_missing_contract_pdf_upload_token_v1(text,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_missing_contract_pdf_upload_token_v1(uuid,interval),
  public.resolve_missing_contract_pdf_upload_token_v1(text),
  public.claim_missing_contract_pdf_upload_token_v1(text,text),
  public.release_missing_contract_pdf_upload_token_claim_v1(text,text),
  public.consume_missing_contract_pdf_upload_token_v1(text,text,uuid)
TO service_role;

-- Dead requests are escalated once into the existing deduplicated task bridge.
ALTER TABLE public.missing_contract_pdf_requests
  ADD COLUMN escalation_due_at timestamptz,
  ADD COLUMN first_escalated_at timestamptz,
  ADD COLUMN last_escalated_at timestamptz,
  ADD COLUMN escalation_closed_at timestamptz,
  ADD COLUMN escalation_count integer NOT NULL DEFAULT 0 CHECK (escalation_count BETWEEN 0 AND 10),
  ADD COLUMN mismatch_upload_count integer NOT NULL DEFAULT 0 CHECK (mismatch_upload_count BETWEEN 0 AND 20),
  ADD COLUMN review_cooldown_until timestamptz;

UPDATE public.missing_contract_pdf_requests
SET escalation_due_at = first_requested_at + interval '48 hours'
WHERE escalation_due_at IS NULL AND status NOT IN ('fulfilled', 'cancelled');

CREATE OR REPLACE FUNCTION public.escalate_stale_missing_contract_pdf_requests_v1(
  p_company_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_request record;
  v_escalated integer := 0;
BEGIN
  FOR v_request IN
    SELECT request.id, request.contract_id, request.contract_number,
      request.reason, request.status, request.first_requested_at
    FROM public.missing_contract_pdf_requests request
    WHERE request.company_id = p_company_id
      AND request.status NOT IN ('fulfilled', 'cancelled')
      AND COALESCE(request.escalation_due_at, request.first_requested_at + interval '48 hours') <= now()
      AND request.escalation_count < 3
      AND (request.last_escalated_at IS NULL OR request.last_escalated_at <= now() - interval '48 hours')
    ORDER BY request.first_requested_at, request.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'missing-contract-pdf:' || v_request.id::text,
      'تصعيد: نسخة عقد صحيحة مطلوبة للعقد ' || v_request.contract_number,
      'لم تصل نسخة عقد مطابقة خلال 48 ساعة. السبب: ' || v_request.reason
        || '. الطلب مفتوح منذ ' || v_request.first_requested_at::text
        || '. يمنع النظام رفع الدعوى حتى وصول نسخة مطابقة.',
      'high',
      true
    );
    UPDATE public.missing_contract_pdf_requests
    SET first_escalated_at = COALESCE(first_escalated_at, now()),
        last_escalated_at = now(),
        escalation_count = escalation_count + 1,
        escalation_due_at = now() + interval '48 hours',
        updated_at = now()
    WHERE id = v_request.id;
    v_escalated := v_escalated + 1;
  END LOOP;

  FOR v_request IN
    SELECT request.id
    FROM public.missing_contract_pdf_requests request
    WHERE request.company_id = p_company_id
      AND request.status IN ('fulfilled', 'cancelled')
      AND request.first_escalated_at IS NOT NULL
      AND request.escalation_closed_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'missing-contract-pdf:' || v_request.id::text,
      'طلب نسخة عقد مكتمل',
      'أُغلق الطلب بعد استلام نسخة مطابقة.',
      'low',
      false
    );
    UPDATE public.missing_contract_pdf_requests
    SET escalation_closed_at = now(), updated_at = now()
    WHERE id = v_request.id;
  END LOOP;
  RETURN jsonb_build_object('escalated', v_escalated);
END;
$function$;

REVOKE ALL ON FUNCTION public.escalate_stale_missing_contract_pdf_requests_v1(uuid,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_stale_missing_contract_pdf_requests_v1(uuid,integer)
TO service_role;

-- Quarantine repeated mismatches and introduce a cooldown, avoiding a
-- WhatsApp -> bad upload -> WhatsApp loop.
CREATE OR REPLACE FUNCTION public.track_missing_contract_pdf_mismatch_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.document_type IN ('signed_contract', 'signed_contract_image')
     AND NEW.legal_identity_match_status IN ('mismatch', 'failed')
     AND (TG_OP = 'INSERT' OR OLD.legal_identity_match_status IS DISTINCT FROM NEW.legal_identity_match_status) THEN
    UPDATE public.missing_contract_pdf_requests request
    SET mismatch_upload_count = LEAST(request.mismatch_upload_count + 1, 20),
        review_cooldown_until = CASE
          WHEN request.mismatch_upload_count + 1 >= 3 THEN now() + interval '24 hours'
          ELSE now() + interval '2 hours'
        END,
        updated_at = now()
    WHERE request.company_id = NEW.company_id
      AND request.contract_id = NEW.contract_id
      AND request.status NOT IN ('fulfilled', 'cancelled');
    IF EXISTS (
      SELECT 1 FROM public.missing_contract_pdf_requests request
      WHERE request.company_id = NEW.company_id
        AND request.contract_id = NEW.contract_id
        AND request.mismatch_upload_count >= 3
        AND request.status NOT IN ('fulfilled', 'cancelled')
    ) THEN
      PERFORM public.upsert_agent_operational_alert_task_v1(
        NEW.company_id,
        'contract-pdf-repeated-mismatch:' || NEW.contract_id::text,
        'مراجعة يدوية: تكرار رفع عقد غير مطابق',
        'أوقف النظام إعادة الإرسال الفوري بعد ثلاث نسخ غير مطابقة. يلزم فحص مصدر الملف وهوية العميل.',
        'urgent',
        true
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_track_missing_contract_pdf_mismatch
AFTER INSERT OR UPDATE OF legal_identity_match_status ON public.contract_documents
FOR EACH ROW EXECUTE FUNCTION public.track_missing_contract_pdf_mismatch_v1();

REVOKE ALL ON FUNCTION public.track_missing_contract_pdf_mismatch_v1()
FROM PUBLIC, anon, authenticated;

-- Service-only aggregate health check. Sensitive identity values and storage
-- paths never leave PostgreSQL; callers receive violation counts only.
CREATE OR REPLACE FUNCTION public.get_agent_safety_data_health_v1()
RETURNS TABLE(metric text, violation_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    'active_matched_evidence_ambiguous_contracts'::text,
    count(*)::bigint
  FROM (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
    GROUP BY document.company_id, document.contract_id
    HAVING count(*) > 1
  ) ambiguous_contracts
  UNION ALL
  SELECT
    'active_matched_evidence_reused_paths'::text,
    count(*)::bigint
  FROM (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
      AND NULLIF(pg_catalog.btrim(document.file_path), '') IS NOT NULL
    GROUP BY document.company_id, document.file_path
    HAVING count(DISTINCT document.contract_id) > 1
  ) reused_paths
  UNION ALL
  SELECT
    'normalized_national_id_duplicate_groups'::text,
    count(*)::bigint
  FROM (
    SELECT 1
    FROM public.customers customer
    WHERE public.normalize_national_id(customer.national_id) <> ''
    GROUP BY customer.company_id,
             public.normalize_national_id(customer.national_id)
    HAVING count(*) > 1
  ) duplicate_national_ids;
$function$;

REVOKE ALL ON FUNCTION public.get_agent_safety_data_health_v1()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_safety_data_health_v1()
TO service_role;

-- Schedules call service-only RPCs; no external write is introduced here.
SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname IN (
  'expire-unverified-signed-contracts-v1',
  'escalate-missing-contract-pdf-v1',
  'timeout-stale-agent-executions-v1'
);

SELECT cron.schedule(
  'expire-unverified-signed-contracts-v1',
  '*/15 * * * *',
  $$SELECT public.expire_unverified_signed_contracts_v1(
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 100
  );$$
);

SELECT cron.schedule(
  'escalate-missing-contract-pdf-v1',
  '15 * * * *',
  $$SELECT public.escalate_stale_missing_contract_pdf_requests_v1(
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 100
  );$$
);

SELECT cron.schedule(
  'timeout-stale-agent-executions-v1',
  '*/10 * * * *',
  $$SELECT public.timeout_stale_agent_executions_v1(
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 100
  );$$
);

-- Immutable, privacy-minimized audit ledger for interactive WhatsApp sends.
-- Provider credentials and message bodies never enter the browser or this table.
CREATE TABLE public.outbound_whatsapp_commands (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (purpose IN (
    'legal_case_notice',
    'traffic_violation_reminder',
    'verification_task',
    'verification_complete',
    'payment_reminder_manual',
    'payment_reminder_test'
  )),
  entity_type text NOT NULL CHECK (entity_type IN (
    'legal_case', 'customer', 'employee', 'verification_task', 'contract', 'company'
  )),
  entity_id text NOT NULL CHECK (char_length(entity_id) BETWEEN 1 AND 100),
  recipient_last4 text NOT NULL CHECK (recipient_last4 ~ '^[0-9]{4}$'),
  recipient_hash text NOT NULL CHECK (recipient_hash ~ '^[0-9a-f]{64}$'),
  message_hash text NOT NULL CHECK (message_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key uuid NOT NULL,
  dedupe_key text NOT NULL CHECK (dedupe_key ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count BETWEEN 1 AND 3),
  provider_message_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (company_id, idempotency_key),
  UNIQUE (company_id, dedupe_key)
);

CREATE INDEX outbound_whatsapp_commands_company_created_idx
  ON public.outbound_whatsapp_commands (company_id, created_at DESC);
CREATE INDEX outbound_whatsapp_commands_failed_idx
  ON public.outbound_whatsapp_commands (company_id, created_at DESC)
  WHERE status = 'failed';

-- A provider may accept a message while the final audit update is temporarily
-- unavailable. Keep that command pending and prevent an identical message from
-- being sent again until an operator or reconciler resolves the uncertain result.
CREATE UNIQUE INDEX outbound_whatsapp_commands_pending_content_uidx
  ON public.outbound_whatsapp_commands (
    company_id,
    purpose,
    entity_type,
    entity_id,
    recipient_hash,
    message_hash
  )
  WHERE status = 'pending';

ALTER TABLE public.outbound_whatsapp_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.outbound_whatsapp_commands FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.outbound_whatsapp_commands TO service_role;

COMMENT ON TABLE public.outbound_whatsapp_commands IS
  'Privacy-minimized immutable-command ledger for authenticated manual WhatsApp sends; stores hashes and last four digits, never plaintext messages or provider credentials.';

-- Historical UI settings exposed provider secrets to every browser loading the
-- settings row. Edge secrets are now the only accepted credential source.
UPDATE public.whatsapp_settings
SET ultramsg_instance_id = NULL,
    ultramsg_token = NULL,
    updated_at = now()
WHERE ultramsg_instance_id IS NOT NULL OR ultramsg_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reject_browser_whatsapp_credentials_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.ultramsg_instance_id IS NOT NULL OR NEW.ultramsg_token IS NOT NULL THEN
    RAISE EXCEPTION 'WhatsApp provider credentials are server-managed Edge secrets'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_reject_browser_whatsapp_credentials
BEFORE INSERT OR UPDATE OF ultramsg_instance_id, ultramsg_token
ON public.whatsapp_settings
FOR EACH ROW EXECUTE FUNCTION public.reject_browser_whatsapp_credentials_v1();

REVOKE ALL ON FUNCTION public.reject_browser_whatsapp_credentials_v1()
FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.agent_execution_mutations IS
  'Immutable before/after/postcondition evidence for execution-ledger-enabled autonomous writers.';
COMMENT ON COLUMN public.contract_documents.legal_evidence_state IS
  'Only one active identity-matched signed contract may be used for legal filing; older copies must be explicitly superseded.';
COMMENT ON TABLE public.missing_contract_pdf_upload_tokens IS
  'Hashed one-use tokens for anonymous PDF upload; tokens never encode company, customer or contract identifiers.';

COMMIT;
