-- Fix the security definer view by removing it and adding proper RLS policies
DROP VIEW IF EXISTS user_management_view;

-- Add RLS policy for super admins to view all profiles
CREATE POLICY "Super admins can view all profiles" 
ON profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- Add RLS policy for super admins to view all user roles
CREATE POLICY "Super admins can view all user roles" 
ON user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));