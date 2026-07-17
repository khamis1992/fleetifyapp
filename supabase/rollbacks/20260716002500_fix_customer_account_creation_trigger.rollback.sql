CREATE OR REPLACE FUNCTION public.trigger_create_customer_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT public.create_customer_financial_account(NEW.id, NEW.company_id) INTO result;
  IF (result->>'success')::boolean = false THEN
    RAISE WARNING 'Failed to create financial account for customer %: %', NEW.id, result->>'error';
  END IF;
  RETURN NEW;
END;
$$;
