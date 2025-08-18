-- Add foreign key constraint for vehicle_id in vehicle_installments table
-- This will create the relationship needed for the join query
ALTER TABLE public.vehicle_installments 
ADD CONSTRAINT fk_vehicle_installments_vehicle_id 
FOREIGN KEY (vehicle_id) 
REFERENCES public.vehicles(id) 
ON DELETE SET NULL;

-- Add foreign key constraint for vendor_id (customers table)
ALTER TABLE public.vehicle_installments 
ADD CONSTRAINT fk_vehicle_installments_vendor_id 
FOREIGN KEY (vendor_id) 
REFERENCES public.customers(id) 
ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_installments_vehicle_id ON public.vehicle_installments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_installments_vendor_id ON public.vehicle_installments(vendor_id);