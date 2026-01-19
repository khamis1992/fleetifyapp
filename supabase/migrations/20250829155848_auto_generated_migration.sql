-- Add electronic signature settings to company settings
CREATE TABLE IF NOT EXISTS public.company_signature_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    electronic_signature_enabled boolean NOT NULL DEFAULT true,
    require_customer_signature boolean NOT NULL DEFAULT true,
    require_company_signature boolean NOT NULL DEFAULT true,
    signature_provider text DEFAULT 'internal',
    settings jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(company_id)
);

-- Enable RLS on the new table
ALTER TABLE public.company_signature_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for signature settings
CREATE POLICY "Users can view signature settings in their company"
ON public.company_signature_settings
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage signature settings in their company"
ON public.company_signature_settings
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::user_role) OR
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- Insert default settings for existing companies
INSERT INTO public.company_signature_settings (company_id, electronic_signature_enabled)
SELECT id, true 
FROM public.companies 
WHERE id NOT IN (SELECT company_id FROM public.company_signature_settings);

-- Add function to get signature settings
CREATE OR REPLACE FUNCTION public.get_company_signature_settings(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    settings_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'electronic_signature_enabled', electronic_signature_enabled,
        'require_customer_signature', require_customer_signature,
        'require_company_signature', require_company_signature,
        'signature_provider', signature_provider,
        'settings', settings
    )
    INTO settings_result
    FROM public.company_signature_settings
    WHERE company_id = company_id_param;
    
    -- Return default settings if none found
    IF settings_result IS NULL THEN
        RETURN jsonb_build_object(
            'electronic_signature_enabled', true,
            'require_customer_signature', true,
            'require_company_signature', true,
            'signature_provider', 'internal',
            'settings', '{}'
        );
    END IF;
    
    RETURN settings_result;
END;
$$;