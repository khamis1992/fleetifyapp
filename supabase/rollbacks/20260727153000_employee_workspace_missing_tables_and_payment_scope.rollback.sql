-- Keep data by default; rollback only removes policies/triggers created by the
-- forward migration. Drop tables manually only if the deployment requires it.

DROP TRIGGER IF EXISTS trigger_update_customer_communications_updated_at
  ON public.customer_communications;
DROP POLICY IF EXISTS "Users can view communications for their company"
  ON public.customer_communications;
DROP POLICY IF EXISTS "Users can create communications for their company"
  ON public.customer_communications;
DROP POLICY IF EXISTS "Users can update their own communications"
  ON public.customer_communications;
DROP POLICY IF EXISTS "Users can delete their own communications"
  ON public.customer_communications;

DROP TRIGGER IF EXISTS update_employee_daily_workspace_logs_updated_at
  ON public.employee_daily_workspace_logs;
DROP POLICY IF EXISTS "Employees can view their own daily workspace logs"
  ON public.employee_daily_workspace_logs;
DROP POLICY IF EXISTS "Employees can create their own daily workspace logs"
  ON public.employee_daily_workspace_logs;
DROP POLICY IF EXISTS "Employees can update their own daily workspace logs"
  ON public.employee_daily_workspace_logs;
DROP POLICY IF EXISTS "Admins can delete daily workspace logs"
  ON public.employee_daily_workspace_logs;
