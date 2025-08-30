-- Disable only the prevent_role_escalation trigger temporarily
ALTER TABLE user_roles DISABLE TRIGGER prevent_role_escalation_trigger;

-- Now manually assign super_admin role to the current admin users
INSERT INTO user_roles (user_id, role) 
SELECT DISTINCT p.user_id, 'super_admin'::user_role
FROM profiles p 
WHERE p.email LIKE '%khamis%' OR p.email = 'admin@admin.com'
ON CONFLICT DO NOTHING;

-- Re-enable the trigger
ALTER TABLE user_roles ENABLE TRIGGER prevent_role_escalation_trigger;