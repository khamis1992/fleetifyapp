-- Create customer_deposits table
CREATE TABLE public.customer_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deposit_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL,
  contract_id UUID,
  deposit_type TEXT NOT NULL DEFAULT 'security',
  amount NUMERIC NOT NULL,
  received_date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  returned_amount NUMERIC DEFAULT 0,
  notes TEXT,
  account_id UUID,
  journal_entry_id UUID,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_deposits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view deposits in their company" 
ON public.customer_deposits 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage deposits in their company" 
ON public.customer_deposits 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))));

-- Create trigger for timestamps
CREATE TRIGGER update_customer_deposits_updated_at
BEFORE UPDATE ON public.customer_deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();