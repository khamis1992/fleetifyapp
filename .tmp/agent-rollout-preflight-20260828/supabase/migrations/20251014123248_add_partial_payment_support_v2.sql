-- Add support for partial payments
-- Allow customers to pay less than the full amount and track pending balance

-- Step 1: Drop the constraint that forces total_paid = rent_amount + fine
ALTER TABLE public.rental_payment_receipts
DROP CONSTRAINT IF EXISTS rental_receipts_valid_amounts;

-- Step 2: Add new columns for partial payment tracking
ALTER TABLE public.rental_payment_receipts
ADD COLUMN IF NOT EXISTS amount_due NUMERIC NOT NULL DEFAULT 0 CHECK (amount_due >= 0);

ALTER TABLE public.rental_payment_receipts
ADD COLUMN IF NOT EXISTS pending_balance NUMERIC NOT NULL DEFAULT 0 CHECK (pending_balance >= 0);

ALTER TABLE public.rental_payment_receipts
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid'
CHECK (payment_status IN ('paid', 'partial', 'pending'));

-- Step 3: Update existing records to set amount_due and recalculate pending_balance
UPDATE public.rental_payment_receipts
SET 
  amount_due = rent_amount + fine,
  pending_balance = GREATEST(0, (rent_amount + fine) - total_paid),
  payment_status = CASE
    WHEN total_paid >= (rent_amount + fine) THEN 'paid'
    WHEN total_paid > 0 THEN 'partial'
    ELSE 'pending'
  END
WHERE amount_due = 0; -- Only update records that haven't been updated yet

-- Step 4: Add index for payment status queries
CREATE INDEX IF NOT EXISTS idx_rental_receipts_payment_status 
ON public.rental_payment_receipts(company_id, payment_status, payment_date DESC);

-- Step 5: Create trigger to auto-calculate pending balance and status
CREATE OR REPLACE FUNCTION public.calculate_rental_payment_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate pending balance
  NEW.pending_balance := GREATEST(0, NEW.amount_due - NEW.total_paid);
  
  -- Determine payment status
  IF NEW.total_paid >= NEW.amount_due THEN
    NEW.payment_status := 'paid';
  ELSIF NEW.total_paid > 0 THEN
    NEW.payment_status := 'partial';
  ELSE
    NEW.payment_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rental_payment_balance_trigger ON public.rental_payment_receipts;

CREATE TRIGGER rental_payment_balance_trigger
  BEFORE INSERT OR UPDATE ON public.rental_payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_rental_payment_balance();

-- Step 6: Drop and recreate the totals function with new columns
DROP FUNCTION IF EXISTS public.get_customer_rental_payment_totals(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_customer_rental_payment_totals(
    customer_id_param UUID,
    company_id_param UUID
)
RETURNS TABLE(
    total_payments NUMERIC,
    total_fines NUMERIC,
    total_rent NUMERIC,
    total_pending NUMERIC,
    total_due NUMERIC,
    receipt_count INTEGER,
    last_payment_date DATE,
    partial_payment_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(total_paid), 0) as total_payments,
        COALESCE(SUM(fine), 0) as total_fines,
        COALESCE(SUM(rent_amount), 0) as total_rent,
        COALESCE(SUM(pending_balance), 0) as total_pending,
        COALESCE(SUM(amount_due), 0) as total_due,
        COUNT(*)::INTEGER as receipt_count,
        MAX(payment_date) as last_payment_date,
        COUNT(*) FILTER (WHERE payment_status = 'partial')::INTEGER as partial_payment_count
    FROM public.rental_payment_receipts
    WHERE customer_id = customer_id_param
    AND company_id = company_id_param;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_customer_rental_payment_totals TO authenticated;

-- Step 7: Add comments
COMMENT ON COLUMN public.rental_payment_receipts.amount_due IS 'المبلغ المستحق الكلي (الإيجار + الغرامة)';
COMMENT ON COLUMN public.rental_payment_receipts.pending_balance IS 'الرصيد المتبقي (غير مدفوع)';
COMMENT ON COLUMN public.rental_payment_receipts.payment_status IS 'حالة الدفع: paid (مدفوع كاملاً), partial (دفع جزئي), pending (معلق)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully added partial payment support to rental_payment_receipts table';
END
$$;;
