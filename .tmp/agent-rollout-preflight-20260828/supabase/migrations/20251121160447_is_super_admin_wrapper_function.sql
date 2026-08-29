-- Create wrapper function for is_super_admin that takes no parameters
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT public.is_super_admin(auth.uid());
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated, anon;;
