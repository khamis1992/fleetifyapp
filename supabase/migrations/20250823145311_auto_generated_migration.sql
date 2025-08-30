-- Add late fine columns to payments table
ALTER TABLE payments 
ADD COLUMN late_fine_amount NUMERIC DEFAULT 0,
ADD COLUMN late_fine_status TEXT DEFAULT 'none' CHECK (late_fine_status IN ('none', 'paid', 'waived', 'pending')),
ADD COLUMN late_fine_type TEXT DEFAULT 'none' CHECK (late_fine_type IN ('none', 'separate_payment', 'included_with_payment', 'waived')),
ADD COLUMN late_fine_waiver_reason TEXT;