-- نظام معالجة المدفوعات الذكية مع استراتيجيات التخصيص
-- Smart payment processing system with allocation strategies

-- Create payment allocations table
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    payment_id UUID NOT NULL,
    obligation_id UUID NOT NULL,
    allocated_amount NUMERIC NOT NULL DEFAULT 0,
    allocation_type TEXT NOT NULL DEFAULT 'automatic' CHECK (allocation_type IN ('automatic', 'manual')),
    allocation_strategy TEXT CHECK (allocation_strategy IN ('fifo', 'highest_interest', 'nearest_due', 'manual')),
    allocation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Foreign key constraints
    CONSTRAINT fk_payment_allocations_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_allocations_payment FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_allocations_obligation FOREIGN KEY (obligation_id) REFERENCES public.financial_obligations(id) ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT positive_allocated_amount CHECK (allocated_amount > 0)
);

-- Create indexes
CREATE INDEX idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_obligation_id ON public.payment_allocations(obligation_id);
CREATE INDEX idx_payment_allocations_company_id ON public.payment_allocations(company_id);

-- Enable RLS
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view payment allocations in their company" 
ON public.payment_allocations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage payment allocations in their company" 
ON public.payment_allocations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'accountant'::user_role)))
);

-- Function to get unpaid obligations with different strategies
CREATE OR REPLACE FUNCTION public.get_unpaid_obligations(
    p_customer_id UUID,
    p_company_id UUID,
    p_strategy TEXT DEFAULT 'fifo'
) RETURNS TABLE (
    id UUID,
    contract_id UUID,
    obligation_type TEXT,
    amount NUMERIC,
    due_date DATE,
    remaining_amount NUMERIC,
    days_overdue INTEGER,
    priority_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fo.id,
        fo.contract_id,
        fo.obligation_type,
        fo.amount,
        fo.due_date,
        fo.remaining_amount,
        fo.days_overdue,
        CASE p_strategy
            WHEN 'fifo' THEN 
                -- أقدم أولاً: ترتيب حسب تاريخ الاستحقاق
                EXTRACT(epoch FROM (CURRENT_DATE - fo.due_date))
            WHEN 'highest_interest' THEN 
                -- أعلى فائدة: ترتيب حسب المبلغ والتأخير
                fo.remaining_amount * (1 + (fo.days_overdue * 0.01))
            WHEN 'nearest_due' THEN 
                -- أقرب استحقاق: ترتيب حسب قرب تاريخ الاستحقاق
                -EXTRACT(epoch FROM (fo.due_date - CURRENT_DATE))
            ELSE 
                -- افتراضي: FIFO
                EXTRACT(epoch FROM (CURRENT_DATE - fo.due_date))
        END as priority_score
    FROM public.financial_obligations fo
    WHERE fo.customer_id = p_customer_id 
    AND fo.company_id = p_company_id
    AND fo.status IN ('pending', 'overdue', 'partially_paid')
    AND fo.remaining_amount > 0
    ORDER BY 
        CASE p_strategy
            WHEN 'fifo' THEN fo.due_date
            WHEN 'nearest_due' THEN fo.due_date
            ELSE NULL
        END ASC,
        CASE p_strategy
            WHEN 'highest_interest' THEN (fo.remaining_amount * (1 + (fo.days_overdue * 0.01)))
            ELSE NULL
        END DESC;
END;
$$;

-- Main function for smart payment allocation
CREATE OR REPLACE FUNCTION public.allocate_payment_smart(
    p_payment_id UUID,
    p_customer_id UUID,
    p_company_id UUID,
    p_amount NUMERIC,
    p_strategy TEXT DEFAULT 'fifo'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    remaining_amount NUMERIC := p_amount;
    obligation_record RECORD;
    allocated_amount NUMERIC;
    allocation_id UUID;
    result JSONB := '{"success": true, "allocations": [], "total_allocated": 0, "remaining_amount": 0}'::JSONB;
    total_allocated NUMERIC := 0;
BEGIN
    -- التحقق من صحة البيانات
    IF p_amount <= 0 THEN
        RETURN '{"success": false, "error": "Invalid payment amount"}'::JSONB;
    END IF;
    
    -- الحصول على الالتزامات غير المدفوعة حسب الاستراتيجية المحددة
    FOR obligation_record IN 
        SELECT * FROM public.get_unpaid_obligations(p_customer_id, p_company_id, p_strategy)
    LOOP
        -- إذا لم يتبق مبلغ للتخصيص، توقف
        IF remaining_amount <= 0 THEN
            EXIT;
        END IF;
        
        -- حساب المبلغ المخصص لهذا الالتزام
        allocated_amount := LEAST(remaining_amount, obligation_record.remaining_amount);
        
        -- إنشاء تخصيص الدفعة
        INSERT INTO public.payment_allocations (
            company_id, payment_id, obligation_id, allocated_amount,
            allocation_type, allocation_strategy, created_by
        ) VALUES (
            p_company_id, p_payment_id, obligation_record.id, allocated_amount,
            'automatic', p_strategy, auth.uid()
        ) RETURNING id INTO allocation_id;
        
        -- تحديث الالتزام المالي
        UPDATE public.financial_obligations
        SET 
            paid_amount = COALESCE(paid_amount, 0) + allocated_amount,
            status = CASE 
                WHEN (COALESCE(paid_amount, 0) + allocated_amount) >= amount THEN 'paid'
                ELSE 'partially_paid'
            END,
            updated_at = now()
        WHERE id = obligation_record.id;
        
        -- إضافة التخصيص إلى النتيجة
        result := jsonb_set(result, '{allocations}', 
            result->'allocations' || jsonb_build_object(
                'allocation_id', allocation_id,
                'obligation_id', obligation_record.id,
                'obligation_type', obligation_record.obligation_type,
                'allocated_amount', allocated_amount,
                'due_date', obligation_record.due_date
            )
        );
        
        -- تحديث المبالغ
        remaining_amount := remaining_amount - allocated_amount;
        total_allocated := total_allocated + allocated_amount;
    END LOOP;
    
    -- تحديث النتيجة النهائية
    result := jsonb_set(result, '{total_allocated}', to_jsonb(total_allocated));
    result := jsonb_set(result, '{remaining_amount}', to_jsonb(remaining_amount));
    
    -- إذا تبقى مبلغ غير مخصص، إنشاء رصيد دائن للعميل
    IF remaining_amount > 0 THEN
        -- يمكن إضافة منطق لإنشاء رصيد دائن هنا
        result := jsonb_set(result, '{credit_balance_created}', to_jsonb(remaining_amount));
    END IF;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function for manual payment allocation
CREATE OR REPLACE FUNCTION public.allocate_payment_manual(
    p_payment_id UUID,
    p_allocations JSONB -- [{"obligation_id": "uuid", "amount": 100}, ...]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    allocation JSONB;
    obligation_record RECORD;
    allocation_id UUID;
    result JSONB := '{"success": true, "allocations": [], "total_allocated": 0}'::JSONB;
    total_allocated NUMERIC := 0;
    payment_record RECORD;
BEGIN
    -- الحصول على بيانات الدفعة
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = p_payment_id;
    
    IF payment_record.id IS NULL THEN
        RETURN '{"success": false, "error": "Payment not found"}'::JSONB;
    END IF;
    
    -- معالجة كل تخصيص يدوي
    FOR allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        -- التحقق من صحة الالتزام
        SELECT * INTO obligation_record
        FROM public.financial_obligations
        WHERE id = (allocation->>'obligation_id')::UUID
        AND company_id = payment_record.company_id
        AND customer_id = payment_record.customer_id;
        
        IF obligation_record.id IS NULL THEN
            CONTINUE; -- تجاهل الالتزامات غير الصحيحة
        END IF;
        
        -- التحقق من أن المبلغ لا يتجاوز المتبقي
        IF (allocation->>'amount')::NUMERIC > obligation_record.remaining_amount THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Allocation amount exceeds remaining obligation amount'
            );
        END IF;
        
        -- إنشاء التخصيص
        INSERT INTO public.payment_allocations (
            company_id, payment_id, obligation_id, allocated_amount,
            allocation_type, allocation_strategy, created_by
        ) VALUES (
            payment_record.company_id, p_payment_id, obligation_record.id, 
            (allocation->>'amount')::NUMERIC, 'manual', 'manual', auth.uid()
        ) RETURNING id INTO allocation_id;
        
        -- تحديث الالتزام
        UPDATE public.financial_obligations
        SET 
            paid_amount = COALESCE(paid_amount, 0) + (allocation->>'amount')::NUMERIC,
            status = CASE 
                WHEN (COALESCE(paid_amount, 0) + (allocation->>'amount')::NUMERIC) >= amount THEN 'paid'
                ELSE 'partially_paid'
            END,
            updated_at = now()
        WHERE id = obligation_record.id;
        
        -- إضافة إلى النتيجة
        result := jsonb_set(result, '{allocations}', 
            result->'allocations' || jsonb_build_object(
                'allocation_id', allocation_id,
                'obligation_id', obligation_record.id,
                'allocated_amount', (allocation->>'amount')::NUMERIC
            )
        );
        
        total_allocated := total_allocated + (allocation->>'amount')::NUMERIC;
    END LOOP;
    
    result := jsonb_set(result, '{total_allocated}', to_jsonb(total_allocated));
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Trigger to automatically allocate payments when they are completed
CREATE OR REPLACE FUNCTION public.trigger_auto_allocate_payment()
RETURNS TRIGGER AS $$
DECLARE
    allocation_result JSONB;
BEGIN
    -- تخصيص تلقائي عند اكتمال الدفعة
    IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
        -- استخدام استراتيجية FIFO كافتراضي
        allocation_result := public.allocate_payment_smart(
            NEW.id, 
            NEW.customer_id, 
            NEW.company_id, 
            NEW.amount, 
            'fifo'
        );
        
        -- تسجيل النتيجة في السجلات
        RAISE LOG 'Payment allocation result: %', allocation_result;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_allocate_payment ON public.payments;
CREATE TRIGGER trigger_auto_allocate_payment
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_auto_allocate_payment();

-- Add updated_at trigger for payment_allocations
DROP TRIGGER IF EXISTS update_payment_allocations_updated_at ON public.payment_allocations;
CREATE TRIGGER update_payment_allocations_updated_at
    BEFORE UPDATE ON public.payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.payment_allocations IS 'جدول تخصيص المدفوعات على الالتزامات المالية';
COMMENT ON COLUMN public.payment_allocations.allocation_strategy IS 'استراتيجية التخصيص: fifo, highest_interest, nearest_due, manual';
COMMENT ON FUNCTION public.allocate_payment_smart IS 'دالة التخصيص الذكي للمدفوعات حسب استراتيجيات مختلفة';
COMMENT ON FUNCTION public.allocate_payment_manual IS 'دالة التخصيص اليدوي للمدفوعات';
