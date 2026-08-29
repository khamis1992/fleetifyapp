-- Create contract templates table
CREATE TABLE public.contract_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    template_name TEXT NOT NULL,
    template_name_ar TEXT,
    contract_type TEXT NOT NULL,
    default_terms TEXT,
    default_duration_days INTEGER NOT NULL DEFAULT 30,
    auto_calculate_pricing BOOLEAN NOT NULL DEFAULT true,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    approval_threshold NUMERIC NOT NULL DEFAULT 5000,
    account_mappings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view templates in their company"
ON public.contract_templates
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage templates in their company"
ON public.contract_templates
FOR ALL
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- Add update trigger
CREATE TRIGGER update_contract_templates_updated_at
    BEFORE UPDATE ON public.contract_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();;
