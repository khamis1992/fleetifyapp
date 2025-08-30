-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  features JSONB DEFAULT '[]',
  max_users INTEGER,
  max_companies INTEGER DEFAULT 1,
  storage_limit_gb INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscription transactions table
CREATE TABLE public.subscription_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  subscription_plan_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KWD',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_method TEXT,
  transaction_reference TEXT,
  billing_period_start DATE,
  billing_period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create system analytics table
CREATE TABLE public.system_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type TEXT NOT NULL, -- counter, gauge, ratio
  category TEXT NOT NULL, -- users, companies, revenue, performance
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  time_period TEXT DEFAULT 'daily', -- hourly, daily, weekly, monthly
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system notifications table
CREATE TABLE public.system_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
  priority TEXT DEFAULT 'normal', -- low, normal, high, critical
  target_audience TEXT DEFAULT 'all', -- all, admins, companies, specific_company
  target_company_id UUID,
  is_active BOOLEAN DEFAULT true,
  is_dismissible BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  action_label TEXT
);

-- Create system settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type TEXT NOT NULL, -- string, number, boolean, json
  category TEXT NOT NULL, -- general, security, billing, features
  description TEXT,
  description_ar TEXT,
  is_public BOOLEAN DEFAULT false,
  requires_restart BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  company_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  severity TEXT DEFAULT 'info' -- info, warning, error, critical
);

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Super admins can manage subscription plans" 
ON public.subscription_plans 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Anyone can view active subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for subscription_transactions
CREATE POLICY "Super admins can manage all transactions" 
ON public.subscription_transactions 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Companies can view their own transactions" 
ON public.subscription_transactions 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- RLS Policies for system_analytics
CREATE POLICY "Super admins can manage analytics" 
ON public.system_analytics 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role));

-- RLS Policies for system_notifications
CREATE POLICY "Super admins can manage notifications" 
ON public.system_notifications 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Users can view relevant notifications" 
ON public.system_notifications 
FOR SELECT 
USING (
  is_active = true AND 
  (expires_at IS NULL OR expires_at > now()) AND
  (
    target_audience = 'all' OR 
    target_company_id = get_user_company(auth.uid()) OR
    (target_audience = 'admins' AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
  )
);

-- RLS Policies for system_settings
CREATE POLICY "Super admins can manage settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Users can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (is_public = true);

-- RLS Policies for audit_logs
CREATE POLICY "Super admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Companies can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)));

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, name_ar, description, price, billing_cycle, features, max_users, storage_limit_gb, is_default) VALUES
('Basic', 'أساسي', 'Essential features for small businesses', 50, 'monthly', '["User Management", "Basic Reports", "Email Support"]', 5, 5, true),
('Professional', 'احترافي', 'Advanced features for growing businesses', 100, 'monthly', '["User Management", "Advanced Reports", "Priority Support", "API Access"]', 25, 25, false),
('Enterprise', 'مؤسسي', 'Full features for large organizations', 200, 'monthly', '["Unlimited Users", "Custom Reports", "24/7 Support", "API Access", "Custom Integrations"]', NULL, 100, false);

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('maintenance_mode', 'false', 'boolean', 'general', 'Enable maintenance mode', true),
('default_currency', '"KWD"', 'string', 'general', 'Default system currency', true),
('max_file_upload_size', '10', 'number', 'general', 'Maximum file upload size in MB', false),
('session_timeout', '3600', 'number', 'security', 'Session timeout in seconds', false),
('password_min_length', '8', 'number', 'security', 'Minimum password length', true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_transactions_updated_at
    BEFORE UPDATE ON public.subscription_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();