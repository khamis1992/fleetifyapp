-- ===============================
-- تحديث جدول إيصالات المدفوعات
-- Update Rental Payment Receipts
-- ===============================

-- إضافة أعمدة جديدة | Add new columns
ALTER TABLE public.rental_payment_receipts
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'credit_card', 'debit_card')),
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'cancelled', 'refunded')),
ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS fiscal_year INTEGER;

-- إنشاء فهارس جديدة | Create new indexes
CREATE INDEX IF NOT EXISTS idx_rental_receipts_contract ON public.rental_payment_receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_rental_receipts_vehicle ON public.rental_payment_receipts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rental_receipts_receipt_number ON public.rental_payment_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_rental_receipts_payment_status ON public.rental_payment_receipts(payment_status);
CREATE INDEX IF NOT EXISTS idx_rental_receipts_payment_method ON public.rental_payment_receipts(payment_method);

-- إنشاء تسلسل لأرقام الإيصالات | Create sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 1;

-- دالة لإنشاء رقم إيصال تلقائي | Function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix TEXT;
    seq_num TEXT;
BEGIN
    IF NEW.receipt_number IS NULL THEN
        year_suffix := TO_CHAR(NEW.payment_date, 'YY');
        seq_num := LPAD(nextval('public.receipt_number_seq')::TEXT, 6, '0');
        NEW.receipt_number := 'RCP-' || year_suffix || '-' || seq_num;
        NEW.fiscal_year := EXTRACT(YEAR FROM NEW.payment_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لإنشاء رقم الإيصال | Trigger to generate receipt number
DROP TRIGGER IF EXISTS generate_receipt_number_trigger ON public.rental_payment_receipts;
CREATE TRIGGER generate_receipt_number_trigger
    BEFORE INSERT ON public.rental_payment_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_receipt_number();

-- تعليقات | Comments
COMMENT ON COLUMN public.rental_payment_receipts.contract_id IS 'ربط مع عقد الإيجار - Link to rental contract';
COMMENT ON COLUMN public.rental_payment_receipts.vehicle_id IS 'ربط مع المركبة - Link to vehicle';
COMMENT ON COLUMN public.rental_payment_receipts.payment_method IS 'طريقة الدفع - Payment method';
COMMENT ON COLUMN public.rental_payment_receipts.receipt_number IS 'رقم الإيصال الفريد - Unique receipt number';
