-- إنشاء دالة لتسجيل العمليات التلقائي
CREATE OR REPLACE FUNCTION log_activity_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id_val uuid;
    company_id_val uuid;
    action_name text;
    resource_name text;
    old_data jsonb;
    new_data jsonb;
BEGIN
    -- تحديد المستخدم الحالي
    user_id_val := auth.uid();
    
    -- تحديد معرف الشركة
    IF TG_TABLE_NAME = 'companies' THEN
        company_id_val := COALESCE(NEW.id, OLD.id);
    ELSE
        company_id_val := COALESCE(NEW.company_id, OLD.company_id);
    END IF;
    
    -- تحديد نوع العملية
    CASE TG_OP
        WHEN 'INSERT' THEN
            action_name := 'create';
            new_data := row_to_json(NEW)::jsonb;
        WHEN 'UPDATE' THEN
            action_name := 'update';
            old_data := row_to_json(OLD)::jsonb;
            new_data := row_to_json(NEW)::jsonb;
        WHEN 'DELETE' THEN
            action_name := 'delete';
            old_data := row_to_json(OLD)::jsonb;
        ELSE
            action_name := 'unknown';
    END CASE;
    
    -- تحديد اسم المورد
    resource_name := TG_TABLE_NAME;
    
    -- إدراج السجل
    INSERT INTO public.system_logs (
        company_id,
        user_id,
        level,
        category,
        action,
        resource_type,
        resource_id,
        message,
        metadata
    ) VALUES (
        company_id_val,
        user_id_val,
        'info',
        CASE TG_TABLE_NAME
            WHEN 'customers' THEN 'customers'
            WHEN 'contracts' THEN 'contracts'
            WHEN 'vehicles' THEN 'fleet'
            WHEN 'employees' THEN 'hr'
            WHEN 'invoices' THEN 'finance'
            WHEN 'payments' THEN 'finance'
            WHEN 'bank_transactions' THEN 'finance'
            WHEN 'journal_entries' THEN 'finance'
            ELSE 'system'
        END,
        action_name,
        resource_name,
        COALESCE(NEW.id, OLD.id),
        CASE TG_OP
            WHEN 'INSERT' THEN 'تم إنشاء ' || resource_name || ' جديد'
            WHEN 'UPDATE' THEN 'تم تحديث ' || resource_name
            WHEN 'DELETE' THEN 'تم حذف ' || resource_name
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'old_data', old_data,
            'new_data', new_data
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء triggers للجداول الرئيسية
CREATE TRIGGER log_customers_activity
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_activity_trigger();

CREATE TRIGGER log_contracts_activity
    AFTER INSERT OR UPDATE OR DELETE ON contracts
    FOR EACH ROW EXECUTE FUNCTION log_activity_trigger();

CREATE TRIGGER log_vehicles_activity
    AFTER INSERT OR UPDATE OR DELETE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION log_activity_trigger();

CREATE TRIGGER log_employees_activity
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION log_activity_trigger();

CREATE TRIGGER log_invoices_activity
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_activity_trigger();

CREATE TRIGGER log_payments_activity
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_activity_trigger();

CREATE TRIGGER log_bank_transactions_activity
    AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
    FOR EACH ROW EXECUTE FUNCTION log_activity_trigger();

CREATE TRIGGER log_journal_entries_activity
    AFTER INSERT OR UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION log_activity_trigger();