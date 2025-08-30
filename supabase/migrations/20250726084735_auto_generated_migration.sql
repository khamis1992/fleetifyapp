-- إنشاء جدول خطوات الموافقة للعقود
CREATE TABLE public.contract_approval_steps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    step_order INTEGER NOT NULL,
    approver_role TEXT NOT NULL,
    approver_id UUID,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(contract_id, step_order)
);

-- إنشاء جدول قوالب الموافقة
CREATE TABLE public.approval_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    template_name TEXT NOT NULL,
    contract_type TEXT NOT NULL,
    min_amount NUMERIC DEFAULT 0,
    max_amount NUMERIC,
    steps JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول إشعارات العقود
CREATE TABLE public.contract_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('expiry_warning', 'renewal_reminder', 'approval_required', 'status_change')),
    recipient_id UUID NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول إعدادات الإشعارات
CREATE TABLE public.notification_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    expiry_reminder_days INTEGER DEFAULT 30,
    renewal_reminder_days INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE public.contract_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان لجدول خطوات الموافقة
CREATE POLICY "Users can view approval steps in their company" 
ON public.contract_approval_steps 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage approval steps in their company" 
ON public.contract_approval_steps 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))));

-- إنشاء سياسات الأمان لجدول قوالب الموافقة
CREATE POLICY "Users can view approval templates in their company" 
ON public.approval_templates 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage approval templates in their company" 
ON public.approval_templates 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))));

-- إنشاء سياسات الأمان لجدول إشعارات العقود
CREATE POLICY "Users can view their notifications" 
ON public.contract_notifications 
FOR SELECT 
USING (recipient_id = auth.uid() OR company_id = get_user_company(auth.uid()));

CREATE POLICY "System can manage notifications" 
ON public.contract_notifications 
FOR ALL 
USING (true);

-- إنشاء سياسات الأمان لجدول إعدادات الإشعارات
CREATE POLICY "Users can manage their notification settings" 
ON public.notification_settings 
FOR ALL 
USING (user_id = auth.uid());

-- إضافة مفاتيح خارجية
ALTER TABLE public.contract_approval_steps 
ADD CONSTRAINT fk_contract_approval_steps_contract 
FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

ALTER TABLE public.contract_notifications 
ADD CONSTRAINT fk_contract_notifications_contract 
FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- إضافة فهارس للأداء
CREATE INDEX idx_contract_approval_steps_contract_id ON public.contract_approval_steps(contract_id);
CREATE INDEX idx_contract_approval_steps_status ON public.contract_approval_steps(status);
CREATE INDEX idx_approval_templates_company_type ON public.approval_templates(company_id, contract_type);
CREATE INDEX idx_contract_notifications_recipient ON public.contract_notifications(recipient_id);
CREATE INDEX idx_contract_notifications_status ON public.contract_notifications(delivery_status);

-- إضافة triggers للتحديث التلقائي
CREATE TRIGGER update_contract_approval_steps_updated_at
    BEFORE UPDATE ON public.contract_approval_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approval_templates_updated_at
    BEFORE UPDATE ON public.approval_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();