-- Manual fix for current user profile and role
-- Get all auth users and create profiles for them
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

-- Add super_admin role for all existing users if none exist
INSERT INTO public.user_roles (user_id, role)
SELECT 
    au.id,
    'super_admin'::user_role
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.role = 'super_admin'
)
ON CONFLICT (user_id, role) DO NOTHING;