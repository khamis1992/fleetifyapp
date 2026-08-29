-- Optimize RLS policies - Batch 2: Approval workflows and attendance

-- Drop and recreate policies for approval_steps
DROP POLICY IF EXISTS "Approvers can update their assigned steps" ON public.approval_steps;
CREATE POLICY "Approvers can update their assigned steps"
ON public.approval_steps
FOR UPDATE
TO public
USING (
  approver_id = (SELECT auth.uid()) 
  OR has_role((SELECT auth.uid()), 'super_admin'::user_role) 
  OR EXISTS (
    SELECT 1
    FROM approval_requests ar
    WHERE ar.id = approval_steps.request_id 
      AND ar.company_id = get_user_company((SELECT auth.uid())) 
      AND (
        has_role((SELECT auth.uid()), 'company_admin'::user_role) 
        OR has_role((SELECT auth.uid()), 'manager'::user_role)
      )
  )
);

DROP POLICY IF EXISTS "Users can view steps for their company requests" ON public.approval_steps;
CREATE POLICY "Users can view steps for their company requests"
ON public.approval_steps
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM approval_requests ar
    WHERE ar.id = approval_steps.request_id 
      AND ar.company_id = get_user_company((SELECT auth.uid()))
  )
);

-- Drop and recreate policies for approval_workflows
DROP POLICY IF EXISTS "Admins can manage workflows in their company" ON public.approval_workflows;
CREATE POLICY "Admins can manage workflows in their company"
ON public.approval_workflows
FOR ALL
TO public
USING (
  has_role((SELECT auth.uid()), 'super_admin'::user_role) 
  OR (
    company_id = get_user_company((SELECT auth.uid())) 
    AND (
      has_role((SELECT auth.uid()), 'company_admin'::user_role) 
      OR has_role((SELECT auth.uid()), 'manager'::user_role)
    )
  )
);

DROP POLICY IF EXISTS "Users can view workflows in their company" ON public.approval_workflows;
CREATE POLICY "Users can view workflows in their company"
ON public.approval_workflows
FOR SELECT
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for attendance_records
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة سجلات الحضو" ON public.attendance_records;
CREATE POLICY "المديرون يمكنهم إدارة سجلات الحضو"
ON public.attendance_records
FOR ALL
TO public
USING (
  has_role((SELECT auth.uid()), 'super_admin'::user_role) 
  OR EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.id = attendance_records.employee_id 
      AND e.company_id = get_user_company((SELECT auth.uid())) 
      AND (
        has_role((SELECT auth.uid()), 'company_admin'::user_role) 
        OR has_role((SELECT auth.uid()), 'manager'::user_role)
      )
  )
);

DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض سجلات الحضو" ON public.attendance_records;
CREATE POLICY "المستخدمون يمكنهم عرض سجلات الحضو"
ON public.attendance_records
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.id = attendance_records.employee_id 
      AND e.company_id = get_user_company((SELECT auth.uid()))
  )
);

-- Drop and recreate policies for audit_logs
DROP POLICY IF EXISTS "Companies can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Companies can view their own audit logs"
ON public.audit_logs
FOR SELECT
TO public
USING (
  company_id = get_user_company((SELECT auth.uid())) 
  AND (
    has_role((SELECT auth.uid()), 'company_admin'::user_role) 
    OR has_role((SELECT auth.uid()), 'manager'::user_role)
  )
);

DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO public
USING (has_role((SELECT auth.uid()), 'super_admin'::user_role));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can view audit logs for their company" ON public.audit_logs;
CREATE POLICY "Users can view audit logs for their company"
ON public.audit_logs
FOR SELECT
TO public
USING (
  company_id = user_company_id() 
  OR user_id = (SELECT auth.uid())
);
;
