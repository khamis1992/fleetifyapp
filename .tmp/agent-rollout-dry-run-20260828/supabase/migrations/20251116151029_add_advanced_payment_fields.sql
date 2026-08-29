-- Add new columns to payments table for advanced payment tracking
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fee_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fee_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_completion_status VARCHAR(20) DEFAULT 'completed';

-- Add comments
COMMENT ON COLUMN payments.monthly_amount IS 'Monthly installment amount due';
COMMENT ON COLUMN payments.amount_paid IS 'Actual amount paid by customer';
COMMENT ON COLUMN payments.remaining_amount IS 'Remaining balance (monthly_amount - amount_paid)';
COMMENT ON COLUMN payments.due_date IS 'Payment due date (first day of payment_month)';
COMMENT ON COLUMN payments.days_overdue IS 'Number of days payment is overdue';
COMMENT ON COLUMN payments.late_fee_amount IS 'Late fee charged (120 SAR/day, max 3000 SAR/month)';
COMMENT ON COLUMN payments.late_fee_days IS 'Number of days used to calculate late fee';
COMMENT ON COLUMN payments.payment_completion_status IS 'Payment completion status: completed, partial, partial_late, late, overpaid';

-- Update existing payments to set new fields based on current data
UPDATE payments 
SET 
    monthly_amount = amount,
    amount_paid = amount,
    remaining_amount = 0,
    due_date = CASE 
        WHEN payment_month IS NOT NULL THEN (payment_month || '-01')::DATE
        ELSE NULL
    END,
    days_overdue = CASE 
        WHEN payment_month IS NOT NULL AND payment_date IS NOT NULL 
        THEN GREATEST(0, (payment_date::DATE - (payment_month || '-01')::DATE))
        ELSE 0
    END,
    payment_completion_status = CASE 
        WHEN payment_month IS NOT NULL AND payment_date IS NOT NULL AND payment_date::DATE > (payment_month || '-01')::DATE 
        THEN 'late'
        ELSE 'completed'
    END
WHERE monthly_amount IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_completion_status 
ON payments(payment_completion_status);

CREATE INDEX IF NOT EXISTS idx_payments_due_date 
ON payments(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_overdue 
ON payments(days_overdue) WHERE days_overdue > 0;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS calculate_late_fee(DATE, DATE, DECIMAL);
DROP FUNCTION IF EXISTS determine_payment_completion_status(DECIMAL, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS determine_payment_status(DECIMAL, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS auto_calculate_payment_fields();

-- Create function to calculate late fees (120 SAR/day, max 3000 SAR/month)
CREATE FUNCTION calculate_late_fee(
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
    v_daily_fee CONSTANT DECIMAL := 120.00;
    v_max_fee CONSTANT DECIMAL := 3000.00;
BEGIN
    v_days_overdue := GREATEST(0, p_payment_date - p_due_date);
    
    IF v_days_overdue > 0 THEN
        v_late_fee := v_days_overdue * v_daily_fee;
        
        IF v_late_fee > v_max_fee THEN
            v_late_fee := v_max_fee;
            v_late_fee_days := FLOOR(v_max_fee / v_daily_fee)::INTEGER;
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

-- Create function to determine payment completion status
CREATE FUNCTION determine_payment_completion_status(
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
        IF p_days_overdue > 0 THEN
            RETURN 'partial_late';
        ELSE
            RETURN 'partial';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION determine_payment_completion_status IS 'Determine payment completion status based on amount and timing';

-- Create trigger function to auto-calculate late fees and status on insert/update
CREATE FUNCTION auto_calculate_payment_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_late_fee_result RECORD;
BEGIN
    IF NEW.due_date IS NULL AND NEW.payment_month IS NOT NULL THEN
        NEW.due_date := (NEW.payment_month || '-01')::DATE;
    END IF;
    
    IF NEW.due_date IS NOT NULL AND NEW.payment_date IS NOT NULL AND NEW.monthly_amount IS NOT NULL THEN
        SELECT * INTO v_late_fee_result
        FROM calculate_late_fee(NEW.due_date, NEW.payment_date::DATE, NEW.monthly_amount);
        
        NEW.days_overdue := v_late_fee_result.days_overdue;
        NEW.late_fee_amount := v_late_fee_result.late_fee_amount;
        NEW.late_fee_days := v_late_fee_result.late_fee_days;
    END IF;
    
    IF NEW.monthly_amount IS NOT NULL AND NEW.amount_paid IS NOT NULL THEN
        NEW.remaining_amount := NEW.monthly_amount - NEW.amount_paid;
    END IF;
    
    IF NEW.monthly_amount IS NOT NULL AND NEW.amount_paid IS NOT NULL THEN
        NEW.payment_completion_status := determine_payment_completion_status(
            NEW.monthly_amount,
            NEW.amount_paid,
            COALESCE(NEW.days_overdue, 0)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_calculate_payment_fields ON payments;
CREATE TRIGGER trigger_auto_calculate_payment_fields
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_payment_fields();

COMMENT ON TRIGGER trigger_auto_calculate_payment_fields ON payments IS 'Auto-calculate late fees, remaining amount, and payment completion status';
;
