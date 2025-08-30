-- Step 1: Ensure handle_new_user function works correctly for Super Admins
-- Update the function to create better default profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile with better defaults
    INSERT INTO public.profiles (
        user_id, 
        first_name, 
        last_name, 
        first_name_ar,
        last_name_ar,
        email
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Super'),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Admin'),
        COALESCE(NEW.raw_user_meta_data ->> 'first_name_ar', 'سوبر'),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name_ar', 'أدمن'),
        NEW.email
    );
    
    -- Check if this is the first user (likely Super Admin)
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
        -- Create super_admin role for the first user
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'super_admin');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 2: Create or update profile for current user if it doesn't exist
DO $$
DECLARE
    current_auth_user_id uuid;
    current_email text;
BEGIN
    -- Get current authenticated user from auth schema (this only works if run by authenticated user)
    SELECT id, email INTO current_auth_user_id, current_email 
    FROM auth.users 
    WHERE id = auth.uid();
    
    IF current_auth_user_id IS NOT NULL THEN
        -- Insert profile if it doesn't exist
        INSERT INTO public.profiles (
            user_id, 
            first_name, 
            last_name, 
            first_name_ar,
            last_name_ar,
            email
        )
        VALUES (
            current_auth_user_id,
            'Super',
            'Admin', 
            'سوبر',
            'أدمن',
            current_email
        )
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = now();
        
        -- Add super_admin role if no super admin exists
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (current_auth_user_id, 'super_admin')
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    END IF;
END $$;

-- Step 3: Update RLS policies to be more permissive for Super Admins
-- Update customers table policies to allow Super Admins to work with any company
DROP POLICY IF EXISTS "Super admins have full access to customers" ON public.customers;
CREATE POLICY "Super admins have full access to customers" 
ON public.customers 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

-- Update the existing staff policy to exclude super admins to avoid conflicts
DROP POLICY IF EXISTS "Staff can manage customers in their company" ON public.customers;
CREATE POLICY "Staff can manage customers in their company" 
ON public.customers 
FOR ALL 
USING (
    NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))
)
WITH CHECK (
    NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))
);

-- Update the view policy for regular users
DROP POLICY IF EXISTS "Users can view customers in their company" ON public.customers;
CREATE POLICY "Users can view customers in their company" 
ON public.customers 
FOR SELECT 
USING (
    NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
    company_id = get_user_company(auth.uid())
);