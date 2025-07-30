-- إنشاء الأنواع المطلوبة للمدفوعات (بدون IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'cancelled', 'failed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'check', 'bank_transfer', 'credit_card', 'debit_card');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('payment', 'receipt');
    END IF;
END
$$;

-- إضافة عمود transaction_type إلى جدول payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS transaction_type transaction_type NOT NULL DEFAULT 'payment';

-- تحديث البيانات الموجودة لتعيين transaction_type بناءً على payment_type
UPDATE public.payments 
SET transaction_type = 
  CASE 
    WHEN payment_type = 'receipt' THEN 'receipt'::transaction_type
    ELSE 'payment'::transaction_type
  END;

-- إضافة فهارس للتحسين
CREATE INDEX IF NOT EXISTS idx_payments_transaction_type ON public.payments(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method);