-- ===============================
-- Add invoice_id to rental_payment_receipts
-- ===============================
-- This migration adds invoice_id column to link rental payment receipts with invoices

-- Add invoice_id column
ALTER TABLE public.rental_payment_receipts
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_rental_receipts_invoice_id ON public.rental_payment_receipts(invoice_id);

-- Add composite index for invoice queries
CREATE INDEX IF NOT EXISTS idx_rental_receipts_invoice_company ON public.rental_payment_receipts(invoice_id, company_id);

COMMENT ON COLUMN public.rental_payment_receipts.invoice_id IS 'Link to the generated invoice for this payment receipt';
