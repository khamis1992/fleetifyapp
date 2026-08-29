-- Add vehicle_id column to rental_payment_receipts table
-- This allows direct tracking of which vehicle each payment is for

-- Add the vehicle_id column
ALTER TABLE rental_payment_receipts
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_rental_payment_receipts_vehicle_id 
ON rental_payment_receipts(vehicle_id);

-- Backfill existing records with vehicle_id from contracts
UPDATE rental_payment_receipts rpr
SET vehicle_id = c.vehicle_id
FROM contracts c
WHERE rpr.contract_id = c.id
  AND rpr.vehicle_id IS NULL
  AND c.vehicle_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN rental_payment_receipts.vehicle_id IS 'Vehicle associated with this payment - supports customers with multiple vehicles';;
