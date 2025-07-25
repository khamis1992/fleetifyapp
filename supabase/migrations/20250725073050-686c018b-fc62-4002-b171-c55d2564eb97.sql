-- Add cost_center_id to contracts table
ALTER TABLE public.contracts 
ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id);

-- Create index for performance
CREATE INDEX idx_contracts_cost_center_id ON public.contracts(cost_center_id);