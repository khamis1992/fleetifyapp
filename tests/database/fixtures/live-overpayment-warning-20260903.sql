-- Read-only production snapshot, 2026-09-03, public.check_payment_overpayment.
-- NOT a repair migration. Its gross-receipt arithmetic is deliberately retained
-- to reproduce a live trigger conflict with fee-inclusive payment replay.
CREATE OR REPLACE FUNCTION public.check_payment_overpayment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice RECORD;
  v_total_paid DECIMAL(12,2);
  v_new_total DECIMAL(12,2);
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT total_amount, paid_amount INTO v_invoice
  FROM invoices WHERE id = NEW.invoice_id;
  
  IF v_invoice IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id 
    AND payment_status = 'completed'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  v_new_total := v_total_paid + NEW.amount;
  
  IF v_new_total > v_invoice.total_amount THEN
    NEW.notes := COALESCE(NEW.notes, '') || ' [تحذير: دفعة تتجاوز قيمة الفاتورة بـ ' || 
                 (v_new_total - v_invoice.total_amount)::TEXT || ' ر.ق.]';
  END IF;
  
  RETURN NEW;
END;
$function$;
