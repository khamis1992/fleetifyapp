-- Timeout + leftovers cleanup:
--  * future-dated invoices revert from 'sent' to 'draft' (scheduled) and a
--    guard blocks marking future invoices 'sent' before their date;
--  * financing references to missing vendors/customers are severed (NULLed)
--    across vehicle_installments and monthly_obligations.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Future 'sent' invoices -> scheduled drafts + creation-path guard.
--    The per-row settlement-sync trigger makes a bulk update unusably slow;
--    it is disabled for the batch (the guard below is created afterwards).
-- ---------------------------------------------------------------------------
SET LOCAL app.financial_controls_bypass = 'on';
ALTER TABLE public.invoices DISABLE TRIGGER sync_schedule_after_invoice_settlement_v1;

UPDATE public.invoices
SET status = 'draft', updated_at = now()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'sent'
  AND invoice_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;

ALTER TABLE public.invoices ENABLE TRIGGER sync_schedule_after_invoice_settlement_v1;
SET LOCAL app.financial_controls_bypass = '';

CREATE OR REPLACE FUNCTION public.prevent_future_sent_invoices()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF COALESCE(current_setting('app.financial_controls_bypass', true), '') = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF COALESCE(NEW.status, '') = 'sent'
    AND NEW.invoice_date IS NOT NULL
    AND NEW.invoice_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN
    RAISE EXCEPTION 'لا يمكن إرسال فاتورة بتاريخ مستقبلي — تبقى مسودة مجدولة حتى تاريخ استحقاقها'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.prevent_future_sent_invoices() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS prevent_future_sent_invoices ON public.invoices;
CREATE TRIGGER prevent_future_sent_invoices
  BEFORE INSERT OR UPDATE OF status, invoice_date ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.prevent_future_sent_invoices();

-- ---------------------------------------------------------------------------
-- 2. Sever financing references to missing counterparties.
-- ---------------------------------------------------------------------------
UPDATE public.vehicle_installments a
SET vendor_id = NULL, updated_at = now()
WHERE vendor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = a.vendor_id);

UPDATE public.monthly_obligations o
SET vendor_id = NULL, updated_at = now()
WHERE vendor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = o.vendor_id);

NOTIFY pgrst,'reload schema';
COMMIT;
