-- Keep invoice_month aligned with the billing month when it is explicitly
-- provided, so it can never diverge from due_date (which the prepaid guard
-- derives from invoice_month). Falls back to invoice_date's month otherwise.
CREATE OR REPLACE FUNCTION public.update_invoice_month()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- يحترم invoice_month الصريح (شهر الفوترة) وإلا يشتقه من invoice_date
    NEW.invoice_month := COALESCE(
        NEW.invoice_month,
        DATE_TRUNC('month', NEW.invoice_date)::DATE
    );
    RETURN NEW;
END;
$function$;;
