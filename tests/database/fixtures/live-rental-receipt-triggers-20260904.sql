-- Read-only production function snapshots, inspected 2026-09-04.
-- Test fixture only, not a migration. All four remaining receipt triggers.

-- calculate_rental_payment_balance: 0b2b7b7680e47cf7128c1fbe670e7ce7
CREATE OR REPLACE FUNCTION public.calculate_rental_payment_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- Calculate pending balance
  NEW.pending_balance := GREATEST(0, NEW.amount_due - NEW.total_paid);
  
  -- Determine payment status
  IF NEW.total_paid >= NEW.amount_due THEN
    NEW.payment_status := 'paid';
  ELSIF NEW.total_paid > 0 THEN
    NEW.payment_status := 'partial';
  ELSE
    NEW.payment_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- generate_receipt_number: ab3789bb876ba98b2eb3a41ffec9e2a1
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    year_suffix TEXT;
    seq_num TEXT;
BEGIN
    IF NEW.receipt_number IS NULL THEN
        year_suffix := TO_CHAR(NEW.payment_date, 'YY');
        seq_num := LPAD(nextval('public.receipt_number_seq')::TEXT, 6, '0');
        NEW.receipt_number := 'RCP-' || year_suffix || '-' || seq_num;
        NEW.fiscal_year := EXTRACT(YEAR FROM NEW.payment_date);
    END IF;
    RETURN NEW;
END;
$function$;

-- mark_late_rental_payment: 0703b8c17861232a522141662a263a6c
CREATE OR REPLACE FUNCTION public.mark_late_rental_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Mark as late if payment date is after the 1st of the month
    NEW.is_late := (EXTRACT(DAY FROM NEW.payment_date) > 1);
    
    RETURN NEW;
END;
$function$;

-- update_rental_receipt_updated_at: ef6b2d76360a727c9d6479352655b7ba
CREATE OR REPLACE FUNCTION public.update_rental_receipt_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;
