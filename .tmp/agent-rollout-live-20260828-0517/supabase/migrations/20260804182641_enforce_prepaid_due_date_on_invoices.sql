-- Unify invoice due-date convention: due is ALWAYS the 1st of the invoice
-- month (prepaid billing). The previous guard only forced "first of SOME
-- month", which let the legacy M/M+1 pattern (April invoice due May 1st)
-- slip through. Now every INSERT/UPDATE on invoices is normalized so
-- due_date = date_trunc('month', invoice_month), regardless of the writer.
CREATE OR REPLACE FUNCTION public.enforce_invoice_date_first_of_month()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- invoice_date يبقى أول يوم في الشهر (سلوك قائم)
    IF NEW.invoice_date IS NOT NULL THEN
        NEW.invoice_date := DATE_TRUNC('month', NEW.invoice_date)::DATE;
    END IF;

    -- شهر الفاتورة من invoice_month ثم invoice_date ثم due_date
    NEW.invoice_month := DATE_TRUNC(
        'month',
        COALESCE(NEW.invoice_month, NEW.invoice_date, NEW.due_date, NOW())
    )::DATE;

    -- الاستحقاق دائمًا يوم 1 من شهر الفاتورة نفسه (الدفع مقدمًا)
    NEW.due_date := NEW.invoice_month;

    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.enforce_invoice_date_first_of_month() IS
'يضمن أن استحقاق كل فاتورة هو يوم 1 من شهر الفاتورة نفسه (اصطلاح الدفع المقدم الموحّد). يمنع نمط M/M+1 القديم من أي مسار إنشاء حالي أو مستقبلي.';;
