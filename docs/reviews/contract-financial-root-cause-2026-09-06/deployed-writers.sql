-- Captured read-only 2026-09-06: cancel_contract_future_schedules
CREATE OR REPLACE FUNCTION public.cancel_contract_future_schedules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(COALESCE(NEW.status, '')) IN ('cancelled', 'canceled')
     AND lower(COALESCE(OLD.status, '')) NOT IN ('cancelled', 'canceled')
  THEN
    -- Future unpaid unlinked rows become cancelled with the contract.
    UPDATE public.contract_payment_schedules AS schedule
    SET status = 'cancelled',
        invoice_id = NULL,
        updated_at = now()
    WHERE schedule.contract_id = NEW.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND schedule.invoice_id IS NULL
      AND round(COALESCE(schedule.paid_amount, 0)::numeric, 2) <= 0.01;

    -- Rows linked to a dead invoice cannot prove settlement; cancel and detach.
    UPDATE public.contract_payment_schedules AS schedule
    SET status = 'cancelled',
        invoice_id = NULL,
        updated_at = now()
    WHERE schedule.contract_id = NEW.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND EXISTS (
        SELECT 1
        FROM public.invoices AS invoice
        WHERE invoice.id = schedule.invoice_id
          AND lower(COALESCE(invoice.status, '')) IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted'
          )
      );
  END IF;

  RETURN NEW;
END;
$function$


-- Captured read-only 2026-09-06: detach_schedules_on_invoice_cancel
CREATE OR REPLACE FUNCTION public.detach_schedules_on_invoice_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF lower(COALESCE(NEW.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
     OR lower(COALESCE(NEW.payment_status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
  THEN
    UPDATE public.contract_payment_schedules AS schedule
    SET invoice_id = NULL,
        updated_at = now()
    WHERE schedule.invoice_id = NEW.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );
  END IF;
  RETURN NEW;
END;
$function$


-- Captured read-only 2026-09-06: update_contract_balance
CREATE OR REPLACE FUNCTION public.update_contract_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    new_total_paid NUMERIC;
    new_balance_due NUMERIC;
    new_payment_status TEXT;
BEGIN
    -- Only process if contract_id is present and it's a receipt
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.contract_id IS NOT NULL AND NEW.transaction_type = 'receipt' THEN
        -- Get contract details
        SELECT contract_amount, total_paid, balance_due INTO contract_record
        FROM public.contracts WHERE id = NEW.contract_id;
        
        IF FOUND THEN
            -- Calculate new totals for INSERT
            IF TG_OP = 'INSERT' THEN
                new_total_paid := COALESCE(contract_record.total_paid, 0) + NEW.amount;
            -- Calculate new totals for UPDATE (adjust for amount difference)
            ELSIF TG_OP = 'UPDATE' THEN
                new_total_paid := COALESCE(contract_record.total_paid, 0) - COALESCE(OLD.amount, 0) + NEW.amount;
            END IF;
            
            new_balance_due := contract_record.contract_amount - new_total_paid;
            
            -- Determine payment status
            IF new_total_paid >= contract_record.contract_amount THEN
                new_payment_status := 'paid';
            ELSIF new_total_paid > 0 THEN
                new_payment_status := 'partial';
            ELSE
                new_payment_status := 'unpaid';
            END IF;
            
            -- Update contract
            UPDATE public.contracts 
            SET 
                total_paid = new_total_paid,
                balance_due = GREATEST(0, new_balance_due),
                payment_status = new_payment_status,
                last_payment_date = NEW.payment_date,
                updated_at = now()
            WHERE id = NEW.contract_id;
        END IF;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' AND OLD.contract_id IS NOT NULL AND OLD.transaction_type = 'receipt' THEN
        -- Get contract details
        SELECT contract_amount, total_paid INTO contract_record
        FROM public.contracts WHERE id = OLD.contract_id;
        
        IF FOUND THEN
            new_total_paid := GREATEST(0, COALESCE(contract_record.total_paid, 0) - OLD.amount);
            new_balance_due := contract_record.contract_amount - new_total_paid;
            
            -- Determine payment status
            IF new_total_paid >= contract_record.contract_amount THEN
                new_payment_status := 'paid';
            ELSIF new_total_paid > 0 THEN
                new_payment_status := 'partial';
            ELSE
                new_payment_status := 'unpaid';
            END IF;
            
            -- Update contract
            UPDATE public.contracts 
            SET 
                total_paid = new_total_paid,
                balance_due = GREATEST(0, new_balance_due),
                payment_status = new_payment_status,
                updated_at = now()
            WHERE id = OLD.contract_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$


-- Captured read-only 2026-09-06: update_contract_payment_totals
CREATE OR REPLACE FUNCTION public.update_contract_payment_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_contract RECORD;
    v_total_paid NUMERIC;
    v_balance_due NUMERIC;
BEGIN
    -- Only process payments linked to contracts
    IF NEW.contract_id IS NULL THEN
        -- For DELETE, check OLD
        IF TG_OP = 'DELETE' AND OLD.contract_id IS NOT NULL THEN
            -- Continue with OLD contract_id
        ELSE
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
        END IF;
    END IF;

    -- Determine which contract_id and company_id to use
    DECLARE
        v_contract_id_to_use UUID := COALESCE(NEW.contract_id, OLD.contract_id);
        v_company_id_to_use UUID := COALESCE(NEW.company_id, OLD.company_id);
    BEGIN
        -- Get contract details
        SELECT * INTO v_contract
        FROM contracts
        WHERE id = v_contract_id_to_use;

        IF NOT FOUND THEN
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
        END IF;

        -- Calculate total paid for this contract
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_paid
        FROM payments
        WHERE contract_id = v_contract_id_to_use
          AND payment_status = 'completed'
          AND company_id = v_company_id_to_use;

        v_balance_due := COALESCE(v_contract.contract_amount, 0) - v_total_paid;

        -- Update contract
        UPDATE contracts
        SET
            total_paid = v_total_paid,
            balance_due = v_balance_due,
            updated_at = NOW()
        WHERE id = v_contract_id_to_use;

        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
END;
$function$

