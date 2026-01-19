-- ===============================
-- Add Integration Columns to rental_payment_receipts
-- ===============================
-- This migration adds contract_id and vehicle_id to link payments with contracts and vehicles

-- Add contract_id column
ALTER TABLE public.rental_payment_receipts
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Add vehicle_id column
ALTER TABLE public.rental_payment_receipts
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_receipts_contract_id ON public.rental_payment_receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_rental_receipts_vehicle_id ON public.rental_payment_receipts(vehicle_id);

-- Add composite index for contract payment queries
CREATE INDEX IF NOT EXISTS idx_rental_receipts_contract_company ON public.rental_payment_receipts(contract_id, company_id, payment_date DESC);

COMMENT ON COLUMN public.rental_payment_receipts.contract_id IS 'Link to the rental contract (optional)';
COMMENT ON COLUMN public.rental_payment_receipts.vehicle_id IS 'Link to the rented vehicle (optional)';

