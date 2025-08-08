-- Temporarily disable RLS on user_roles to assign super admin
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Now manually assign super_admin role to the current admin users
INSERT INTO user_roles (user_id, role) 
SELECT DISTINCT p.user_id, 'super_admin'::user_role
FROM profiles p 
WHERE p.email LIKE '%khamis%' OR p.email = 'admin@admin.com'
ON CONFLICT DO NOTHING;

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;