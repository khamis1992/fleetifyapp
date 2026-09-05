-- Read-only catalog capture, 2026-09-04. Test fixture, never a deployment script.
CREATE OR REPLACE FUNCTION public.normalize_contract_payment_schedule_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(COALESCE(NEW.status, '')) = 'partial' THEN
    NEW.status := 'partially_paid';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.preserve_inactive_duplicate_schedule_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_inactive boolean := lower(coalesce(OLD.status, '')) IN (
    'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
  );
  v_new_active boolean := lower(coalesce(NEW.status, '')) NOT IN (
    'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
  );
BEGIN
  IF v_old_inactive
     AND v_new_active
     AND EXISTS (
       SELECT 1
       FROM public.contract_payment_schedules other_schedule
       WHERE other_schedule.id <> OLD.id
         AND other_schedule.company_id = OLD.company_id
         AND other_schedule.contract_id = OLD.contract_id
         AND other_schedule.due_date IS NOT DISTINCT FROM OLD.due_date
         AND lower(coalesce(other_schedule.status, '')) NOT IN (
           'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
         )
     )
  THEN
    NEW.status := OLD.status;
    NEW.invoice_id := OLD.invoice_id;
    NEW.paid_amount := OLD.paid_amount;
    NEW.paid_date := OLD.paid_date;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_payment_schedule_with_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_schedule_id UUID;
  v_invoice_month TEXT;
  v_paid_amount DECIMAL(12,2);
  v_schedule_amount DECIMAL(12,2);
  v_new_status TEXT;
BEGIN
  v_invoice_month := TO_CHAR(COALESCE(NEW.due_date, NEW.invoice_date), 'YYYY-MM');

  SELECT id, amount INTO v_schedule_id, v_schedule_amount
  FROM contract_payment_schedules
  WHERE contract_id = NEW.contract_id
    AND TO_CHAR(due_date, 'YYYY-MM') = v_invoice_month
  ORDER BY installment_number
  LIMIT 1;

  IF v_schedule_id IS NOT NULL THEN
    v_paid_amount := COALESCE(NEW.paid_amount, 0);
    
    IF v_paid_amount >= NEW.total_amount THEN
      v_new_status := 'paid';
    ELSIF v_paid_amount > 0 THEN
      v_new_status := 'partially_paid';
    ELSIF NEW.due_date < CURRENT_DATE THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := 'pending';
    END IF;

    UPDATE contract_payment_schedules
    SET 
      status = v_new_status,
      paid_amount = v_paid_amount,
      paid_date = CASE WHEN v_paid_amount >= v_schedule_amount THEN CURRENT_DATE ELSE paid_date END,
      invoice_id = NEW.id,
      updated_at = NOW()
    WHERE id = v_schedule_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_schedule_with_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- تحديث القسط المرتبط بالفاتورة
  UPDATE contract_payment_schedules
  SET 
    status = CASE 
      WHEN COALESCE(NEW.paid_amount, 0) >= NEW.total_amount THEN 'paid'
      WHEN COALESCE(NEW.paid_amount, 0) > 0 THEN 'partially_paid'
      WHEN NEW.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    paid_amount = COALESCE(NEW.paid_amount, 0),
    updated_at = NOW()
  WHERE invoice_id = NEW.id;
  
  RETURN NEW;
END;
$function$;
