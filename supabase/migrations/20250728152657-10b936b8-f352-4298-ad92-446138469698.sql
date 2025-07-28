-- Create company branding settings table
CREATE TABLE IF NOT EXISTS public.company_branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  system_name TEXT,
  system_name_ar TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#2563eb', -- Blue
  secondary_color TEXT DEFAULT '#f59e0b', -- Yellow  
  accent_color TEXT DEFAULT '#dc2626', -- Red
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1f2937',
  font_family TEXT DEFAULT 'cairo',
  theme_preset TEXT DEFAULT 'default',
  custom_css TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_branding_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view branding settings in their company"
ON public.company_branding_settings
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage branding settings in their company"
ON public.company_branding_settings
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)))
);

-- Create trigger for updated_at
CREATE TRIGGER update_company_branding_settings_updated_at
  BEFORE UPDATE ON public.company_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();