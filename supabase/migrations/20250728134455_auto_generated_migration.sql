-- Add foreign key constraints and indexes for dispatch permits

-- Add foreign key constraints to link requested_by and approved_by to auth.users
ALTER TABLE public.vehicle_dispatch_permits 
ADD CONSTRAINT fk_dispatch_permits_requested_by 
FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vehicle_dispatch_permits 
ADD CONSTRAINT fk_dispatch_permits_approved_by 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add indexes for better performance on foreign key columns
CREATE INDEX IF NOT EXISTS idx_dispatch_permits_requested_by 
ON public.vehicle_dispatch_permits(requested_by);

CREATE INDEX IF NOT EXISTS idx_dispatch_permits_approved_by 
ON public.vehicle_dispatch_permits(approved_by);

CREATE INDEX IF NOT EXISTS idx_dispatch_permits_company_id 
ON public.vehicle_dispatch_permits(company_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_permits_vehicle_id 
ON public.vehicle_dispatch_permits(vehicle_id);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_dispatch_permits_status 
ON public.vehicle_dispatch_permits(status);

-- Add composite index for company and status queries
CREATE INDEX IF NOT EXISTS idx_dispatch_permits_company_status 
ON public.vehicle_dispatch_permits(company_id, status);