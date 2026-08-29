-- Fix search_path using ALTER FUNCTION - Final Batch
-- The last 5 functions

ALTER FUNCTION public.url_encode(text) SET search_path = '';
ALTER FUNCTION public.validate_account_hierarchy() SET search_path = '';
ALTER FUNCTION public.validate_account_linking() SET search_path = '';
ALTER FUNCTION public.validate_customer_phone_numbers() SET search_path = '';
ALTER FUNCTION public.validate_user_transfer(uuid, uuid, uuid) SET search_path = '';;
