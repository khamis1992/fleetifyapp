-- Migration: Add Missing Late Fee Columns
-- Created: 2026-01-10
-- Description: This migration adds missing columns to late_fee_rules table
--              and ensures late fee columns exist on payments table.

-- =========================================
-- Add missing columns to late_fee_rules table
-- =========================================
-- Add percentage column (for percentage-based late fees)
ALTER TABLE public.late_fee_rules
ADD COLUMN IF NOT EXISTS percentage NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.late_fee_rules.percentage IS
    'The percentage value (0-100) for percentage-based late fees.';

-- Add min_amount column
ALTER TABLE public.late_fee_rules
ADD COLUMN IF NOT EXISTS min_fee_amount NUMERIC;

COMMENT ON COLUMN public.late_fee_rules.min_fee_amount IS
    'The minimum late fee amount.';

-- Add priority column
ALTER TABLE public.late_fee_rules
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;

COMMENT ON COLUMN public.late_fee_rules.priority IS
    'Priority of rule (higher number = higher priority). Used when multiple rules could apply.';

-- =========================================
-- Ensure late fee columns exist on payments table
-- =========================================
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS late_fine_amount NUMERIC;

COMMENT ON COLUMN public.payments.late_fine_amount IS
    'The amount of late fine applied to this payment.';

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS late_fine_days_overdue INTEGER;

COMMENT ON COLUMN public.payments.late_fine_days_overdue IS
    'Number of days payment was overdue when late fine was calculated.';

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS late_fine_type TEXT;

COMMENT ON COLUMN public.payments.late_fine_type IS
    'The type of late fine applied (e.g., fixed_amount, percentage_daily).';

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS late_fine_status TEXT DEFAULT 'not_applicable';

COMMENT ON COLUMN public.payments.late_fine_status IS
    'Current status of late fine for this payment (not_applicable, pending, applied, waived, paid).';

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS late_fine_waiver_reason TEXT;

COMMENT ON COLUMN public.payments.late_fine_waiver_reason IS
    'Reason if => late fine was waived.';;
