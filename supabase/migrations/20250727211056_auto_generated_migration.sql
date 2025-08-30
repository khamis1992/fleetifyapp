-- Simple update to associate the user with "البشائر الخليجية" company
UPDATE public.profiles 
SET company_id = '1ddee958-dd87-4aeb-a7ae-7a46b72aa46f',
    updated_at = now()
WHERE user_id = '78af5030-1b7c-4068-9749-4b892109b1be';