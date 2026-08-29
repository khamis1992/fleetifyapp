-- Company-scoped Microsoft Graph MOI mail ingestion state and audit trail.
CREATE TABLE public.traffic_mail_ingest_state (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  graph_folder_id text,
  graph_folder_name text,
  watermark_received_at timestamptz,
  last_sync_started_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text NOT NULL DEFAULT 'never' CHECK (last_sync_status IN ('never', 'running', 'success', 'error')),
  last_error text,
  last_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.traffic_mail_processed_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  graph_message_id text NOT NULL,
  internet_message_id text,
  received_at timestamptz NOT NULL,
  subject text,
  notice_type text,
  processing_status text NOT NULL CHECK (processing_status IN ('processing', 'processed', 'ignored', 'failed')),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, graph_message_id)
);

CREATE INDEX traffic_mail_processed_company_received_idx
  ON public.traffic_mail_processed_messages (company_id, received_at DESC);

CREATE TABLE public.traffic_mail_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  processed_message_id uuid REFERENCES public.traffic_mail_processed_messages(id) ON DELETE SET NULL,
  notice_type text NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  penalty_id uuid REFERENCES public.penalties(id) ON DELETE SET NULL,
  plate_number text,
  national_id text,
  notice_date date,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX traffic_mail_notices_company_created_idx
  ON public.traffic_mail_notices (company_id, created_at DESC);

ALTER TABLE public.traffic_mail_ingest_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_mail_processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_mail_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY traffic_mail_state_company_admin_read ON public.traffic_mail_ingest_state
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::public.user_role)
      OR public.has_role(auth.uid(), 'company_admin'::public.user_role)
      OR public.has_role(auth.uid(), 'manager'::public.user_role)
    )
  );
CREATE POLICY traffic_mail_messages_company_admin_read ON public.traffic_mail_processed_messages
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::public.user_role)
      OR public.has_role(auth.uid(), 'company_admin'::public.user_role)
      OR public.has_role(auth.uid(), 'manager'::public.user_role)
    )
  );
CREATE POLICY traffic_mail_notices_company_admin_read ON public.traffic_mail_notices
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::public.user_role)
      OR public.has_role(auth.uid(), 'company_admin'::public.user_role)
      OR public.has_role(auth.uid(), 'manager'::public.user_role)
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.traffic_mail_ingest_state FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.traffic_mail_processed_messages FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.traffic_mail_notices FROM anon, authenticated;
GRANT SELECT ON public.traffic_mail_ingest_state, public.traffic_mail_processed_messages, public.traffic_mail_notices TO authenticated;
GRANT ALL ON public.traffic_mail_ingest_state, public.traffic_mail_processed_messages, public.traffic_mail_notices TO service_role;

COMMENT ON TABLE public.traffic_mail_ingest_state IS 'Microsoft Graph MOI mail folder watermark and last synchronization outcome; OAuth tokens remain in Edge Function secrets.';
COMMENT ON TABLE public.traffic_mail_processed_messages IS 'Graph message idempotency ledger scoped by company.';
COMMENT ON TABLE public.traffic_mail_notices IS 'Audit log for non-fine and fine notices applied from MOI email.';
