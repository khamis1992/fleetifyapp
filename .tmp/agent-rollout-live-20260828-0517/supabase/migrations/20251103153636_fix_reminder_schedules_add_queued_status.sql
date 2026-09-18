
-- Migration: Fix reminder_schedules to support 'queued' status
-- Date: 2025-11-03
-- Purpose: Add 'queued' to the status check constraint for Ultramsg integration

-- Drop the existing constraint
ALTER TABLE reminder_schedules 
DROP CONSTRAINT IF EXISTS reminder_schedules_status_check;

-- Add updated constraint with 'queued' status
ALTER TABLE reminder_schedules 
ADD CONSTRAINT reminder_schedules_status_check 
CHECK (status = ANY (ARRAY['queued'::text, 'pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text]));

-- Update existing 'pending' records to 'queued' for processing
UPDATE reminder_schedules
SET status = 'queued'
WHERE status = 'pending';

-- Add comment
COMMENT ON COLUMN reminder_schedules.status IS 'Status: queued (في الانتظار للإرسال), pending (معلق), sent (مرسل), failed (فشل), cancelled (ملغى)';

-- Verify the change
SELECT 
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'reminder_schedules'::regclass
  AND conname = 'reminder_schedules_status_check';
;
