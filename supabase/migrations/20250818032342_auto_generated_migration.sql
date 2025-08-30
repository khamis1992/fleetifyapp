-- Fix vehicle_installments table to support multi-vehicle contracts
-- Make vehicle_id nullable to allow multi-vehicle installment contracts

-- Update the vehicle_installments table to make vehicle_id nullable
ALTER TABLE public.vehicle_installments 
ALTER COLUMN vehicle_id DROP NOT NULL;

-- Add a comment to explain the logic
COMMENT ON COLUMN public.vehicle_installments.vehicle_id IS 'Vehicle ID for single-vehicle contracts. NULL for multi-vehicle contracts (vehicles stored in contract_vehicles table)';

-- Create an index for better performance on multi-vehicle queries
CREATE INDEX IF NOT EXISTS idx_vehicle_installments_contract_type 
ON public.vehicle_installments(contract_type, company_id);

-- Add constraint to ensure data integrity
-- Either vehicle_id is set (single vehicle) OR contract_type is multi_vehicle
ALTER TABLE public.vehicle_installments 
ADD CONSTRAINT check_vehicle_installment_integrity 
CHECK (
  (vehicle_id IS NOT NULL AND contract_type = 'single_vehicle') OR 
  (vehicle_id IS NULL AND contract_type = 'multi_vehicle')
);