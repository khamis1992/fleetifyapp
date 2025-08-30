-- Update admin user's profile with company_id
UPDATE profiles 
SET company_id = (SELECT id FROM companies WHERE name = 'Bashaer ERP Solutions' LIMIT 1)
WHERE user_id = '33104f93-57e7-4e5d-993f-a1e6be1cb121'
  AND company_id IS NULL;

-- Update ahmed.test@example.com profile with company_id  
UPDATE profiles 
SET company_id = (SELECT id FROM companies WHERE name = 'Bashaer ERP Solutions' LIMIT 1)
WHERE email = 'ahmed.test@example.com'
  AND company_id IS NULL;