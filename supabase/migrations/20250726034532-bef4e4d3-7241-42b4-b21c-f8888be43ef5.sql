-- Create HR settings table
CREATE TABLE public.hr_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  
  -- Attendance settings
  daily_working_hours NUMERIC NOT NULL DEFAULT 8,
  working_days_per_week INTEGER NOT NULL DEFAULT 5,
  work_start_time TIME NOT NULL DEFAULT '08:00:00',
  work_end_time TIME NOT NULL DEFAULT '17:00:00',
  auto_calculate_overtime BOOLEAN NOT NULL DEFAULT true,
  allow_negative_balance BOOLEAN NOT NULL DEFAULT false,
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  
  -- Payroll settings
  overtime_rate_percentage NUMERIC NOT NULL DEFAULT 150,
  late_penalty_per_hour NUMERIC NOT NULL DEFAULT 0,
  social_security_rate NUMERIC NOT NULL DEFAULT 11,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  payroll_frequency TEXT NOT NULL DEFAULT 'monthly',
  pay_date INTEGER NOT NULL DEFAULT 1,
  
  -- Leave settings
  annual_leave_days INTEGER NOT NULL DEFAULT 30,
  sick_leave_days INTEGER NOT NULL DEFAULT 15,
  casual_leave_days INTEGER NOT NULL DEFAULT 5,
  
  -- System settings
  require_manager_approval BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  sms_notifications BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage HR settings in their company" 
ON public.hr_settings 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "Users can view HR settings in their company" 
ON public.hr_settings 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_hr_settings_updated_at
  BEFORE UPDATE ON public.hr_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings for existing companies
INSERT INTO public.hr_settings (company_id)
SELECT id FROM public.companies
WHERE id NOT IN (SELECT company_id FROM public.hr_settings WHERE company_id IS NOT NULL);