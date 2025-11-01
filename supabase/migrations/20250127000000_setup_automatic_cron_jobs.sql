-- ================================================================
-- AUTOMATIC CRON JOBS SETUP
-- ================================================================
-- Purpose: Configure scheduled tasks for automatic system operations
-- Features:
--   1. Monthly invoice generation (28th of each month)
--   2. Daily payment reminders (9 AM daily)
--   3. Daily overdue invoice processing (9 AM daily)
-- Date: 2025-01-27
-- ================================================================

-- ================================================================
-- STEP 1: Enable pg_cron Extension (if not already enabled)
-- ================================================================
-- Note: This extension allows PostgreSQL to schedule jobs
-- If already enabled, this will not cause an error

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ================================================================
-- STEP 1.5: Ensure Required Tables Exist for Late Fees
-- ================================================================
-- This ensures that late_fees table exists before scheduling cron jobs
-- If migration 20250126120000 was not run, create minimal tables here

DO $$
BEGIN
    -- Check if late_fees table exists, if not create it
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'late_fees'
    ) THEN
        RAISE NOTICE '⚠️ late_fees table not found. Creating minimal structure...';
        
        -- Create late_fee_rules table if not exists
        CREATE TABLE IF NOT EXISTS public.late_fee_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            rule_name TEXT NOT NULL,
            grace_period_days INTEGER DEFAULT 0,
            fee_type TEXT NOT NULL CHECK (fee_type IN ('fixed', 'percentage', 'daily')),
            fee_amount NUMERIC(15, 3) NOT NULL,
            max_fee_amount NUMERIC(15, 3),
            apply_to_invoice_types TEXT[],
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT unique_company_rule_name UNIQUE (company_id, rule_name)
        );
        
        -- Create late_fees table
        CREATE TABLE IF NOT EXISTS public.late_fees (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
            late_fee_rule_id UUID REFERENCES late_fee_rules(id) ON DELETE SET NULL,
            original_amount NUMERIC(15, 3) NOT NULL,
            days_overdue INTEGER NOT NULL,
            fee_amount NUMERIC(15, 3) NOT NULL,
            fee_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'waived', 'cancelled')),
            applied_at TIMESTAMP WITH TIME ZONE,
            applied_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
            waive_requested_at TIMESTAMP WITH TIME ZONE,
            waive_requested_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
            waive_reason TEXT,
            waived_at TIMESTAMP WITH TIME ZONE,
            waived_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
            waiver_approval_notes TEXT,
            customer_notified_at TIMESTAMP WITH TIME ZONE,
            notification_sent BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT unique_invoice_late_fee UNIQUE (invoice_id, created_at)
        );
        
        -- Create late_fee_history table
        CREATE TABLE IF NOT EXISTS public.late_fee_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            late_fee_id UUID NOT NULL REFERENCES late_fees(id) ON DELETE CASCADE,
            action TEXT NOT NULL CHECK (action IN ('created', 'applied', 'waive_requested', 'waived', 'rejected', 'cancelled')),
            user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_late_fees_invoice ON late_fees(invoice_id);
        CREATE INDEX IF NOT EXISTS idx_late_fees_contract ON late_fees(contract_id);
        CREATE INDEX IF NOT EXISTS idx_late_fees_status ON late_fees(status);
        CREATE INDEX IF NOT EXISTS idx_late_fees_created_at ON late_fees(created_at DESC);
        
        RAISE NOTICE '✅ Created late_fees tables structure';
    ELSE
        RAISE NOTICE '✅ late_fees table already exists';
    END IF;
END $$;

-- ================================================================
-- STEP 2: Ensure Required Functions Exist
-- ================================================================
-- Create functions if they don't exist (CREATE OR REPLACE is safe)

-- Create calculate_late_fee function first (dependency)
CREATE OR REPLACE FUNCTION calculate_late_fee(
    p_invoice_id UUID,
    p_days_overdue INTEGER,
    p_late_fee_rule_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_rule RECORD;
    v_fee_amount NUMERIC := 0;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN RETURN 0; END IF;
    
    -- Get late fee rule
    IF p_late_fee_rule_id IS NOT NULL THEN
        SELECT * INTO v_rule FROM late_fee_rules WHERE id = p_late_fee_rule_id;
    ELSE
        SELECT * INTO v_rule FROM late_fee_rules
        WHERE company_id = v_invoice.company_id AND is_active = true
        ORDER BY created_at DESC LIMIT 1;
    END IF;
    
    IF NOT FOUND THEN RETURN 0; END IF;
    
    -- Apply grace period
    IF p_days_overdue <= v_rule.grace_period_days THEN RETURN 0; END IF;
    
    -- Calculate fee
    CASE v_rule.fee_type
        WHEN 'fixed' THEN v_fee_amount := v_rule.fee_amount;
        WHEN 'percentage' THEN v_fee_amount := (v_invoice.total_amount * v_rule.fee_amount) / 100;
        WHEN 'daily' THEN v_fee_amount := v_rule.fee_amount * (p_days_overdue - v_rule.grace_period_days);
    END CASE;
    
    -- Apply max cap
    IF v_rule.max_fee_amount IS NOT NULL AND v_fee_amount > v_rule.max_fee_amount THEN
        v_fee_amount := v_rule.max_fee_amount;
    END IF;
    
    RETURN v_fee_amount;
END;
$$;

-- Create process_overdue_invoices function
CREATE OR REPLACE FUNCTION process_overdue_invoices()
RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    days_overdue INTEGER,
    fee_amount NUMERIC,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_days_overdue INTEGER;
    v_fee_amount NUMERIC;
    v_late_fee_id UUID;
    v_existing_fee UUID;
BEGIN
    -- Process all overdue invoices
    FOR v_invoice IN
        SELECT i.* FROM invoices i
        WHERE i.status IN ('sent', 'overdue', 'unpaid')
        AND i.due_date < CURRENT_DATE
        AND (i.payment_status IS NULL OR i.payment_status != 'paid')
    LOOP
        -- Calculate days overdue
        v_days_overdue := CURRENT_DATE - v_invoice.due_date;
        
        -- Check if late fee already exists for today
        SELECT id INTO v_existing_fee
        FROM late_fees
        WHERE invoice_id = v_invoice.id
        AND DATE(created_at) = CURRENT_DATE;
        
        IF v_existing_fee IS NOT NULL THEN
            CONTINUE;
        END IF;
        
        -- Calculate fee amount
        v_fee_amount := calculate_late_fee(v_invoice.id, v_days_overdue);
        
        IF v_fee_amount > 0 THEN
            -- Create late fee record
            INSERT INTO late_fees (
                company_id, invoice_id, contract_id,
                original_amount, days_overdue, fee_amount, fee_type, status
            )
            VALUES (
                v_invoice.company_id, v_invoice.id, v_invoice.contract_id,
                v_invoice.total_amount, v_days_overdue, v_fee_amount,
                COALESCE((SELECT fee_type FROM late_fee_rules WHERE company_id = v_invoice.company_id AND is_active = true LIMIT 1), 'percentage'),
                'pending'
            )
            RETURNING id INTO v_late_fee_id;
            
            -- Update invoice status
            UPDATE invoices SET status = 'overdue' WHERE id = v_invoice.id;
            
            -- Return result
            invoice_id := v_invoice.id;
            invoice_number := v_invoice.invoice_number;
            days_overdue := v_days_overdue;
            fee_amount := v_fee_amount;
            status := 'created';
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_overdue_invoices TO authenticated;
GRANT EXECUTE ON FUNCTION process_overdue_invoices TO service_role;
GRANT EXECUTE ON FUNCTION calculate_late_fee TO authenticated;

-- ================================================================
-- STEP 3: Remove Existing Cron Jobs (if any) to avoid duplicates
-- ================================================================
-- This ensures clean setup if script is run multiple times

SELECT cron.unschedule('monthly-invoice-generation') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monthly-invoice-generation'
);

SELECT cron.unschedule('check-payment-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-payment-reminders'
);

SELECT cron.unschedule('process-overdue-invoices') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-overdue-invoices'
);

-- ================================================================
-- CRON JOB 1: Monthly Invoice Generation
-- ================================================================
-- Schedule: 28th of each month at 9:00 AM
-- Purpose: Generate invoices for all active contracts for the next month
-- Function: run_monthly_invoice_generation()
-- ================================================================

SELECT cron.schedule(
  'monthly-invoice-generation',           -- Job name (unique identifier)
  '0 9 28 * *',                         -- Schedule: Day 28 at 9:00 AM every month
  $$SELECT run_monthly_invoice_generation()$$  -- Function to execute
);

-- ================================================================
-- CRON JOB 2: Daily Payment Reminders
-- ================================================================
-- Schedule: Every day at 9:00 AM
-- Purpose: Check for pending reminders and send them to customers
-- Function: check_payment_reminders()
-- ================================================================

SELECT cron.schedule(
  'check-payment-reminders',            -- Job name (unique identifier)
  '0 9 * * *',                          -- Schedule: Every day at 9:00 AM
  $$SELECT check_payment_reminders()$$  -- Function to execute
);

-- ================================================================
-- CRON JOB 3: Daily Overdue Invoice Processing
-- ================================================================
-- Schedule: Every day at 9:00 AM
-- Purpose: Process overdue invoices and calculate late fees
-- Function: process_overdue_invoices()
-- ================================================================

SELECT cron.schedule(
  'process-overdue-invoices',           -- Job name (unique identifier)
  '0 9 * * *',                         -- Schedule: Every day at 9:00 AM
  $$SELECT process_overdue_invoices()$$ -- Function to execute
);

-- ================================================================
-- VERIFICATION: View All Scheduled Jobs
-- ================================================================
-- Uncomment the following line to see all scheduled cron jobs:
-- SELECT * FROM cron.job ORDER BY jobname;

-- ================================================================
-- MANUAL TESTING COMMANDS
-- ================================================================
-- Use these commands to test the functions manually:
--
-- 1. Test monthly invoice generation:
--    SELECT * FROM run_monthly_invoice_generation();
--
-- 2. Test payment reminders:
--    SELECT * FROM check_payment_reminders();
--
-- 3. Test overdue invoice processing:
--    SELECT * FROM process_overdue_invoices();
--
-- ================================================================
-- SCHEDULE DETAILS SUMMARY
-- ================================================================
--
-- Job Name: monthly-invoice-generation
-- Schedule: 0 9 28 * * (28th of each month at 9:00 AM)
-- Function: run_monthly_invoice_generation()
-- Purpose: Creates invoices for next month (due on 1st)
--
-- Job Name: check-payment-reminders
-- Schedule: 0 9 * * * (Every day at 9:00 AM)
-- Function: check_payment_reminders()
-- Purpose: Sends payment reminders (4 stages: -3d, 0d, +3d, +10d)
--
-- Job Name: process-overdue-invoices
-- Schedule: 0 9 * * * (Every day at 9:00 AM)
-- Function: process_overdue_invoices()
-- Purpose: Calculates and applies late fees for overdue invoices
--
-- ================================================================
-- IMPORTANT NOTES
-- ================================================================
--
-- 1. Time Zone: All times are in UTC. Adjust if your server
--    uses a different time zone.
--
-- 2. Testing: You can manually run functions anytime using:
--    SELECT * FROM [function_name]();
--
-- 3. Monitoring: Check cron.job_run_details table to see job history:
--    SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
--
-- 4. Disabling: To temporarily disable a job:
--    SELECT cron.unschedule('job-name');
--
-- 5. Re-enabling: Re-run this migration to re-enable jobs
--
-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ AUTOMATIC CRON JOBS SETUP COMPLETE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📅 Scheduled Jobs:';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣ Monthly Invoice Generation';
  RAISE NOTICE '   Schedule: 28th of each month at 9:00 AM';
  RAISE NOTICE '   Function: run_monthly_invoice_generation()';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣ Daily Payment Reminders';
  RAISE NOTICE '   Schedule: Every day at 9:00 AM';
  RAISE NOTICE '   Function: check_payment_reminders()';
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣ Daily Overdue Invoice Processing';
  RAISE NOTICE '   Schedule: Every day at 9:00 AM';
  RAISE NOTICE '   Function: process_overdue_invoices()';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To verify jobs are scheduled:';
  RAISE NOTICE '   SELECT * FROM cron.job ORDER BY jobname;';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 To test manually:';
  RAISE NOTICE '   SELECT * FROM run_monthly_invoice_generation();';
  RAISE NOTICE '   SELECT * FROM check_payment_reminders();';
  RAISE NOTICE '   SELECT * FROM process_overdue_invoices();';
  RAISE NOTICE '';
  RAISE NOTICE '📊 To view job execution history:';
  RAISE NOTICE '   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
END $$;

