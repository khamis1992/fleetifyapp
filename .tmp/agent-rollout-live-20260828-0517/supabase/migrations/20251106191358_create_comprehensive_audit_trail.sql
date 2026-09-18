-- =====================================================
-- Comprehensive Audit Trail System
-- تاريخ: 2025-01-27
-- الوصف: نظام سجل تدقيق شامل لتتبع جميع التعديلات المحاسبية
-- =====================================================

-- 1. Create comprehensive audit_trail table
CREATE TABLE IF NOT EXISTS public.audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- What was changed
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Who made the change
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    
    -- When
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- What changed (JSON)
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    ip_address TEXT,
    user_agent TEXT,
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_company ON public.audit_trail(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON public.audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON public.audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_at ON public.audit_trail(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON public.audit_trail(action);

-- 3. Add comments
COMMENT ON TABLE public.audit_trail IS 'سجل تدقيق شامل لجميع التعديلات المحاسبية';
COMMENT ON COLUMN public.audit_trail.table_name IS 'اسم الجدول الذي تم التعديل عليه';
COMMENT ON COLUMN public.audit_trail.record_id IS 'معرّف السجل الذي تم التعديل عليه';
COMMENT ON COLUMN public.audit_trail.action IS 'نوع العملية: INSERT, UPDATE, DELETE';
COMMENT ON COLUMN public.audit_trail.old_values IS 'القيم القديمة قبل التعديل';
COMMENT ON COLUMN public.audit_trail.new_values IS 'القيم الجديدة بعد التعديل';
COMMENT ON COLUMN public.audit_trail.changed_fields IS 'قائمة الحقول التي تم تغييرها';

-- 4. Create function to log audit trail
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
    v_changed_fields TEXT[];
    v_user_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_company_id UUID;
BEGIN
    -- Get user information
    v_user_id := auth.uid();
    
    -- Get user email and name
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
    
    -- Get company_id from the record
    IF TG_OP = 'DELETE' THEN
        v_company_id := OLD.company_id;
    ELSE
        v_company_id := NEW.company_id;
    END IF;
    
    -- Process based on operation type
    IF TG_OP = 'INSERT' THEN
        v_new_values := to_jsonb(NEW);
        v_old_values := NULL;
        v_changed_fields := NULL;
        
        INSERT INTO public.audit_trail (
            company_id,
            table_name,
            record_id,
            action,
            user_id,
            user_email,
            user_name,
            old_values,
            new_values,
            changed_fields,
            description
        ) VALUES (
            v_company_id,
            TG_TABLE_NAME,
            NEW.id::TEXT,
            'INSERT',
            v_user_id,
            v_user_email,
            v_user_name,
            v_old_values,
            v_new_values,
            v_changed_fields,
            'تم إنشاء سجل جديد'
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        
        -- Find changed fields
        v_changed_fields := ARRAY(
            SELECT key
            FROM jsonb_each(v_new_values)
            WHERE v_old_values->key IS DISTINCT FROM v_new_values->key
        );
        
        -- Only log if there are actual changes
        IF array_length(v_changed_fields, 1) > 0 THEN
            INSERT INTO public.audit_trail (
                company_id,
                table_name,
                record_id,
                action,
                user_id,
                user_email,
                user_name,
                old_values,
                new_values,
                changed_fields,
                description
            ) VALUES (
                v_company_id,
                TG_TABLE_NAME,
                NEW.id::TEXT,
                'UPDATE',
                v_user_id,
                v_user_email,
                v_user_name,
                v_old_values,
                v_new_values,
                v_changed_fields,
                'تم تعديل السجل'
            );
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
        v_changed_fields := NULL;
        
        INSERT INTO public.audit_trail (
            company_id,
            table_name,
            record_id,
            action,
            user_id,
            user_email,
            user_name,
            old_values,
            new_values,
            changed_fields,
            description
        ) VALUES (
            v_company_id,
            TG_TABLE_NAME,
            OLD.id::TEXT,
            'DELETE',
            v_user_id,
            v_user_email,
            v_user_name,
            v_old_values,
            v_new_values,
            v_changed_fields,
            'تم حذف السجل'
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create triggers for important tables

-- Journal Entries
DROP TRIGGER IF EXISTS trg_audit_journal_entries ON public.journal_entries;
CREATE TRIGGER trg_audit_journal_entries
    AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_trail();

-- Journal Entry Lines
DROP TRIGGER IF EXISTS trg_audit_journal_entry_lines ON public.journal_entry_lines;
CREATE TRIGGER trg_audit_journal_entry_lines
    AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_trail();

-- Chart of Accounts
DROP TRIGGER IF EXISTS trg_audit_chart_of_accounts ON public.chart_of_accounts;
CREATE TRIGGER trg_audit_chart_of_accounts
    AFTER INSERT OR UPDATE OR DELETE ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_trail();

-- Invoices
DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_trail();

-- Payments
DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_trail();

-- Contracts
DROP TRIGGER IF EXISTS trg_audit_contracts ON public.contracts;
CREATE TRIGGER trg_audit_contracts
    AFTER INSERT OR UPDATE OR DELETE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_trail();

-- Customers
DROP TRIGGER IF EXISTS trg_audit_customers ON public.customers;
CREATE TRIGGER trg_audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_trail();

-- Cost Centers
DROP TRIGGER IF EXISTS trg_audit_cost_centers ON public.cost_centers;
CREATE TRIGGER trg_audit_cost_centers
    AFTER INSERT OR UPDATE OR DELETE ON public.cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_trail();

-- 6. Grant permissions
GRANT SELECT ON public.audit_trail TO authenticated;
GRANT INSERT ON public.audit_trail TO authenticated;

-- 7. Enable RLS
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
DROP POLICY IF EXISTS "Users can view audit trail for their company" ON public.audit_trail;
CREATE POLICY "Users can view audit trail for their company"
    ON public.audit_trail
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can insert audit trail" ON public.audit_trail;
CREATE POLICY "System can insert audit trail"
    ON public.audit_trail
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Comprehensive Audit Trail System created successfully!';
    RAISE NOTICE 'Triggers enabled for: journal_entries, journal_entry_lines, chart_of_accounts, invoices, payments, contracts, customers, cost_centers';
END $$;;
