-- Advanced Payment System Migration
-- Adds support for:
-- 1. Partial payments
-- 2. Late fees (120 SAR/day, max 3000 SAR/month)
-- 3. Multiple payments per month
-- 4. Carry-forward balance

-- Add new columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10,2),           -- القسط الشهري المستحق
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2),             -- المبلغ المدفوع فعلياً
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2),        -- المبلغ المتبقي
ADD COLUMN IF NOT EXISTS due_date DATE,                         -- تاريخ الاستحقاق
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0,        -- عدد أيام التأخير
ADD COLUMN IF NOT EXISTS late_fee_amount DECIMAL(10,2) DEFAULT 0, -- مبلغ غرامة التأخير
ADD COLUMN IF NOT EXISTS late_fee_days INTEGER DEFAULT 0,       -- أيام الغرامة المحسوبة
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'completed'; -- حالة الدفع

-- Add comments
COMMENT ON COLUMN payments.monthly_amount IS 'Monthly installment amount due';
COMMENT ON COLUMN payments.amount_paid IS 'Actual amount paid by customer';
COMMENT ON COLUMN payments.remaining_amount IS 'Remaining balance (monthly_amount - amount_paid)';
COMMENT ON COLUMN payments.due_date IS 'Payment due date (first day of payment_month)';
COMMENT ON COLUMN payments.days_overdue IS 'Number of days payment is overdue';
COMMENT ON COLUMN payments.late_fee_amount IS 'Late fee charged (120 SAR/day, max 3000 SAR/month)';
COMMENT ON COLUMN payments.late_fee_days IS 'Number of days used to calculate late fee';
COMMENT ON COLUMN payments.payment_status IS 'Payment status: completed, partial, partial_late, late, overpaid';

-- Update existing payments to set new fields based on current data
UPDATE payments 
SET 
    monthly_amount = amount,
    amount_paid = amount,
    remaining_amount = 0,
    due_date = (payment_month || '-01')::DATE,
    days_overdue = GREATEST(0, (payment_date::DATE - (payment_month || '-01')::DATE)),
    payment_status = CASE 
        WHEN payment_date::DATE > (payment_month || '-01')::DATE THEN 'late'
        ELSE 'completed'
    END
WHERE monthly_amount IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(payment_status);

CREATE INDEX IF NOT EXISTS idx_payments_due_date 
ON payments(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_overdue 
ON payments(days_overdue) WHERE days_overdue > 0;

-- Create function to calculate late fees
CREATE OR REPLACE FUNCTION calculate_late_fee(
    p_due_date DATE,
    p_payment_date DATE,
    p_monthly_amount DECIMAL
) RETURNS TABLE (
    days_overdue INTEGER,
    late_fee_amount DECIMAL,
    late_fee_days INTEGER
) AS $$
DECLARE
    v_days_overdue INTEGER;
    v_late_fee DECIMAL;
    v_late_fee_days INTEGER;
    v_daily_fee CONSTANT DECIMAL := 120.00;  -- 120 SAR per day
    v_max_fee CONSTANT DECIMAL := 3000.00;   -- Max 3000 SAR per month
BEGIN
    -- Calculate days overdue
    v_days_overdue := GREATEST(0, p_payment_date - p_due_date);
    
    -- Calculate late fee
    IF v_days_overdue > 0 THEN
        -- Calculate fee (120 SAR per day)
        v_late_fee := v_days_overdue * v_daily_fee;
        
        -- Apply maximum cap (3000 SAR)
        IF v_late_fee > v_max_fee THEN
            v_late_fee := v_max_fee;
            v_late_fee_days := FLOOR(v_max_fee / v_daily_fee)::INTEGER; -- 25 days
        ELSE
            v_late_fee_days := v_days_overdue;
        END IF;
    ELSE
        v_late_fee := 0;
        v_late_fee_days := 0;
    END IF;
    
    RETURN QUERY SELECT v_days_overdue, v_late_fee, v_late_fee_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_late_fee IS 'Calculate late fee: 120 SAR/day, max 3000 SAR/month';

-- Create function to determine payment status
CREATE OR REPLACE FUNCTION determine_payment_status(
    p_monthly_amount DECIMAL,
    p_amount_paid DECIMAL,
    p_days_overdue INTEGER
) RETURNS VARCHAR AS $$
BEGIN
    IF p_amount_paid >= p_monthly_amount THEN
        IF p_amount_paid > p_monthly_amount THEN
            RETURN 'overpaid';
        ELSIF p_days_overdue > 0 THEN
            RETURN 'late';
        ELSE
            RETURN 'completed';
        END IF;
    ELSE
        -- Partial payment
        IF p_days_overdue > 0 THEN
            RETURN 'partial_late';
        ELSE
            RETURN 'partial';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION determine_payment_status IS 'Determine payment status based on amount and timing';

-- Create trigger to auto-calculate late fees and status on insert/update
CREATE OR REPLACE FUNCTION auto_calculate_payment_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_late_fee_result RECORD;
BEGIN
    -- Set due_date if not provided (first day of payment_month)
    IF NEW.due_date IS NULL AND NEW.payment_month IS NOT NULL THEN
        NEW.due_date := (NEW.payment_month || '-01')::DATE;
    END IF;
    
    -- Calculate late fees
    IF NEW.due_date IS NOT NULL AND NEW.payment_date IS NOT NULL THEN
        SELECT * INTO v_late_fee_result
        FROM calculate_late_fee(NEW.due_date, NEW.payment_date::DATE, NEW.monthly_amount);
        
        NEW.days_overdue := v_late_fee_result.days_overdue;
        NEW.late_fee_amount := v_late_fee_result.late_fee_amount;
        NEW.late_fee_days := v_late_fee_result.late_fee_days;
    END IF;
    
    -- Calculate remaining amount
    IF NEW.monthly_amount IS NOT NULL AND NEW.amount_paid IS NOT NULL THEN
        NEW.remaining_amount := NEW.monthly_amount - NEW.amount_paid;
    END IF;
    
    -- Determine payment status
    IF NEW.monthly_amount IS NOT NULL AND NEW.amount_paid IS NOT NULL THEN
        NEW.payment_status := determine_payment_status(
            NEW.monthly_amount,
            NEW.amount_paid,
            COALESCE(NEW.days_overdue, 0)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_calculate_payment_fields ON payments;
CREATE TRIGGER trigger_auto_calculate_payment_fields
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_payment_fields();

COMMENT ON TRIGGER trigger_auto_calculate_payment_fields ON payments IS 'Auto-calculate late fees, remaining amount, and payment status';
