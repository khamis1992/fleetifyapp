-- Create vehicle installments table for tracking installment agreements with dealers
CREATE TABLE public.vehicle_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  agreement_number TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  installment_amount NUMERIC NOT NULL DEFAULT 0,
  number_of_installments INTEGER NOT NULL DEFAULT 1,
  interest_rate NUMERIC DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  notes TEXT,
  agreement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle installment schedules table for tracking individual payments
CREATE TABLE public.vehicle_installment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  installment_id UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  interest_amount NUMERIC DEFAULT 0,
  principal_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid')),
  paid_amount NUMERIC DEFAULT 0,
  paid_date DATE,
  payment_reference TEXT,
  notes TEXT,
  invoice_id UUID,
  journal_entry_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.vehicle_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_installment_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle_installments
CREATE POLICY "Managers can manage vehicle installments in their company"
ON public.vehicle_installments FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role) OR 
    has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "Users can view vehicle installments in their company"
ON public.vehicle_installments FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Create RLS policies for vehicle_installment_schedules
CREATE POLICY "Managers can manage installment schedules in their company"
ON public.vehicle_installment_schedules FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (company_id = get_user_company(auth.uid()) AND 
   (has_role(auth.uid(), 'company_admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role) OR 
    has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "Users can view installment schedules in their company"
ON public.vehicle_installment_schedules FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_vehicle_installments_company_id ON public.vehicle_installments(company_id);
CREATE INDEX idx_vehicle_installments_vendor_id ON public.vehicle_installments(vendor_id);
CREATE INDEX idx_vehicle_installments_vehicle_id ON public.vehicle_installments(vehicle_id);
CREATE INDEX idx_vehicle_installments_status ON public.vehicle_installments(status);

CREATE INDEX idx_vehicle_installment_schedules_company_id ON public.vehicle_installment_schedules(company_id);
CREATE INDEX idx_vehicle_installment_schedules_installment_id ON public.vehicle_installment_schedules(installment_id);
CREATE INDEX idx_vehicle_installment_schedules_due_date ON public.vehicle_installment_schedules(due_date);
CREATE INDEX idx_vehicle_installment_schedules_status ON public.vehicle_installment_schedules(status);

-- Create function to automatically create installment schedule
CREATE OR REPLACE FUNCTION public.create_vehicle_installment_schedule(
  p_installment_id UUID,
  p_company_id UUID,
  p_total_amount NUMERIC,
  p_down_payment NUMERIC,
  p_installment_amount NUMERIC,
  p_number_of_installments INTEGER,
  p_interest_rate NUMERIC DEFAULT 0,
  p_start_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
  current_due_date DATE;
  monthly_interest NUMERIC;
  remaining_principal NUMERIC;
  current_principal NUMERIC;
  current_interest NUMERIC;
BEGIN
  -- Calculate monthly interest rate
  monthly_interest := p_interest_rate / 12 / 100;
  
  -- Calculate remaining principal after down payment
  remaining_principal := p_total_amount - p_down_payment;
  
  -- Set first due date (one month after start date)
  current_due_date := p_start_date + INTERVAL '1 month';
  
  -- Create installment schedules
  FOR i IN 1..p_number_of_installments LOOP
    -- Calculate interest and principal for this installment
    current_interest := remaining_principal * monthly_interest;
    current_principal := p_installment_amount - current_interest;
    
    -- Insert installment schedule
    INSERT INTO public.vehicle_installment_schedules (
      company_id,
      installment_id,
      installment_number,
      due_date,
      amount,
      interest_amount,
      principal_amount,
      status
    ) VALUES (
      p_company_id,
      p_installment_id,
      i,
      current_due_date,
      p_installment_amount,
      current_interest,
      current_principal,
      'pending'
    );
    
    -- Update remaining principal
    remaining_principal := remaining_principal - current_principal;
    
    -- Move to next month
    current_due_date := current_due_date + INTERVAL '1 month';
  END LOOP;
  
  RETURN p_number_of_installments;
END;
$$;

-- Create function to update installment schedule status
CREATE OR REPLACE FUNCTION public.update_vehicle_installment_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update overdue installments
  UPDATE public.vehicle_installment_schedules
  SET status = 'overdue',
      updated_at = now()
  WHERE status = 'pending'
  AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_vehicle_installment_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_vehicle_installments_timestamp
  BEFORE UPDATE ON public.vehicle_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_installment_timestamp();

CREATE TRIGGER update_vehicle_installment_schedules_timestamp
  BEFORE UPDATE ON public.vehicle_installment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_installment_timestamp();