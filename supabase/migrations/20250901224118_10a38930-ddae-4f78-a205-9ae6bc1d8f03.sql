-- Remove the existing check constraint that only allows pre_dispatch and post_dispatch
ALTER TABLE vehicle_condition_reports DROP CONSTRAINT IF EXISTS vehicle_condition_reports_inspection_type_check;

-- Add new check constraint that includes contract_inspection
ALTER TABLE vehicle_condition_reports ADD CONSTRAINT vehicle_condition_reports_inspection_type_check 
CHECK (inspection_type = ANY (ARRAY['pre_dispatch'::text, 'post_dispatch'::text, 'contract_inspection'::text]));