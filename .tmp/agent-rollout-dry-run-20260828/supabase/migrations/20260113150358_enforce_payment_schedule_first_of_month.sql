
-- دالة لإجبار تواريخ جدول المدفوعات على يوم 1
CREATE OR REPLACE FUNCTION enforce_payment_schedule_first_of_month()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث due_date ليكون أول يوم في الشهر
    IF NEW.due_date IS NOT NULL THEN
        NEW.due_date := DATE_TRUNC('month', NEW.due_date)::DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إزالة الـ trigger القديم إن وجد
DROP TRIGGER IF EXISTS trg_enforce_payment_schedule_first_of_month ON contract_payment_schedules;

-- إضافة الـ trigger الجديد
CREATE TRIGGER trg_enforce_payment_schedule_first_of_month
BEFORE INSERT OR UPDATE ON contract_payment_schedules
FOR EACH ROW
EXECUTE FUNCTION enforce_payment_schedule_first_of_month();
;
