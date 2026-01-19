-- Fix RLS policies for rental_payment_receipts table
-- This enables users to insert, select, update, and delete their own company's receipts

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their company rental receipts" ON rental_payment_receipts;
DROP POLICY IF EXISTS "Users can insert their company rental receipts" ON rental_payment_receipts;
DROP POLICY IF EXISTS "Users can update their company rental receipts" ON rental_payment_receipts;
DROP POLICY IF EXISTS "Users can delete their company rental receipts" ON rental_payment_receipts;

-- Enable RLS on the table
ALTER TABLE rental_payment_receipts ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Users can view receipts from their company
CREATE POLICY "Users can view their company rental receipts"
  ON rental_payment_receipts
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- INSERT Policy: Users can create receipts for their company
CREATE POLICY "Users can insert their company rental receipts"
  ON rental_payment_receipts
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- UPDATE Policy: Users can update receipts from their company
CREATE POLICY "Users can update their company rental receipts"
  ON rental_payment_receipts
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- DELETE Policy: Users can delete receipts from their company
CREATE POLICY "Users can delete their company rental receipts"
  ON rental_payment_receipts
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rental_payment_receipts TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully created RLS policies for rental_payment_receipts table';
END
$$;
