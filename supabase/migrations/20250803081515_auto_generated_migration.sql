-- Create contract payment schedules table
CREATE TABLE public.contract_payment_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    invoice_id UUID,
    paid_amount NUMERIC DEFAULT 0,
    paid_date DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'overdue', 'paid', 'partially_paid', 'cancelled')),
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_paid_amount CHECK (paid_amount >= 0 AND paid_amount <= amount)
);

-- Enable Row Level Security
ALTER TABLE public.contract_payment_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for payment schedules
CREATE POLICY "Users can view payment schedules in their company" 
ON public.contract_payment_schedules 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage payment schedules in their company" 
ON public.contract_payment_schedules 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- Create indexes for better performance
CREATE INDEX idx_payment_schedules_contract_id ON public.contract_payment_schedules(contract_id);
CREATE INDEX idx_payment_schedules_company_id ON public.contract_payment_schedules(company_id);
CREATE INDEX idx_payment_schedules_due_date ON public.contract_payment_schedules(due_date);
CREATE INDEX idx_payment_schedules_status ON public.contract_payment_schedules(status);

-- Create trigger for updating timestamps
CREATE TRIGGER update_payment_schedules_updated_at
BEFORE UPDATE ON public.contract_payment_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create payment schedules for a contract
CREATE OR REPLACE FUNCTION public.create_contract_payment_schedule(
    contract_id_param UUID,
    installment_plan TEXT DEFAULT 'monthly',
    number_of_installments INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_record RECORD;
    installment_amount NUMERIC;
    installment_count INTEGER;
    next_due_date DATE;
    i INTEGER;
BEGIN
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;
    
    -- Determine installment count and amount based on plan
    CASE installment_plan
        WHEN 'monthly' THEN
            installment_count := COALESCE(number_of_installments, 
                EXTRACT(MONTH FROM AGE(contract_record.end_date, contract_record.start_date))::INTEGER + 1);
            installment_amount := contract_record.contract_amount / installment_count;
        WHEN 'quarterly' THEN
            installment_count := COALESCE(number_of_installments, 
                CEIL(EXTRACT(MONTH FROM AGE(contract_record.end_date, contract_record.start_date))::NUMERIC / 3));
            installment_amount := contract_record.contract_amount / installment_count;
        WHEN 'semi_annual' THEN
            installment_count := COALESCE(number_of_installments, 
                CEIL(EXTRACT(MONTH FROM AGE(contract_record.end_date, contract_record.start_date))::NUMERIC / 6));
            installment_amount := contract_record.contract_amount / installment_count;
        WHEN 'annual' THEN
            installment_count := COALESCE(number_of_installments, 
                CEIL(EXTRACT(YEAR FROM AGE(contract_record.end_date, contract_record.start_date))::NUMERIC));
            installment_amount := contract_record.contract_amount / installment_count;
        ELSE
            installment_count := COALESCE(number_of_installments, 1);
            installment_amount := contract_record.contract_amount;
    END CASE;
    
    -- Create installments
    next_due_date := contract_record.start_date;
    
    FOR i IN 1..installment_count LOOP
        INSERT INTO public.contract_payment_schedules (
            company_id,
            contract_id,
            installment_number,
            due_date,
            amount,
            description,
            created_by
        ) VALUES (
            contract_record.company_id,
            contract_id_param,
            i,
            next_due_date,
            installment_amount,
            'Installment ' || i || ' of ' || installment_count,
            auth.uid()
        );
        
        -- Calculate next due date based on plan
        CASE installment_plan
            WHEN 'monthly' THEN
                next_due_date := next_due_date + INTERVAL '1 month';
            WHEN 'quarterly' THEN
                next_due_date := next_due_date + INTERVAL '3 months';
            WHEN 'semi_annual' THEN
                next_due_date := next_due_date + INTERVAL '6 months';
            WHEN 'annual' THEN
                next_due_date := next_due_date + INTERVAL '1 year';
            ELSE
                next_due_date := next_due_date + INTERVAL '1 month';
        END CASE;
    END LOOP;
    
    RETURN installment_count;
END;
$$;

-- Function to update payment schedule status based on due dates
CREATE OR REPLACE FUNCTION public.update_payment_schedule_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.contract_payment_schedules
    SET status = 'overdue',
        updated_at = now()
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$;