-- First, let's create a view that shows all users with their complete information
-- This will replace the need for admin.listUsers()
CREATE OR REPLACE VIEW user_management_view AS
SELECT 
  p.user_id as id,
  p.email,
  p.created_at,
  p.first_name,
  p.last_name,
  p.first_name_ar,
  p.last_name_ar,
  p.company_id,
  c.name as company_name,
  c.name_ar as company_name_ar,
  COALESCE(
    json_agg(
      json_build_object('id', ur.id, 'role', ur.role)
    ) FILTER (WHERE ur.id IS NOT NULL), 
    '[]'::json
  ) as user_roles
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
GROUP BY p.user_id, p.email, p.created_at, p.first_name, p.last_name, 
         p.first_name_ar, p.last_name_ar, p.company_id, c.name, c.name_ar
ORDER BY p.created_at DESC;