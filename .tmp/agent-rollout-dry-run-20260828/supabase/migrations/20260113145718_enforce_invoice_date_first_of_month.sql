
-- دالة لإجبار تواريخ الفواتير على يوم 1
CREATE OR REPLACE FUNCTION enforce_invoice_date_first_of_month()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث invoice_date ليكون أول يوم في الشهر
    IF NEW.invoice_date IS NOT NULL THEN
        NEW.invoice_date := DATE_TRUNC('month', NEW.invoice_date)::DATE;
    END IF;
    
    -- تحديث due_date ليكون أول يوم في الشهر
    IF NEW.due_date IS NOT NULL THEN
        NEW.due_date := DATE_TRUNC('month', NEW.due_date)::DATE;
    END IF;
    
    -- تحديث invoice_month ليتوافق
    NEW.invoice_month := COALESCE(NEW.invoice_date, NEW.due_date, DATE_TRUNC('month', NOW())::DATE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إزالة الـ trigger القديم إن وجد
DROP TRIGGER IF EXISTS trg_enforce_invoice_date_first_of_month ON invoices;

-- إضافة الـ trigger الجديد (قبل INSERT و UPDATE)
CREATE TRIGGER trg_enforce_invoice_date_first_of_month
BEFORE INSERT OR UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION enforce_invoice_date_first_of_month();

-- تحديث دالة update_invoice_month لتكون متوافقة
CREATE OR REPLACE FUNCTION update_invoice_month()
RETURNS TRIGGER AS $$
BEGIN
    -- invoice_month يجب أن يكون أول يوم في الشهر من invoice_date
    NEW.invoice_month := DATE_TRUNC('month', NEW.invoice_date)::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
;
