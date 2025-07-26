-- Add contract_id to invoices table
ALTER TABLE public.invoices ADD COLUMN contract_id uuid;

-- Add foreign key constraint
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_contract_id 
FOREIGN KEY (contract_id) REFERENCES public.contracts(id);

-- Add contract_id to payments table  
ALTER TABLE public.payments ADD COLUMN contract_id uuid;

-- Add foreign key constraint
ALTER TABLE public.payments ADD CONSTRAINT fk_payments_contract_id 
FOREIGN KEY (contract_id) REFERENCES public.contracts(id);

-- Add index for better performance
CREATE INDEX idx_invoices_contract_id ON public.invoices(contract_id);
CREATE INDEX idx_payments_contract_id ON public.payments(contract_id);