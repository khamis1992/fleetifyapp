-- First create the unique constraint that's missing
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Now manually assign super_admin role to the current admin users with proper enum casting
INSERT INTO user_roles (user_id, role) 
SELECT DISTINCT p.user_id, 'super_admin'::user_role
FROM profiles p 
WHERE p.email LIKE '%khamis%' OR p.email = 'admin@admin.com'
ON CONFLICT (user_id, role) DO NOTHING;