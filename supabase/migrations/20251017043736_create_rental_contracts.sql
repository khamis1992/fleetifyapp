-- ===============================
-- جدول عقود تأجير السيارات
-- Car Rental Contracts Table
-- ===============================

CREATE TABLE IF NOT EXISTS public.rental_contracts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    
    -- معلومات العقد | Contract Information
    contract_number TEXT NOT NULL,
    contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- المبالغ المالية | Financial Amounts
    monthly_rent NUMERIC NOT NULL CHECK (monthly_rent >= 0),
    deposit_amount NUMERIC DEFAULT 0 CHECK (deposit_amount >= 0),
    
    -- شروط الدفع | Payment Terms
    payment_day INTEGER DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
    payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'quarterly', 'annually')),
    late_fee_per_day NUMERIC DEFAULT 120 CHECK (late_fee_per_day >= 0),
    max_late_fee NUMERIC DEFAULT 3000 CHECK (max_late_fee >= 0),
    
    -- الحالة | Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'suspended')),
    
    -- الشروط والملاحظات | Terms and Notes
    terms TEXT,
    notes TEXT,
    
    -- التوقيعات الإلكترونية | Electronic Signatures
    customer_signature_url TEXT,
    company_signature_url TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    
    -- التدقيق | Audit
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- القيود | Constraints
    CONSTRAINT unique_contract_number_per_company UNIQUE (company_id, contract_number),
    CONSTRAINT valid_contract_dates CHECK (end_date > start_date)
);

-- الفهارس | Indexes
CREATE INDEX IF NOT EXISTS idx_rental_contracts_company ON public.rental_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_customer ON public.rental_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_vehicle ON public.rental_contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status ON public.rental_contracts(status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_dates ON public.rental_contracts(start_date, end_date);

-- Row Level Security
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company contracts"
    ON public.rental_contracts FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create company contracts"
    ON public.rental_contracts FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update company contracts"
    ON public.rental_contracts FOR UPDATE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION public.update_rental_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rental_contracts_updated_at
    BEFORE UPDATE ON public.rental_contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rental_contracts_updated_at();

-- تعليقات | Comments
COMMENT ON TABLE public.rental_contracts IS 'عقود تأجير السيارات - Car rental contracts';
COMMENT ON COLUMN public.rental_contracts.payment_day IS 'يوم الشهر المستحق فيه الدفع - Day of month payment is due';
COMMENT ON COLUMN public.rental_contracts.late_fee_per_day IS 'غرامة التأخير لكل يوم - Late fee per day';
