-- Ensure the current super admin user has the super_admin role
-- First, get the user ID from the current session context
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT;
BEGIN
    -- Check if we have a super admin in the system
    SELECT p.user_id, p.email INTO admin_user_id, admin_email
    FROM profiles p
    WHERE p.email LIKE '%khamis%' OR p.email = 'admin@admin.com'
    ORDER BY p.created_at DESC
    LIMIT 1;

    IF admin_user_id IS NOT NULL THEN
        -- Ensure this user has super_admin role
        INSERT INTO user_roles (user_id, role)
        VALUES (admin_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Ensured super_admin role for user: % (email: %)', admin_user_id, admin_email;
    ELSE
        RAISE NOTICE 'No admin user found to assign super_admin role';
    END IF;
END $$;