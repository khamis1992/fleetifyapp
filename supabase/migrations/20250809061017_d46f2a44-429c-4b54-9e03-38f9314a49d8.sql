-- Fix RLS policies for user_roles table to allow service_role operations
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their company" ON public.user_roles;

-- Create new policies that work with service_role
CREATE POLICY "Service role can manage all user roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Super admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Company admins can manage roles in their company"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'company_admin'::user_role) AND
  EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = user_roles.user_id
    AND p1.company_id = p2.company_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'company_admin'::user_role) AND
  EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = user_roles.user_id
    AND p1.company_id = p2.company_id
  )
);

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Add similar fixes for profiles table if needed
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

CREATE POLICY "Service role can manage all profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Company admins can manage profiles in their company"
ON public.profiles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'company_admin'::user_role) AND
  company_id = get_user_company(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'company_admin'::user_role) AND
  company_id = get_user_company(auth.uid())
);

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());