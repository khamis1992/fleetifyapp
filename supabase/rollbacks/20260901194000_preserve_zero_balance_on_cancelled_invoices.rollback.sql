CREATE OR REPLACE FUNCTION public.ensure_invoice_balance_due()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.balance_due IS NULL OR NEW.balance_due = 0)
     AND COALESCE(NEW.paid_amount, 0) = 0
  THEN
    NEW.balance_due := NEW.total_amount;
  END IF;
  RETURN NEW;
END;
$$;
