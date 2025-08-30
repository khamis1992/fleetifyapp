-- Manual fix for current user profile and role without conflict issues
-- Create profiles for auth users who don't have one
INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    first_name_ar,
    last_name_ar,
    email
)
SELECT 
    au.id,
    'Super',
    'Admin',
    'سوبر', 
    'أدمن',
    au.email
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
);

-- Add super_admin role for users who don't have it if no super admin exists
INSERT INTO public.user_roles (user_id, role)
SELECT 
    au.id,
    'super_admin'::user_role
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.role = 'super_admin'
)
AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = au.id AND ur2.role = 'super_admin'
);