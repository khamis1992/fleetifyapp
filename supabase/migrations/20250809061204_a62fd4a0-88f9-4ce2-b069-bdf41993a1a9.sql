-- Fix RLS policies for user_roles table to allow service_role operations
-- Add service role policy if it doesn't exist
DO $$
BEGIN
    -- Drop and recreate service role policy for user_roles
    DROP POLICY IF EXISTS "Service role can manage all user roles" ON public.user_roles;
    CREATE POLICY "Service role can manage all user roles"
    ON public.user_roles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    -- Drop and recreate service role policy for profiles
    DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
    CREATE POLICY "Service role can manage all profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;