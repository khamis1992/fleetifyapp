-- إنشاء جدول الالتزامات المالية كما هو موضح في الدليل
-- Create financial obligations table as specified in the guide

CREATE TABLE IF NOT EXISTS public.financial_obligations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    obligation_type TEXT NOT NULL CHECK (obligation_type IN ('installment', 'deposit', 'fee', 'penalty', 'insurance')),
    amount NUMERIC NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid', 'cancelled')),
    paid_amount NUMERIC DEFAULT 0,
    remaining_amount NUMERIC GENERATED ALWAYS AS (amount - COALESCE(paid_amount, 0)) STORED,
    days_overdue INTEGER DEFAULT 0,
    description TEXT,
    reference_number TEXT,
    invoice_id UUID,
    journal_entry_id UUID,
    payment_method TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Foreign key constraints
    CONSTRAINT fk_financial_obligations_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_financial_obligations_contract FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE,
    CONSTRAINT fk_financial_obligations_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_financial_obligations_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL,
    CONSTRAINT fk_financial_obligations_journal FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    
    -- Check constraints
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_paid_amount CHECK (paid_amount >= 0 AND paid_amount <= amount)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_obligations_company_id ON public.financial_obligations(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_contract_id ON public.financial_obligations(contract_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_customer_id ON public.financial_obligations(customer_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_due_date ON public.financial_obligations(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_status ON public.financial_obligations(status);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_overdue ON public.financial_obligations(due_date, status) WHERE status IN ('overdue', 'partially_paid');

-- Enable Row Level Security
ALTER TABLE public.financial_obligations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view financial obligations in their company" 
ON public.financial_obligations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage financial obligations in their company" 
ON public.financial_obligations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role) OR
      has_role(auth.uid(), 'sales_agent'::user_role)))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role) OR
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- Create function to automatically create financial obligations when contract is created
CREATE OR REPLACE FUNCTION public.create_contract_financial_obligations(
    p_contract_id UUID,
    p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    contract_record RECORD;
    obligation_id UUID;
    result JSONB := '{"success": true, "obligations_created": []}'::JSONB;
    monthly_amount NUMERIC;
    total_months INTEGER;
    installment_date DATE;
    i INTEGER;
BEGIN
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = p_contract_id AND company_id = p_company_id;
    
    IF contract_record.id IS NULL THEN
        RETURN '{"success": false, "error": "Contract not found"}'::JSONB;
    END IF;
    
    -- Create deposit obligation if deposit amount exists
    IF contract_record.deposit_amount IS NOT NULL AND contract_record.deposit_amount > 0 THEN
        INSERT INTO public.financial_obligations (
            company_id, contract_id, customer_id, obligation_type,
            amount, due_date, description, created_by
        ) VALUES (
            p_company_id, p_contract_id, contract_record.customer_id, 'deposit',
            contract_record.deposit_amount, contract_record.start_date,
            'Contract deposit - ' || contract_record.contract_number,
            contract_record.created_by
        ) RETURNING id INTO obligation_id;
        
        result := jsonb_set(result, '{obligations_created}', 
            result->'obligations_created' || jsonb_build_object('type', 'deposit', 'id', obligation_id, 'amount', contract_record.deposit_amount)
        );
    END IF;
    
    -- Create monthly installment obligations
    monthly_amount := COALESCE(contract_record.monthly_amount, contract_record.contract_amount);
    total_months := EXTRACT(YEAR FROM AGE(contract_record.end_date, contract_record.start_date)) * 12 + 
                   EXTRACT(MONTH FROM AGE(contract_record.end_date, contract_record.start_date));
    
    -- If monthly amount equals total amount, create single obligation
    IF monthly_amount >= contract_record.contract_amount THEN
        INSERT INTO public.financial_obligations (
            company_id, contract_id, customer_id, obligation_type,
            amount, due_date, description, created_by
        ) VALUES (
            p_company_id, p_contract_id, contract_record.customer_id, 'installment',
            contract_record.contract_amount, contract_record.start_date,
            'Contract payment - ' || contract_record.contract_number,
            contract_record.created_by
        ) RETURNING id INTO obligation_id;
        
        result := jsonb_set(result, '{obligations_created}', 
            result->'obligations_created' || jsonb_build_object('type', 'installment', 'id', obligation_id, 'amount', contract_record.contract_amount)
        );
    ELSE
        -- Create monthly installments
        installment_date := contract_record.start_date;
        FOR i IN 1..GREATEST(1, total_months) LOOP
            INSERT INTO public.financial_obligations (
                company_id, contract_id, customer_id, obligation_type,
                amount, due_date, description, created_by
            ) VALUES (
                p_company_id, p_contract_id, contract_record.customer_id, 'installment',
                monthly_amount, installment_date,
                'Monthly installment ' || i || ' - ' || contract_record.contract_number,
                contract_record.created_by
            ) RETURNING id INTO obligation_id;
            
            result := jsonb_set(result, '{obligations_created}', 
                result->'obligations_created' || jsonb_build_object('type', 'installment', 'id', obligation_id, 'amount', monthly_amount, 'installment', i)
            );
            
            installment_date := installment_date + INTERVAL '1 month';
        END LOOP;
    END IF;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create trigger to automatically create financial obligations when contract is created
CREATE OR REPLACE FUNCTION public.trigger_create_contract_obligations()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create obligations for active contracts
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        PERFORM public.create_contract_financial_obligations(NEW.id, NEW.company_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_contract_obligations ON public.contracts;
CREATE TRIGGER trigger_create_contract_obligations
    AFTER INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_create_contract_obligations();

-- Create function to update obligation status based on payments
CREATE OR REPLACE FUNCTION public.update_obligation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update financial obligations when payments are made
    IF TG_OP = 'INSERT' AND NEW.payment_status = 'completed' THEN
        -- This would be implemented based on payment allocation logic
        -- For now, we'll create a placeholder
        RAISE LOG 'Payment completed: %, Amount: %', NEW.id, NEW.amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment updates
DROP TRIGGER IF EXISTS trigger_update_obligation_status ON public.payments;
CREATE TRIGGER trigger_update_obligation_status
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_obligation_status();

-- Function to calculate days overdue
CREATE OR REPLACE FUNCTION public.calculate_days_overdue(
    p_due_date DATE,
    p_status TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_status IN ('overdue', 'partially_paid') AND p_due_date < CURRENT_DATE THEN
        RETURN (CURRENT_DATE - p_due_date)::INTEGER;
    ELSE
        RETURN 0;
    END IF;
END;
$$;

-- Function to update days overdue for financial obligations
CREATE OR REPLACE FUNCTION public.update_days_overdue()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate days overdue based on current date, due date, and status
    IF NEW.status IN ('overdue', 'partially_paid') AND NEW.due_date < CURRENT_DATE THEN
        NEW.days_overdue := (CURRENT_DATE - NEW.due_date)::INTEGER;
    ELSE
        NEW.days_overdue := 0;
    END IF;
    
    -- Update status to overdue if past due date and not paid
    IF NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' AND NEW.remaining_amount > 0 THEN
        NEW.status := 'overdue';
        NEW.days_overdue := (CURRENT_DATE - NEW.due_date)::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update days overdue
DROP TRIGGER IF EXISTS update_days_overdue_trigger ON public.financial_obligations;
CREATE TRIGGER update_days_overdue_trigger
    BEFORE INSERT OR UPDATE ON public.financial_obligations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_days_overdue();

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_financial_obligations_updated_at ON public.financial_obligations;
CREATE TRIGGER update_financial_obligations_updated_at
    BEFORE UPDATE ON public.financial_obligations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update overdue status for all obligations (to be run periodically)
CREATE OR REPLACE FUNCTION public.update_all_overdue_obligations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.financial_obligations
    SET 
        status = CASE 
            WHEN due_date < CURRENT_DATE AND status = 'pending' AND remaining_amount > 0 
            THEN 'overdue'
            ELSE status
        END,
        days_overdue = CASE 
            WHEN status IN ('overdue', 'partially_paid') AND due_date < CURRENT_DATE 
            THEN (CURRENT_DATE - due_date)::INTEGER
            ELSE 0
        END,
        updated_at = now()
    WHERE 
        (due_date < CURRENT_DATE AND status = 'pending' AND remaining_amount > 0) OR
        (status IN ('overdue', 'partially_paid') AND days_overdue != (CURRENT_DATE - due_date)::INTEGER);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

COMMENT ON TABLE public.financial_obligations IS 'جدول الالتزامات المالية للعملاء كما هو موضح في دليل العمليات المالية';
COMMENT ON COLUMN public.financial_obligations.obligation_type IS 'نوع الالتزام: قسط، دفعة مقدمة، رسوم، غرامة، تأمين';
COMMENT ON COLUMN public.financial_obligations.status IS 'حالة الالتزام: معلق، مدفوع، متأخر، مدفوع جزئياً، ملغي';
COMMENT ON COLUMN public.financial_obligations.days_overdue IS 'عدد أيام التأخير (محسوب تلقائياً)';
COMMENT ON COLUMN public.financial_obligations.remaining_amount IS 'المبلغ المتبقي (محسوب تلقائياً)';
