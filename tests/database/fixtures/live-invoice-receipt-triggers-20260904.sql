-- Read-only snapshots inspected on 2026-09-04. Executed only in isolated tests.
-- Not a migration: retains the production conflict for regression evidence.

CREATE OR REPLACE FUNCTION public.guard_canonical_rental_receipt_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.canonical_payment_id IS NOT NULL
       AND COALESCE(current_setting('app.rental_receipt_payment_v1', true), '') <> 'authorized'
    THEN
      RAISE EXCEPTION 'Canonical rental receipts cannot be deleted; reverse the linked payment instead'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.canonical_payment_id IS NOT NULL
     AND (
       NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.contract_id IS DISTINCT FROM OLD.contract_id
       OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
       OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
       OR NEW.month IS DISTINCT FROM OLD.month
       OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
       OR NEW.rent_amount IS DISTINCT FROM OLD.rent_amount
       OR NEW.fine IS DISTINCT FROM OLD.fine
       OR NEW.total_paid IS DISTINCT FROM OLD.total_paid
       OR NEW.amount_due IS DISTINCT FROM OLD.amount_due
       OR NEW.pending_balance IS DISTINCT FROM OLD.pending_balance
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
       OR NEW.canonical_payment_id IS DISTINCT FROM OLD.canonical_payment_id
     )
     AND COALESCE(current_setting('app.rental_receipt_payment_v1', true), '') <> 'authorized'
  THEN
    RAISE EXCEPTION 'Canonical rental receipt financial fields are immutable; reverse the linked payment instead'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_receipt_on_invoice_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status IN ('paid', 'partial') AND
     (OLD.payment_status != NEW.payment_status OR OLD.paid_amount != NEW.paid_amount) THEN

    UPDATE public.rental_payment_receipts
    SET total_paid = NEW.paid_amount,
        pending_balance = GREATEST(0, NEW.total_amount - NEW.paid_amount),
        payment_status = CASE
          WHEN NEW.payment_status = 'paid' THEN 'paid'
          WHEN NEW.payment_status = 'partial' THEN 'partial'
          ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE invoice_id = NEW.id;

    IF NOT FOUND THEN
      INSERT INTO public.rental_payment_receipts (
        company_id, customer_id, customer_name, month, rent_amount,
        payment_date, fine, total_paid, amount_due, pending_balance,
        payment_status, contract_id, vehicle_id, invoice_id, created_at, updated_at
      )
      SELECT
        i.company_id, c.customer_id,
        TRIM(CONCAT(
          COALESCE(cust.first_name_ar, cust.first_name, ''),
          ' ',
          COALESCE(cust.last_name_ar, cust.last_name, '')
        )),
        TO_CHAR(i.due_date, 'TMMonth YYYY'),
        i.total_amount, i.due_date, 0,
        NEW.paid_amount, i.total_amount,
        GREATEST(0, i.total_amount - NEW.paid_amount),
        CASE WHEN NEW.payment_status = 'paid' THEN 'paid' ELSE 'partial' END,
        c.id, c.vehicle_id, i.id, NOW(), NOW()
      FROM public.invoices i
      JOIN public.contracts c ON i.contract_id = c.id
      JOIN public.customers cust ON c.customer_id = cust.id
      WHERE i.id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
