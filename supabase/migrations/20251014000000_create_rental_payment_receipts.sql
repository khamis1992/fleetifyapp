-- Migration: Create Rental Payment Receipts System
-- تاريخ: 2025-10-14
-- الوصف: نظام تتبع مدفوعات إيجار السيارات مع حساب الغرامات التلقائي

-- ===============================
-- إنشاء جدول إيصالات مدفوعات الإيجار
-- ===============================

CREATE TABLE IF NOT EXISTS public.rental_payment_receipts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    month TEXT NOT NULL, -- e.g., "يناير 2025" in Arabic
    rent_amount NUMERIC NOT NULL CHECK (rent_amount >= 0),
    payment_date DATE NOT NULL,
    fine NUMERIC NOT NULL DEFAULT 0 CHECK (fine >= 0),
    total_paid NUMERIC NOT NULL CHECK (total_paid >= 0),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT rental_receipts_valid_amounts CHECK (total_paid = rent_amount + fine)
);

-- ===============================
-- الفهارس
-- ===============================

CREATE INDEX IF NOT EXISTS idx_rental_receipts_company_id ON public.rental_payment_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_rental_receipts_customer_id ON public.rental_payment_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_receipts_payment_date ON public.rental_payment_receipts(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_rental_receipts_created_at ON public.rental_payment_receipts(created_at DESC);

-- Composite index for customer payment history queries
CREATE INDEX IF NOT EXISTS idx_rental_receipts_customer_company ON public.rental_payment_receipts(customer_id, company_id, payment_date DESC);

-- ===============================
-- Row Level Security (RLS) Policies
-- ===============================

ALTER TABLE public.rental_payment_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see receipts for their company
CREATE POLICY "Users can view company rental receipts"
    ON public.rental_payment_receipts
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert receipts for their company
CREATE POLICY "Users can create company rental receipts"
    ON public.rental_payment_receipts
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update receipts for their company
CREATE POLICY "Users can update company rental receipts"
    ON public.rental_payment_receipts
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete receipts for their company
CREATE POLICY "Users can delete company rental receipts"
    ON public.rental_payment_receipts
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- ===============================
-- تحديث Timestamp تلقائياً
-- ===============================

CREATE OR REPLACE FUNCTION public.update_rental_receipt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rental_receipts_updated_at_trigger
    BEFORE UPDATE ON public.rental_payment_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rental_receipt_updated_at();

-- ===============================
-- دالة لحساب الغرامة تلقائياً
-- ===============================

CREATE OR REPLACE FUNCTION public.calculate_rental_delay_fine(
    payment_date_param DATE,
    monthly_rent_param NUMERIC
)
RETURNS TABLE(
    fine NUMERIC,
    days_late INTEGER
) AS $$
DECLARE
    payment_day INTEGER;
    days_late_calc INTEGER;
    fine_calc NUMERIC;
    DELAY_FINE_PER_DAY CONSTANT NUMERIC := 120; -- QAR per day
    MAX_FINE_PER_MONTH CONSTANT NUMERIC := 3000; -- QAR max per month
BEGIN
    -- Get the day of the month
    payment_day := EXTRACT(DAY FROM payment_date_param);
    
    -- Calculate days late (due date is day 1 of month)
    IF payment_day > 1 THEN
        days_late_calc := payment_day - 1;
        fine_calc := LEAST(days_late_calc * DELAY_FINE_PER_DAY, MAX_FINE_PER_MONTH);
    ELSE
        days_late_calc := 0;
        fine_calc := 0;
    END IF;
    
    RETURN QUERY SELECT fine_calc, days_late_calc;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===============================
-- دالة لجلب إجماليات العميل
-- ===============================

CREATE OR REPLACE FUNCTION public.get_customer_rental_payment_totals(
    customer_id_param UUID,
    company_id_param UUID
)
RETURNS TABLE(
    total_payments NUMERIC,
    total_fines NUMERIC,
    total_rent NUMERIC,
    receipt_count INTEGER,
    last_payment_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(total_paid), 0) as total_payments,
        COALESCE(SUM(fine), 0) as total_fines,
        COALESCE(SUM(rent_amount), 0) as total_rent,
        COUNT(*)::INTEGER as receipt_count,
        MAX(payment_date) as last_payment_date
    FROM public.rental_payment_receipts
    WHERE customer_id = customer_id_param
    AND company_id = company_id_param;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===============================
-- تعليقات الجداول والأعمدة
-- ===============================

COMMENT ON TABLE public.rental_payment_receipts IS 'جدول تتبع إيصالات مدفوعات إيجار السيارات مع الغرامات';
COMMENT ON COLUMN public.rental_payment_receipts.month IS 'الشهر المدفوع عنه بالعربية (مثال: يناير 2025)';
COMMENT ON COLUMN public.rental_payment_receipts.fine IS 'غرامة التأخير - 120 ريال لكل يوم، حد أقصى 3000 ريال';
COMMENT ON COLUMN public.rental_payment_receipts.payment_date IS 'تاريخ الدفع - الاستحقاق يوم 1 من كل شهر';

-- ===============================
-- إدراج بيانات تجريبية (اختياري)
-- ===============================

-- يمكن إضافة بيانات تجريبية هنا إذا لزم الأمر
