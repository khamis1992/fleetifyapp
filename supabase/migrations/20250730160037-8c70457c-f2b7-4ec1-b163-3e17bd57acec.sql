-- Add account_id column to payments table
ALTER TABLE public.payments 
ADD COLUMN account_id UUID REFERENCES public.chart_of_accounts(id);

-- Add index for better performance
CREATE INDEX idx_payments_account_id ON public.payments(account_id);

-- Add comment for documentation
COMMENT ON COLUMN public.payments.account_id IS 'Reference to chart of accounts for accounting integration';