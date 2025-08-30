-- إصلاح جميع القيود الخارجية المفقودة لدعم حذف الحسابات

-- تحديث قيد payments.account_id
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_account_id_fkey;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) 
ON DELETE SET NULL;

-- تحديث قيد vehicles.account_id (إذا كان موجوداً)
ALTER TABLE public.vehicles 
DROP CONSTRAINT IF EXISTS vehicles_account_id_fkey;

-- فقط إضافة القيد إذا كان العمود موجوداً
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.vehicles 
        ADD CONSTRAINT vehicles_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- تحديث قيد customers.account_id (إذا كان موجوداً)
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_account_id_fkey;

-- فقط إضافة القيد إذا كان العمود موجوداً
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.customers 
        ADD CONSTRAINT customers_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- تحديث قيد contracts.account_id (إذا كان موجوداً)
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_account_id_fkey;

-- فقط إضافة القيد إذا كان العمود موجوداً
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.contracts 
        ADD CONSTRAINT contracts_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- تحديث قيد invoices.account_id (إذا كان موجوداً)
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_account_id_fkey;

-- فقط إضافة القيد إذا كان العمود موجوداً
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT invoices_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- تحديث قيود أخرى قد تكون موجودة
-- account_mappings
ALTER TABLE public.account_mappings 
DROP CONSTRAINT IF EXISTS account_mappings_chart_of_accounts_id_fkey;

ALTER TABLE public.account_mappings 
ADD CONSTRAINT account_mappings_chart_of_accounts_id_fkey 
FOREIGN KEY (chart_of_accounts_id) REFERENCES public.chart_of_accounts(id) 
ON DELETE CASCADE;