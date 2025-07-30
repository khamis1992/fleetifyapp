-- إنشاء الأنواع المطلوبة للمدفوعات
CREATE TYPE IF NOT EXISTS payment_status AS ENUM ('pending', 'completed', 'cancelled', 'failed');
CREATE TYPE IF NOT EXISTS payment_method AS ENUM ('cash', 'check', 'bank_transfer', 'credit_card', 'debit_card');
CREATE TYPE IF NOT EXISTS transaction_type AS ENUM ('payment', 'receipt');

-- إضافة عمود transaction_type إلى جدول payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS transaction_type transaction_type NOT NULL DEFAULT 'payment';

-- تحديث العمود payment_status ليستخدم النوع الجديد
ALTER TABLE public.payments 
ALTER COLUMN payment_status TYPE payment_status USING payment_status::payment_status;

-- تحديث العمود payment_method ليستخدم النوع الجديد
ALTER TABLE public.payments 
ALTER COLUMN payment_method TYPE payment_method USING payment_method::payment_method;

-- تحديث البيانات الموجودة لتعيين transaction_type بناءً على payment_type
UPDATE public.payments 
SET transaction_type = 
  CASE 
    WHEN payment_type = 'receipt' THEN 'receipt'::transaction_type
    ELSE 'payment'::transaction_type
  END;

-- إضافة فهرس للتحسين
CREATE INDEX IF NOT EXISTS idx_payments_transaction_type ON public.payments(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method);