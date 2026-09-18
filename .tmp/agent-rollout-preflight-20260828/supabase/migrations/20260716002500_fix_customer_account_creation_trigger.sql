CREATE OR REPLACE FUNCTION public.trigger_create_customer_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.create_customer_financial_account_fixed(NEW.id, NEW.company_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create financial account for customer %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
