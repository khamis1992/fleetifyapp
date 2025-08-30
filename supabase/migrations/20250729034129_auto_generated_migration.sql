-- Add account_id column to contracts table for financial integration
ALTER TABLE public.contracts 
ADD COLUMN account_id uuid REFERENCES public.chart_of_accounts(id);

-- Create index for better performance on account_id lookups
CREATE INDEX idx_contracts_account_id ON public.contracts(account_id);

-- Update existing contracts to use a default account if needed
-- This is optional and can be done later through the UI
COMMENT ON COLUMN public.contracts.account_id IS 'Links contract to chart of accounts for financial tracking';