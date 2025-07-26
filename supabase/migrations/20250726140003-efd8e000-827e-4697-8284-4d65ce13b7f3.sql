-- Ensure the trigger exists on customers table to create financial accounts
DROP TRIGGER IF EXISTS trigger_create_customer_account ON public.customers;

CREATE TRIGGER trigger_create_customer_account
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.create_customer_account_trigger();