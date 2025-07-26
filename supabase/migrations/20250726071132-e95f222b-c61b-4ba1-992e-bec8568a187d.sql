-- Create quotations table
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  vehicle_id UUID,
  quotation_number VARCHAR NOT NULL,
  quotation_type TEXT NOT NULL DEFAULT 'daily' CHECK (quotation_type IN ('daily', 'weekly', 'monthly')),
  duration INTEGER NOT NULL DEFAULT 1,
  rate_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  terms TEXT,
  valid_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'converted')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Create policies for quotations
CREATE POLICY "Staff can manage quotations in their company" 
ON public.quotations 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))));

CREATE POLICY "Users can view quotations in their company" 
ON public.quotations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();