DROP TRIGGER IF EXISTS sync_contract_last_payment_date_trigger ON public.payments;
DROP FUNCTION IF EXISTS public.sync_contract_last_payment_date_from_payment();
