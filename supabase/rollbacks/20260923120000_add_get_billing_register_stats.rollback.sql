-- Reverts add_get_billing_register_stats
DROP FUNCTION IF EXISTS public.get_billing_register_stats(uuid);