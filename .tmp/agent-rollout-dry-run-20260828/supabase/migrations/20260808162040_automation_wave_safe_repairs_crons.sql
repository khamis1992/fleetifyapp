-- Automation wave: extended agent types, safe auto-repair log with rollback,
-- the MOI violations inbox bucket, and cron schedules for the new agents.

-- 1) Extend agent types for the new agents.
ALTER TABLE public.ai_agent_reviews
  DROP CONSTRAINT IF EXISTS ai_agent_reviews_agent_type_check;
ALTER TABLE public.ai_agent_reviews
  ADD CONSTRAINT ai_agent_reviews_agent_type_check CHECK (agent_type IN (
    'journal_entry', 'legal_case', 'daily_closeout',
    'collection_message', 'customer_autofill', 'payment_match',
    'correction_verify', 'violation_inbox', 'ops_audit', 'auto_repair',
    'customer_merge', 'smart_assignment'
  ));
-- 2) Safe auto-repairs: every automatic fix stores before/after state so it
--    can be rolled back; risky findings are only escalated as tasks.
CREATE TABLE public.safe_auto_repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  repair_type text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  rolled_back_at timestamptz,
  rolled_back_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX safe_auto_repairs_lookup_idx
  ON public.safe_auto_repairs (company_id, entity_type, entity_id, created_at DESC);
ALTER TABLE public.safe_auto_repairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members read safe auto repairs"
ON public.safe_auto_repairs
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());
REVOKE ALL ON TABLE public.safe_auto_repairs FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.safe_auto_repairs TO authenticated;
GRANT ALL ON TABLE public.safe_auto_repairs TO service_role;
-- 3) MOI violations inbox bucket (private; the processor moves files to processed/).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'moi-inbox',
  'moi-inbox',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Company members upload MOI inbox files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moi-inbox'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);
CREATE POLICY "Company members read their MOI inbox files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'moi-inbox'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);
-- 4) Cron schedules (all share the existing Vault scanner secret).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
SELECT cron.unschedule('violation-inbox-processor')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'violation-inbox-processor');
SELECT cron.unschedule('nightly-ops-auditor')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-ops-auditor');
SELECT cron.unschedule('smart-contract-assigner')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'smart-contract-assigner');
SELECT cron.unschedule('safe-auto-repair')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'safe-auto-repair');
SELECT cron.unschedule('customer-duplicate-detector')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'customer-duplicate-detector');
-- Violation inbox: every 15 minutes.
SELECT cron.schedule(
  'violation-inbox-processor',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/violation-inbox-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_scanner_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object('companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4', 'limit', 5)
  );
  $$
);
-- Nightly operations auditor at 02:30.
SELECT cron.schedule(
  'nightly-ops-auditor',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/nightly-ops-auditor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_scanner_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object('companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4')
  );
  $$
);
-- Smart assignment rebalance nightly at 03:00 (assign_new runs every 30 minutes).
SELECT cron.schedule(
  'smart-contract-assigner',
  '0,30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/smart-contract-assigner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_scanner_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object(
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'mode', CASE WHEN EXTRACT(HOUR FROM now()) = 3 THEN 'rebalance' ELSE 'assign_new' END
    )
  );
  $$
);
-- Safe auto-repair nightly at 03:30.
SELECT cron.schedule(
  'safe-auto-repair',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/safe-auto-repair',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_scanner_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object('companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4')
  );
  $$
);
-- Duplicate customer detection nightly at 04:00.
SELECT cron.schedule(
  'customer-duplicate-detector',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/customer-duplicate-detector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_scanner_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object('companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4')
  );
  $$
);
