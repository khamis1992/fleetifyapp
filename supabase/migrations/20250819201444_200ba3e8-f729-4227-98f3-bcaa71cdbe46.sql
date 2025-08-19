-- المرحلة الأولى المُصححة: تحديث قيود قاعدة البيانات لدعم الحذف المتسلسل

-- 1. تحديث القيد الذاتي للحسابات الرئيسية/الفرعية
ALTER TABLE public.chart_of_accounts 
DROP CONSTRAINT IF EXISTS chart_of_accounts_parent_account_id_fkey;

ALTER TABLE public.chart_of_accounts 
ADD CONSTRAINT chart_of_accounts_parent_account_id_fkey 
FOREIGN KEY (parent_account_id) REFERENCES public.chart_of_accounts(id) 
ON DELETE CASCADE;

-- 2. تحديث القيود للجداول التي تحتوي فعلاً على account_id

-- journal_entry_lines (موجود في قاعدة البيانات)
ALTER TABLE public.journal_entry_lines 
DROP CONSTRAINT IF EXISTS journal_entry_lines_account_id_fkey;

ALTER TABLE public.journal_entry_lines 
ADD CONSTRAINT journal_entry_lines_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) 
ON DELETE RESTRICT; -- منع الحذف إذا كان هناك قيود محاسبية

-- budget_items (موجود في قاعدة البيانات)
ALTER TABLE public.budget_items 
DROP CONSTRAINT IF EXISTS budget_items_account_id_fkey;

ALTER TABLE public.budget_items 
ADD CONSTRAINT budget_items_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) 
ON DELETE SET NULL;

-- 3. إضافة جدول لتسجيل عمليات الحذف والنقل
CREATE TABLE IF NOT EXISTS public.account_deletion_log (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    deleted_account_id uuid,
    deleted_account_code varchar,
    deleted_account_name text,
    deletion_type text NOT NULL, -- 'cascade', 'transfer', 'force'
    transfer_to_account_id uuid REFERENCES public.chart_of_accounts(id),
    affected_records jsonb DEFAULT '{}',
    deleted_by uuid,
    deletion_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS للوگ
ALTER TABLE public.account_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deletion logs in their company" 
ON public.account_deletion_log FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "System can insert deletion logs" 
ON public.account_deletion_log FOR INSERT 
WITH CHECK (true);

-- 4. دالة لتسجيل تفاصيل الحذف
CREATE OR REPLACE FUNCTION public.log_account_deletion(
    p_company_id uuid,
    p_deleted_account_id uuid,
    p_deleted_account_code varchar,
    p_deleted_account_name text,
    p_deletion_type text,
    p_transfer_to_account_id uuid DEFAULT NULL,
    p_affected_records jsonb DEFAULT '{}',
    p_deletion_reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.account_deletion_log (
        company_id,
        deleted_account_id,
        deleted_account_code,
        deleted_account_name,
        deletion_type,
        transfer_to_account_id,
        affected_records,
        deleted_by,
        deletion_reason
    ) VALUES (
        p_company_id,
        p_deleted_account_id,
        p_deleted_account_code,
        p_deleted_account_name,
        p_deletion_type,
        p_transfer_to_account_id,
        p_affected_records,
        auth.uid(),
        p_deletion_reason
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;