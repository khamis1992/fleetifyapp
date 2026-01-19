-- Create tenants table for tenant management
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  tenant_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  phone TEXT,
  email TEXT,
  civil_id TEXT,
  passport_number TEXT,
  nationality TEXT DEFAULT 'Kuwaiti',
  date_of_birth DATE,
  occupation TEXT,
  employer_name TEXT,
  monthly_income DECIMAL(10,2),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  current_address TEXT,
  current_address_ar TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  tenant_type TEXT NOT NULL DEFAULT 'individual',
  notes TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT tenants_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT tenants_tenant_code_company_unique UNIQUE (company_id, tenant_code)
);

-- Create indexes for better performance
CREATE INDEX idx_tenants_company_id ON public.tenants(company_id);
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_tenant_type ON public.tenants(tenant_type);
CREATE INDEX idx_tenants_phone ON public.tenants(phone);
CREATE INDEX idx_tenants_email ON public.tenants(email);
CREATE INDEX idx_tenants_civil_id ON public.tenants(civil_id);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view tenants in their company" 
ON public.tenants 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage tenants in their company" 
ON public.tenants 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role) OR 
    has_role(auth.uid(), 'sales_agent'::user_role)))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role) OR 
    has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- Create trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate tenant code
CREATE OR REPLACE FUNCTION generate_tenant_code(company_id_param UUID, tenant_type_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    max_code INTEGER;
    prefix TEXT;
BEGIN
    -- تحديد البادئة بناء على نوع المستأجر
    prefix := CASE 
        WHEN tenant_type_param = 'individual' THEN 'T-IND'
        WHEN tenant_type_param = 'company' THEN 'T-COM'
        ELSE 'T-MISC'
    END;
    
    -- البحث عن أعلى رقم موجود
    SELECT COALESCE(MAX(
        CASE 
            WHEN tenant_code ~ ('^' || prefix || '-[0-9]+$') 
            THEN CAST(SUBSTRING(tenant_code FROM LENGTH(prefix) + 2) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_code
    FROM tenants 
    WHERE company_id = company_id_param
    AND tenant_code LIKE prefix || '-%';
    
    -- إرجاع الرقم التالي
    RETURN prefix || '-' || LPAD((max_code + 1)::text, 4, '0');
END;
$$;