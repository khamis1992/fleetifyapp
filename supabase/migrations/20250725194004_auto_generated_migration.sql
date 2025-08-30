-- Create permission_change_requests table for handling permission/role change approvals
CREATE TABLE public.permission_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('role_change', 'permission_add', 'permission_remove')),
  current_roles TEXT[] DEFAULT '{}',
  requested_roles TEXT[] DEFAULT '{}',
  current_permissions TEXT[] DEFAULT '{}',
  requested_permissions TEXT[] DEFAULT '{}',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.permission_change_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view permission requests in their company"
  ON public.permission_change_requests
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage permission requests"
  ON public.permission_change_requests
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
  );

-- Create update trigger
CREATE TRIGGER update_permission_change_requests_updated_at
  BEFORE UPDATE ON public.permission_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_permission_change_requests_status ON public.permission_change_requests(status);
CREATE INDEX idx_permission_change_requests_company ON public.permission_change_requests(company_id);
CREATE INDEX idx_permission_change_requests_employee ON public.permission_change_requests(employee_id);