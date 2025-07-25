-- إصلاح دالة handle_payroll_changes لاستخدام المسار الكامل للدالة
CREATE OR REPLACE FUNCTION public.handle_payroll_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Create journal entry when payroll status changes to 'approved' or 'paid'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('approved', 'paid') AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := public.create_payroll_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status IN ('approved', 'paid') AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := public.create_payroll_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;