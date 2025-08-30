-- Create user_permissions table for custom user permissions
CREATE TABLE public.user_permissions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    permission_id text NOT NULL,
    granted boolean NOT NULL DEFAULT false,
    granted_by uuid REFERENCES auth.users(id),
    granted_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for user permissions
CREATE POLICY "Users can view user permissions in their company" 
ON public.user_permissions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = user_permissions.user_id 
        AND p.company_id = get_user_company(auth.uid())
    )
);

CREATE POLICY "Admins can manage user permissions in their company" 
ON public.user_permissions 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = user_permissions.user_id 
            AND p.company_id = get_user_company(auth.uid())
        ) AND (
            has_role(auth.uid(), 'company_admin'::user_role) OR 
            has_role(auth.uid(), 'manager'::user_role)
        )
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();