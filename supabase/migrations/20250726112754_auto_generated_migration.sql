-- Fix data inconsistencies for admin@bashaererp.com
-- First, find the admin user's UUID
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@bashaererp.com'
),
bashaer_company AS (
  SELECT id FROM companies WHERE name = 'Bashaer ERP Solutions' OR name_ar = 'شركة بشائر لحلول تخطيط موارد المؤسسات'
)
-- Update the admin user's profile with proper company_id
UPDATE profiles 
SET company_id = (SELECT id FROM bashaer_company LIMIT 1)
WHERE user_id = (SELECT id FROM admin_user LIMIT 1)
  AND company_id IS NULL;

-- Assign super_admin role to admin@bashaererp.com if they don't have roles
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@bashaererp.com'
)
INSERT INTO user_roles (user_id, role)
SELECT (SELECT id FROM admin_user), 'super_admin'
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = (SELECT id FROM admin_user)
);

-- Fix ahmed.test@example.com company_id issue
WITH ahmed_user AS (
  SELECT id FROM auth.users WHERE email = 'ahmed.test@example.com'
),
bashaer_company AS (
  SELECT id FROM companies WHERE name = 'Bashaer ERP Solutions' OR name_ar = 'شركة بشائر لحلول تخطيط موارد المؤسسات'
)
UPDATE profiles 
SET company_id = (SELECT id FROM bashaer_company LIMIT 1)
WHERE user_id = (SELECT id FROM ahmed_user LIMIT 1)
  AND company_id IS NULL;