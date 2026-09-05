-- Isolated schema subset for the real reversal and claim migration bodies.
-- Field names/types checked against production information_schema 2026-09-03.
-- No production data, RLS policies, external side effects, or live credentials.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('role', current_setting('request.jwt.claim.role', true))
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$
  SELECT current_setting('request.jwt.claim.role', true)
$$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;

CREATE TYPE public.vehicle_status AS ENUM ('available', 'rented', 'maintenance');
CREATE TYPE public.user_role AS ENUM ('super_admin','company_admin','manager','accountant','fleet_manager','sales_agent','employee');
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  company_id uuid NOT NULL, is_active boolean DEFAULT true,
  role text CHECK (role IN ('admin','manager','employee','customer'))
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
  company_id uuid, role public.user_role
);
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY, company_id uuid NOT NULL, status public.vehicle_status,
  updated_at timestamptz
);
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY, company_id uuid NOT NULL, status text,
  vehicle_id uuid REFERENCES public.vehicles(id), legal_status text,
  suspension_reason text, updated_at timestamptz
);
CREATE TABLE public.legal_cases (
  id uuid PRIMARY KEY, company_id uuid NOT NULL,
  contract_id uuid REFERENCES public.contracts(id), case_status text,
  workflow_stage text, filing_date date, case_reference text,
  outcome_type text, outcome_date date, closed_at timestamptz,
  closure_reason text, notes text, stage_updated_at timestamptz,
  updated_at timestamptz
);
CREATE TABLE public.taqadi_filing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL,
  contract_id uuid REFERENCES public.contracts(id), legal_case_id uuid REFERENCES public.legal_cases(id),
  status text DEFAULT 'queued', current_step text DEFAULT 'queued',
  error_code text, error_message text, locked_by text, locked_at timestamptz,
  completed_at timestamptz, updated_at timestamptz, created_at timestamptz DEFAULT now(),
  attempt_count integer DEFAULT 0, max_attempts integer DEFAULT 3,
  progress integer DEFAULT 0, heartbeat_at timestamptz, started_at timestamptz
);
CREATE TABLE public.taqadi_automation_workers (
  worker_id text PRIMARY KEY, status text, version text, current_job_id uuid,
  heartbeat_at timestamptz, last_error text
);
CREATE TABLE public.taqadi_filing_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid,
  job_id uuid REFERENCES public.taqadi_filing_jobs(id), event_type text,
  step text, status text, message text, details jsonb
);
CREATE TABLE public.lawsuit_preparations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid,
  contract_id uuid REFERENCES public.contracts(id), status varchar,
  notes text, updated_at timestamptz, registered_at timestamptz, submitted_at timestamptz
);
CREATE TABLE public.delinquent_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid,
  contract_id uuid REFERENCES public.contracts(id), is_active boolean,
  last_updated_at timestamptz
);
CREATE TABLE public.contract_operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid,
  contract_id uuid REFERENCES public.contracts(id), operation_type text,
  operation_details jsonb, old_values jsonb, new_values jsonb, notes text,
  performed_by uuid, performed_at timestamptz DEFAULT now()
);
-- Deliberately stubbed: vehicle derivation has separate tests; this suite checks
-- that reversal honors the result and tenant scope, not its business formula.
CREATE FUNCTION public.system_agent_vehicle_derived_state(uuid, uuid)
RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"target_status":"available"}'::jsonb $$;
