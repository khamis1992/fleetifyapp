-- Daily employee workspace close-out logs
-- Stores the interactive version of the daily logbook inside Employee Workspace.

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
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT company_id
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner', 'super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Employees can create their own daily workspace logs"
  ON public.employee_daily_workspace_logs;
CREATE POLICY "Employees can create their own daily workspace logs"
  ON public.employee_daily_workspace_logs
  FOR INSERT
  WITH CHECK (
    employee_profile_id IN (
      SELECT id
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND company_id = employee_daily_workspace_logs.company_id
    )
  );

DROP POLICY IF EXISTS "Employees can update their own daily workspace logs"
  ON public.employee_daily_workspace_logs;
CREATE POLICY "Employees can update their own daily workspace logs"
  ON public.employee_daily_workspace_logs
  FOR UPDATE
  USING (
    employee_profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT company_id
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner', 'super_admin', 'manager')
    )
  )
  WITH CHECK (
    employee_profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT company_id
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner', 'super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete daily workspace logs"
  ON public.employee_daily_workspace_logs;
CREATE POLICY "Admins can delete daily workspace logs"
  ON public.employee_daily_workspace_logs
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id
      FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner', 'super_admin')
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
