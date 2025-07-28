-- إنشاء نظام الموافقات الشامل
-- Create unified approval system

-- نوع حالة الموافقة
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- نوع أولوية الموافقة  
CREATE TYPE approval_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- نوع مصدر الطلب
CREATE TYPE request_source AS ENUM (
  'payroll', 'contract', 'payment', 'expense', 'purchase', 
  'leave_request', 'vehicle_maintenance', 'budget', 'other'
);

-- جدول قوالب سير العمل
CREATE TABLE public.approval_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  workflow_name TEXT NOT NULL,
  workflow_name_ar TEXT,
  description TEXT,
  source_type request_source NOT NULL,
  conditions JSONB DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول طلبات الموافقة
CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id),
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_type request_source NOT NULL,
  source_id UUID, -- ID of the related record (payroll, contract, etc.)
  requested_by UUID NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  priority approval_priority DEFAULT 'medium',
  status approval_status DEFAULT 'pending',
  current_step_order INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(company_id, request_number)
);

-- جدول خطوات الموافقة
CREATE TABLE public.approval_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_type TEXT NOT NULL, -- 'role', 'user', 'any_role'
  approver_value TEXT NOT NULL, -- role name or user_id
  approver_id UUID, -- resolved user_id
  status approval_status DEFAULT 'pending',
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(request_id, step_order)
);

-- جدول إعدادات سير العمل للشركات
CREATE TABLE public.workflow_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  source_type request_source NOT NULL,
  default_workflow_id UUID REFERENCES public.approval_workflows(id),
  auto_assign_enabled BOOLEAN DEFAULT true,
  notification_settings JSONB DEFAULT '{}',
  escalation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(company_id, source_type)
);

-- جدول إشعارات الموافقة
CREATE TABLE public.approval_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'pending', 'approved', 'rejected', 'escalated'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- إضافة فهارس للأداء
CREATE INDEX idx_approval_workflows_company_source ON public.approval_workflows(company_id, source_type);
CREATE INDEX idx_approval_requests_company_status ON public.approval_requests(company_id, status);
CREATE INDEX idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX idx_approval_steps_request_order ON public.approval_steps(request_id, step_order);
CREATE INDEX idx_approval_steps_approver ON public.approval_steps(approver_id, status);
CREATE INDEX idx_approval_notifications_recipient ON public.approval_notifications(recipient_id, is_read);

-- تفعيل RLS لجميع الجداول
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_notifications ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول سير العمل
CREATE POLICY "Admins can manage workflows in their company" 
ON public.approval_workflows 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "Users can view workflows in their company" 
ON public.approval_workflows 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- سياسات الأمان لجدول طلبات الموافقة
CREATE POLICY "Users can view requests in their company" 
ON public.approval_requests 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create requests in their company" 
ON public.approval_requests 
FOR INSERT 
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND 
  requested_by = auth.uid()
);

CREATE POLICY "Admins can manage all requests in their company" 
ON public.approval_requests 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)))
);

-- سياسات الأمان لجدول خطوات الموافقة
CREATE POLICY "Users can view steps for their company requests" 
ON public.approval_steps 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.approval_requests ar 
    WHERE ar.id = request_id AND ar.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "Approvers can update their assigned steps" 
ON public.approval_steps 
FOR UPDATE 
USING (
  approver_id = auth.uid() OR
  (has_role(auth.uid(), 'super_admin'::user_role) OR 
   EXISTS (
     SELECT 1 FROM public.approval_requests ar 
     WHERE ar.id = request_id AND ar.company_id = get_user_company(auth.uid()) AND
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role))
   ))
);

-- سياسات الأمان لجدول إعدادات سير العمل
CREATE POLICY "Admins can manage workflow configs in their company" 
ON public.workflow_configurations 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)))
);

-- سياسات الأمان لجدول الإشعارات
CREATE POLICY "Users can view their own notifications" 
ON public.approval_notifications 
FOR SELECT 
USING (recipient_id = auth.uid());

CREATE POLICY "System can manage notifications" 
ON public.approval_notifications 
FOR ALL 
USING (true);

-- دالة لتوليد رقم طلب الموافقة
CREATE OR REPLACE FUNCTION generate_approval_request_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد الطلبات الموجودة للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO request_count
    FROM public.approval_requests 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم الطلب المنسق
    RETURN 'APR-' || year_suffix || '-' || LPAD(request_count::TEXT, 4, '0');
END;
$$;

-- دالة لتحديث حالة طلب الموافقة
CREATE OR REPLACE FUNCTION update_approval_request_status(request_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pending_steps INTEGER;
    total_steps INTEGER;
    rejected_steps INTEGER;
BEGIN
    -- عد الخطوات المختلفة
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'rejected')
    INTO pending_steps, total_steps, rejected_steps
    FROM public.approval_steps 
    WHERE request_id = request_id_param;
    
    -- تحديث حالة الطلب
    IF rejected_steps > 0 THEN
        UPDATE public.approval_requests 
        SET status = 'rejected', completed_at = now() 
        WHERE id = request_id_param;
    ELSIF pending_steps = 0 THEN
        UPDATE public.approval_requests 
        SET status = 'approved', completed_at = now() 
        WHERE id = request_id_param;
    END IF;
END;
$$;

-- تريجر لتحديث حالة الطلب عند تغيير خطوة
CREATE OR REPLACE FUNCTION trigger_update_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM update_approval_request_status(NEW.request_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_request_status_trigger
    AFTER UPDATE ON public.approval_steps
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_request_status();

-- تريجر لتحديث updated_at
CREATE TRIGGER update_approval_workflows_updated_at
    BEFORE UPDATE ON public.approval_workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approval_requests_updated_at
    BEFORE UPDATE ON public.approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_configurations_updated_at
    BEFORE UPDATE ON public.workflow_configurations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();