-- Migration Part 3: Add Constraints
-- Date: 2026-01-31

-- حذف القيود إذا كانت موجودة مسبقاً
DO $$ 
BEGIN
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_months_unpaid_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_overdue_amount_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_late_penalty_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_days_overdue_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_invoices_count_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_total_invoices_amount_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_total_penalties_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_violations_count_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_violations_amount_positive;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- إضافة القيود الجديدة
ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_months_unpaid_positive 
CHECK (months_unpaid >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_overdue_amount_positive 
CHECK (overdue_amount >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_late_penalty_positive 
CHECK (late_penalty >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_days_overdue_positive 
CHECK (days_overdue >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_invoices_count_positive 
CHECK (invoices_count >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_total_invoices_amount_positive 
CHECK (total_invoices_amount >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_total_penalties_positive 
CHECK (total_penalties >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_violations_count_positive 
CHECK (violations_count >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_violations_amount_positive 
CHECK (violations_amount >= 0);;
