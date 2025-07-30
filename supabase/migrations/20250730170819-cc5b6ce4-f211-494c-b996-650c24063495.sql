-- Fix payment_status column mismatch issue
-- The payments table has a 'status' column but code/triggers are looking for 'payment_status'

-- Option 1: Rename the existing 'status' column to 'payment_status' to match expectations
ALTER TABLE public.payments RENAME COLUMN status TO payment_status;

-- Update any triggers or functions that might be affected
-- First, let's check if there are any triggers on the payments table that need updating

-- If there are any RLS policies referencing the old column name, they would need to be recreated
-- But we'll let Supabase handle that automatically

-- Update any existing data constraints or defaults if needed
-- The column already has a default value, so we just need to make sure it's preserved
ALTER TABLE public.payments ALTER COLUMN payment_status SET DEFAULT 'pending';