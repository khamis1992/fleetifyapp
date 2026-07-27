-- Restore missing employee workspace support tables in deployments where older
-- non-timestamped SQL files were skipped by Supabase CLI.

CREATE TABLE IF NOT EXISTS public.customer_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  communication_type text NOT NULL CHECK (communication_type IN ('phone', 'message', 'meeting', 'note')),
  communication_date date NOT NULL,
  communication_time time NOT NULL DEFAULT CURRENT_TIME,
  duration_minutes integer,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  notes text NOT NULL,
  action_required text CHECK (action_required IN ('quote', 'contract', 'payment', 'maintenance', 'renewal', 'none')),
  action_description text,
  follow_up_scheduled boolean DEFAULT false,
  follow_up_date date,
  follow_up_time time,
  follow_up_status text CHECK (follow_up_status IN ('pending', 'completed', 'cancelled')),
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_communications
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_communications_customer
  ON public.customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_company
  ON public.customer_communications(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_employee
  ON public.customer_communications(employee_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_contract
  ON public.customer_communications(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_communications_date
  ON public.customer_communications(communication_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_communications_follow_up
  ON public.customer_communications(follow_up_date, follow_up_status)
  WHERE follow_up_scheduled = true;

ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view communications for their company"
  ON public.customer_communications;
CREATE POLICY "Users can view communications for their company"
  ON public.customer_communications
  FOR SELECT
  USING (
    company_id IN (
      SELECT profile.company_id
      FROM public.profiles profile
      WHERE profile.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create communications for their company"
  ON public.customer_communications;
CREATE POLICY "Users can create communications for their company"
  ON public.customer_communications
  FOR INSERT
  WITH CHECK (
    employee_id = auth.uid()
    AND company_id IN (
      SELECT profile.company_id
      FROM public.profiles profile
      WHERE profile.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own communications"
  ON public.customer_communications;
CREATE POLICY "Users can update their own communications"
  ON public.customer_communications
  FOR UPDATE
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own communications"
  ON public.customer_communications;
CREATE POLICY "Users can delete their own communications"
  ON public.customer_communications
  FOR DELETE
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.user_id = auth.uid()
        AND profile.company_id = customer_communications.company_id
        AND profile.role IN ('admin', 'owner', 'super_admin', 'manager')
    )
  );

CREATE OR REPLACE FUNCTION public.update_customer_communications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_customer_communications_updated_at
  ON public.customer_communications;
CREATE TRIGGER trigger_update_customer_communications_updated_at
  BEFORE UPDATE ON public.customer_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_communications_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.customer_communications
  TO authenticated;

CREATE TABLE IF NOT EXISTS public.employee_daily_workspace_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  employee_name text NOT NULL,
  team text,
  department text,
  start_time time,
  end_time time,
  beginning_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  key_cases text,
  legal_review_cases text,
  blockers text,
  completion_status text NOT NULL DEFAULT 'completed'
    CHECK (completion_status IN ('completed', 'incomplete')),
  incomplete_reason text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_profile_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_daily_workspace_logs_company_date
  ON public.employee_daily_workspace_logs(company_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_employee_daily_workspace_logs_employee_date
  ON public.employee_daily_workspace_logs(employee_profile_id, log_date DESC);

ALTER TABLE public.employee_daily_workspace_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view their own daily workspace logs"
  ON public.employee_daily_workspace_logs;
CREATE POLICY "Employees can view their own daily workspace logs"
  ON public.employee_daily_workspace_logs
  FOR SELECT
  USING (
    employee_profile_id IN (
      SELECT profile.id FROM public.profiles profile WHERE profile.user_id = auth.uid()
    )
    OR company_id IN (
      SELECT profile.company_id
      FROM public.profiles profile
      WHERE profile.user_id = auth.uid()
        AND profile.role IN ('admin', 'owner', 'super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Employees can create their own daily workspace logs"
  ON public.employee_daily_workspace_logs;
CREATE POLICY "Employees can create their own daily workspace logs"
  ON public.employee_daily_workspace_logs
  FOR INSERT
  WITH CHECK (
    employee_profile_id IN (
      SELECT profile.id
      FROM public.profiles profile
      WHERE profile.user_id = auth.uid()
        AND profile.company_id = employee_daily_workspace_logs.company_id
    )
  );

DROP POLICY IF EXISTS "Employees can update their own daily workspace logs"
  ON public.employee_daily_workspace_logs;
CREATE POLICY "Employees can update their own daily workspace logs"
  ON public.employee_daily_workspace_logs
  FOR UPDATE
  USING (
    employee_profile_id IN (
      SELECT profile.id FROM public.profiles profile WHERE profile.user_id = auth.uid()
    )
    OR company_id IN (
      SELECT profile.company_id
      FROM public.profiles profile
      WHERE profile.user_id = auth.uid()
        AND profile.role IN ('admin', 'owner', 'super_admin', 'manager')
    )
  )
  WITH CHECK (
    employee_profile_id IN (
      SELECT profile.id FROM public.profiles profile WHERE profile.user_id = auth.uid()
    )
    OR company_id IN (
      SELECT profile.company_id
      FROM public.profiles profile
      WHERE profile.user_id = auth.uid()
        AND profile.role IN ('admin', 'owner', 'super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete daily workspace logs"
  ON public.employee_daily_workspace_logs;
CREATE POLICY "Admins can delete daily workspace logs"
  ON public.employee_daily_workspace_logs
  FOR DELETE
  USING (
    company_id IN (
      SELECT profile.company_id
      FROM public.profiles profile
      WHERE profile.user_id = auth.uid()
        AND profile.role IN ('admin', 'owner', 'super_admin')
    )
  );

DROP TRIGGER IF EXISTS update_employee_daily_workspace_logs_updated_at
  ON public.employee_daily_workspace_logs;
CREATE TRIGGER update_employee_daily_workspace_logs_updated_at
  BEFORE UPDATE ON public.employee_daily_workspace_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.employee_daily_workspace_logs
  TO authenticated;
