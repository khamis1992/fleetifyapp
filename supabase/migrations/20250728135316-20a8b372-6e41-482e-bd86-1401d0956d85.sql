-- Fix foreign key constraints for dispatch permits to use profiles table

-- Drop the existing foreign key constraints that point to auth.users
ALTER TABLE public.vehicle_dispatch_permits 
DROP CONSTRAINT IF EXISTS fk_dispatch_permits_requested_by;

ALTER TABLE public.vehicle_dispatch_permits 
DROP CONSTRAINT IF EXISTS fk_dispatch_permits_approved_by;

-- Add correct foreign key constraints to link requested_by and approved_by to profiles
ALTER TABLE public.vehicle_dispatch_permits 
ADD CONSTRAINT fk_dispatch_permits_requested_by 
FOREIGN KEY (requested_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.vehicle_dispatch_permits 
ADD CONSTRAINT fk_dispatch_permits_approved_by 
FOREIGN KEY (approved_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;