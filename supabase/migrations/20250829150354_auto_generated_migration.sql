-- Update the check constraint for inspection_type to include 'contract_inspection'
ALTER TABLE public.vehicle_condition_reports 
DROP CONSTRAINT IF EXISTS vehicle_condition_reports_inspection_type_check;

ALTER TABLE public.vehicle_condition_reports 
ADD CONSTRAINT vehicle_condition_reports_inspection_type_check 
CHECK (inspection_type = ANY (ARRAY['pre_dispatch'::text, 'post_dispatch'::text, 'contract_inspection'::text]));