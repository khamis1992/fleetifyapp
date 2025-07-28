-- Add foreign key constraint between vehicle_dispatch_permits and vehicles
-- This will fix the PostgREST relationship error preventing dispatch permits from loading

ALTER TABLE public.vehicle_dispatch_permits 
ADD CONSTRAINT fk_vehicle_dispatch_permits_vehicle_id 
FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_dispatch_permits_vehicle_id 
ON public.vehicle_dispatch_permits(vehicle_id);