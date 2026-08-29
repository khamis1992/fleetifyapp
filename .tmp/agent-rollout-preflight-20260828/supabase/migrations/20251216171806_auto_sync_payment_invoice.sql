
-- Trigger to automatically sync payments with invoices
-- This ensures that when a payment is made, the corresponding invoice gets updated

CREATE OR REPLACE FUNCTION public.sync_payment_with_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_remaining_amount DECIMAL(12,2);
  v_amount_to_apply DECIMAL(12,2);
  v_new_paid_amount DECIMAL(12,2);
  v_new_balance DECIMAL(12,2);
  v_new_status TEXT;
BEGIN
  -- Only process completed payments
  IF NEW.payment_status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if payment is already linked to an invoice
  IF NEW.invoice_id IS NOT NULL THEN
    -- Update only the linked invoice
    SELECT * INTO v_invoice FROM public.invoices WHERE id = NEW.invoice_id;
    IF FOUND THEN
      v_new_paid_amount := COALESCE(v_invoice.paid_amount, 0) + NEW.amount;
      v_new_balance := v_invoice.total_amount - v_new_paid_amount;
      v_new_status := CASE WHEN v_new_balance <= 0 THEN 'paid' WHEN v_new_paid_amount > 0 THEN 'partial' ELSE 'unpaid' END;
      
      UPDATE public.invoices SET
        paid_amount = v_new_paid_amount,
        balance_due = GREATEST(0, v_new_balance),
        payment_status = v_new_status
      WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- If no invoice linked, find and update unpaid invoices for this contract
  IF NEW.contract_id IS NOT NULL THEN
    v_remaining_amount := NEW.amount;
    
    FOR v_invoice IN 
      SELECT id, total_amount, COALESCE(paid_amount, 0) as paid_amount
      FROM public.invoices 
      WHERE contract_id = NEW.contract_id 
        AND payment_status IN ('unpaid', 'partial')
      ORDER BY due_date ASC
    LOOP
      EXIT WHEN v_remaining_amount <= 0;
      
      v_amount_to_apply := LEAST(v_remaining_amount, v_invoice.total_amount - v_invoice.paid_amount);
      
      IF v_amount_to_apply > 0 THEN
        v_new_paid_amount := v_invoice.paid_amount + v_amount_to_apply;
        v_new_balance := v_invoice.total_amount - v_new_paid_amount;
        v_new_status := CASE WHEN v_new_balance <= 0 THEN 'paid' WHEN v_new_paid_amount > 0 THEN 'partial' ELSE 'unpaid' END;
        
        UPDATE public.invoices SET
          paid_amount = v_new_paid_amount,
          balance_due = GREATEST(0, v_new_balance),
          payment_status = v_new_status
        WHERE id = v_invoice.id;
        
        v_remaining_amount := v_remaining_amount - v_amount_to_apply;
        
        -- Link payment to first invoice it was applied to
        IF NEW.invoice_id IS NULL THEN
          NEW.invoice_id := v_invoice.id;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_sync_payment_invoice ON public.payments;

-- Create trigger BEFORE INSERT to set invoice_id
CREATE TRIGGER trg_sync_payment_invoice
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payment_with_invoice();

-- Also create AFTER INSERT trigger to update invoices
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_remaining_amount DECIMAL(12,2);
  v_amount_to_apply DECIMAL(12,2);
  v_new_paid_amount DECIMAL(12,2);
  v_new_balance DECIMAL(12,2);
  v_new_status TEXT;
BEGIN
  -- Only process completed payments
  IF NEW.payment_status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- If payment is linked to specific invoice, update only that invoice
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice FROM public.invoices WHERE id = NEW.invoice_id;
    IF FOUND AND v_invoice.payment_status != 'paid' THEN
      v_new_paid_amount := COALESCE(v_invoice.paid_amount, 0) + NEW.amount;
      v_new_balance := v_invoice.total_amount - v_new_paid_amount;
      v_new_status := CASE WHEN v_new_balance <= 0 THEN 'paid' WHEN v_new_paid_amount > 0 THEN 'partial' ELSE 'unpaid' END;
      
      UPDATE public.invoices SET
        paid_amount = v_new_paid_amount,
        balance_due = GREATEST(0, v_new_balance),
        payment_status = v_new_status
      WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- If no invoice linked but has contract, distribute payment to unpaid invoices
  IF NEW.contract_id IS NOT NULL THEN
    v_remaining_amount := NEW.amount;
    
    FOR v_invoice IN 
      SELECT id, total_amount, COALESCE(paid_amount, 0) as paid_amount
      FROM public.invoices 
      WHERE contract_id = NEW.contract_id 
        AND payment_status IN ('unpaid', 'partial')
      ORDER BY due_date ASC
    LOOP
      EXIT WHEN v_remaining_amount <= 0;
      
      v_amount_to_apply := LEAST(v_remaining_amount, v_invoice.total_amount - v_invoice.paid_amount);
      
      IF v_amount_to_apply > 0 THEN
        v_new_paid_amount := v_invoice.paid_amount + v_amount_to_apply;
        v_new_balance := v_invoice.total_amount - v_new_paid_amount;
        v_new_status := CASE WHEN v_new_balance <= 0 THEN 'paid' WHEN v_new_paid_amount > 0 THEN 'partial' ELSE 'unpaid' END;
        
        UPDATE public.invoices SET
          paid_amount = v_new_paid_amount,
          balance_due = GREATEST(0, v_new_balance),
          payment_status = v_new_status
        WHERE id = v_invoice.id;
        
        v_remaining_amount := v_remaining_amount - v_amount_to_apply;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON public.payments;

-- Create AFTER INSERT trigger
CREATE TRIGGER trg_update_invoice_on_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_on_payment();
;
