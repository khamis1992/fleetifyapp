-- ================================================================
-- Migration: Data Quality Tables
-- Created: 2026-01-10
-- Description: Add tables for data quality tracking and monitoring
-- Impact: HIGH - Enables data quality monitoring and alerting
-- ================================================================

-- ============================================================================
-- Step 1: Create payment_notifications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'receipt', 'payment_failed', 'overdue_reminder', etc
  channel VARCHAR(50) NOT NULL, -- 'whatsapp', 'sms', 'email', 'in_app'
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  recipient VARCHAR(255), -- phone number, email, etc
  message TEXT,
  metadata JSONB, -- Additional context
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_notifications_payment 
ON payment_notifications(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_company 
ON payment_notifications(company_id);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_type 
ON payment_notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_status 
ON payment_notifications(status);

-- Comment
COMMENT ON TABLE payment_notifications IS
'Tracks all payment-related notifications (receipts, reminders, alerts). Enables notification history and status tracking.';

COMMENT ON COLUMN payment_notifications.notification_type IS
'Type of notification: receipt, payment_failed, overdue_reminder, payment_matched, etc';

COMMENT ON COLUMN payment_notifications.channel IS
'Communication channel used: whatsapp, sms, email, in_app';

COMMENT ON COLUMN payment_notifications.status IS
'Current status of notification: sent, failed, pending, delivered';

-- ============================================================================
-- Step 2: Create staff_notifications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification JSONB NOT NULL, -- { type, title, message, priority, data }
  status VARCHAR(20) NOT NULL DEFAULT 'unread', -- 'unread', 'read', 'dismissed'
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_staff_notifications_user 
ON staff_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_status 
ON staff_notifications(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_company 
ON staff_notifications(company_id);

-- Comment
COMMENT ON TABLE staff_notifications IS
'Internal notifications for staff members. Supports in-app real-time notifications and email alerts.';

COMMENT ON COLUMN staff_notifications.notification IS
'JSON object containing notification details: { type, title, message, priority, data }';

COMMENT ON COLUMN staff_notifications.status IS
'Read status: unread, read, dismissed';

COMMENT ON COLUMN staff_notifications.priority IS
'Notification urgency: low, medium, high, urgent';

-- ============================================================================
-- Step 3: Create notification_channels table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL UNIQUE, -- 'whatsapp', 'sms', 'email'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB, -- Channel-specific configuration (API keys, endpoints, etc)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique constraint per company and channel
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_channels_company_channel 
ON notification_channels(company_id, channel_type)
WHERE is_active = true;

-- Comment
COMMENT ON TABLE notification_channels IS
'Configuration for notification channels (WhatsApp, SMS, Email). Per-company settings for channel availability and credentials.';

COMMENT ON COLUMN notification_channels.channel_type IS
'Channel type: whatsapp, sms, email';

COMMENT ON COLUMN notification_channels.is_enabled IS
'Whether this channel is enabled for the company';

COMMENT ON COLUMN notification_channels.config IS
'Channel-specific configuration: API keys, endpoints, settings, etc';

-- ============================================================================
-- Step 4: Create failed_transactions table (for retry queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS failed_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'payment_creation', 'invoice_generation', etc
  steps TEXT[], -- Array of step names
  failed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  error TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_failed_transactions_payment 
ON failed_transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_failed_transactions_retry 
ON failed_transactions(next_retry_at)
WHERE next_retry_at IS NOT NULL;

-- Comment
COMMENT ON TABLE failed_transactions IS
'Tracks failed transactions for retry queue. Enables automatic retry with exponential backoff and monitoring of failure patterns.';

COMMENT ON COLUMN failed_transactions.transaction_id IS
'Unique identifier for the transaction (not necessarily a UUID)';

COMMENT ON COLUMN failed_transactions.retry_count IS
'Number of retry attempts made for this transaction';

COMMENT ON COLUMN failed_transactions.next_retry_at IS
'Timestamp for next retry attempt. NULL if no more retries should be made';

-- ============================================================================
-- Step 5: Create data_quality_reports table
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  metrics JSONB NOT NULL, -- Array of metric objects
  issues JSONB NOT NULL, -- Array of issue objects
  recommendations TEXT[] NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_data_quality_reports_company 
ON data_quality_reports(company_id, calculated_at DESC);

-- Comment
COMMENT ON TABLE data_quality_reports IS
'Stores data quality assessment results. Enables tracking quality over time and identifying data issues.';

COMMENT ON COLUMN data_quality_reports.overall_score IS
'Overall quality score from 0-100, where 100 is perfect and 0 is poor';

COMMENT ON COLUMN data_quality_reports.metrics IS
'Array of metric objects with: tableName, metricName, value, threshold, status, lastCalculated';

COMMENT ON COLUMN data_quality_reports.issues IS
'Array of issue objects with: type, severity, tableName, description, affectedRecords, createdAt';

COMMENT ON COLUMN data_quality_reports.recommendations IS
'List of actionable recommendations to improve data quality';

-- ============================================================================
-- Step 6: Enable Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_notifications
CREATE POLICY "Users can view payment_notifications for their company"
ON payment_notifications FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert payment_notifications for their company"
ON payment_notifications FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update payment_notifications for their company"
ON payment_notifications FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for staff_notifications
CREATE POLICY "Users can view staff_notifications for their company"
ON staff_notifications FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert staff_notifications for their company"
ON staff_notifications FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update staff_notifications for their company"
ON staff_notifications FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for notification_channels
CREATE POLICY "Users can view notification_channels for their company"
ON notification_channels FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert notification_channels for their company"
ON notification_channels FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update notification_channels for their company"
ON notification_channels FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for failed_transactions
CREATE POLICY "Users can view failed_transactions for their company"
ON failed_transactions FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert failed_transactions for their company"
ON failed_transactions FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update failed_transactions for their company"
ON failed_transactions FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for data_quality_reports
CREATE POLICY "Users can view data_quality_reports for their company"
ON data_quality_reports FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert data_quality_reports for their company"
ON data_quality_reports FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- Step 7: Add columns for tracking payment processing
-- ============================================================================

-- Add processing_started_at and processing_completed_at if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments'
      AND column_name = 'processing_started_at'
  ) THEN
    ALTER TABLE payments
    ADD COLUMN processing_started_at TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE 'Added column: processing_started_at';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments'
      AND column_name = 'processing_completed_at'
  ) THEN
    ALTER TABLE payments
    ADD COLUMN processing_completed_at TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE 'Added column: processing_completed_at';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments'
      AND column_name = 'processing_failed_at'
  ) THEN
    ALTER TABLE payments
    ADD COLUMN processing_failed_at TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE 'Added column: processing_failed_at';
  END IF;
END $$;

-- Comments on new columns
COMMENT ON COLUMN payments.processing_started_at IS
'Timestamp when payment processing started. Used to calculate processing duration.';

COMMENT ON COLUMN payments.processing_completed_at IS
'Timestamp when payment processing completed successfully. Used to calculate processing duration.';

COMMENT ON COLUMN payments.processing_failed_at IS
'Timestamp when payment processing failed. Used for failure analysis and retry scheduling.';

-- ============================================================================
-- Step 8: Create function to clean up old failed transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_failed_transactions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM failed_transactions
    WHERE failed_at < NOW() - INTERVAL '30 days'
      AND (next_retry_at IS NULL OR next_retry_at < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % old failed transactions', v_deleted_count;
    
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_failed_transactions IS
'Deletes failed transactions older than 30 days (or 7 days after their last retry attempt). Should be scheduled daily.';

-- ============================================================================
-- Step 9: Create function to calculate data quality
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_payment_data_quality(company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_total_payments INTEGER;
    v_unlinked_payments INTEGER;
    v_failed_payments INTEGER;
    v_quality_score NUMERIC;
    v_unlinked_percentage NUMERIC;
    v_failed_percentage NUMERIC;
    v_metrics JSONB;
BEGIN
    -- Count total payments
    SELECT COUNT(*) INTO v_total_payments
    FROM payments
    WHERE company_id = company_id;
    
    -- Count unlinked payments
    SELECT COUNT(*) INTO v_unlinked_payments
    FROM payments
    WHERE company_id = company_id
      AND contract_id IS NULL
      AND invoice_id IS NULL;
    
    -- Count failed payments
    SELECT COUNT(*) INTO v_failed_payments
    FROM payments
    WHERE company_id = company_id
      AND payment_status = 'failed';
    
    -- Calculate percentages
    v_unlinked_percentage := CASE 
        WHEN v_total_payments > 0 THEN (v_unlinked_payments::NUMERIC / v_total_payments::NUMERIC) * 100 
        ELSE 0 
    END;
    
    v_failed_percentage := CASE 
        WHEN v_total_payments > 0 THEN (v_failed_payments::NUMERIC / v_total_payments::NUMERIC) * 100 
        ELSE 0 
    END;
    
    -- Calculate quality score (0-100)
    v_quality_score := 
        100 - 
        (v_unlinked_percentage * 0.5) - -- Deduct 0.5 points per % of unlinked
        (v_failed_percentage * 1.0);     -- Deduct 1.0 point per % of failed
    
    v_quality_score := GREATEST(0, LEAST(100, v_quality_score));
    
    -- Build metrics JSON
    v_metrics := jsonb_build_object(
        'metrics', jsonb_build_array(
            jsonb_build_object(
                'tableName', 'payments',
                'metricName', 'total_payments',
                'value', v_total_payments,
                'status', 'good'
            ),
            jsonb_build_object(
                'tableName', 'payments',
                'metricName', 'unlinked_payments_percentage',
                'value', ROUND(v_unlinked_percentage, 2),
                'threshold', 10,
                'status', CASE WHEN v_unlinked_percentage <= 10 THEN 'good' 
                            WHEN v_unlinked_percentage <= 20 THEN 'warning' 
                            ELSE 'poor' END
            ),
            jsonb_build_object(
                'tableName', 'payments',
                'metricName', 'failed_payments_percentage',
                'value', ROUND(v_failed_percentage, 2),
                'threshold', 5,
                'status', CASE WHEN v_failed_percentage <= 5 THEN 'good' 
                            WHEN v_failed_percentage <= 10 THEN 'warning' 
                            ELSE 'poor' END
            )
        )
    );
    
    RETURN v_metrics;
END;
$$;

COMMENT ON FUNCTION calculate_payment_data_quality IS
'Calculates data quality metrics for payments. Returns overall score and detailed metrics.';

-- ============================================================================
-- Step 10: Create trigger for payment status updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_invoice_on_payment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- When payment is completed, update related invoice status
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
        IF NEW.invoice_id IS NOT NULL THEN
            UPDATE invoices
            SET 
                paid_amount = COALESCE(paid_amount, 0) + NEW.amount,
                balance_due = total_amount - (COALESCE(paid_amount, 0) + NEW.amount),
                payment_status = CASE 
                    WHEN total_amount - (COALESCE(paid_amount, 0) + NEW.amount) <= 0.01 THEN 'paid'
                    WHEN (COALESCE(paid_amount, 0) + NEW.amount) > 0 THEN 'partial'
                    ELSE payment_status
                END
            WHERE id = NEW.invoice_id;
        END IF;
    END IF;
    
    -- When payment is completed, update related contract total_paid
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
        IF NEW.contract_id IS NOT NULL THEN
            UPDATE contracts
            SET 
                total_paid = COALESCE(total_paid, 0) + NEW.amount,
                remaining_balance = contract_amount - (COALESCE(total_paid, 0) + NEW.amount)
            WHERE id = NEW.contract_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_status_update_trigger ON payments;
CREATE TRIGGER payment_status_update_trigger
    AFTER UPDATE OF payment_status ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_on_payment_completion();

COMMENT ON TRIGGER payment_status_update_trigger ON payments IS
'Automatically updates invoice and contract statuses when payment status changes to completed.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables exist
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('payment_notifications', 'staff_notifications', 'notification_channels', 'failed_transactions', 'data_quality_reports');

-- Verify RLS policies exist
-- SELECT policyname, tablename 
-- FROM pg_policies 
-- WHERE tablename IN ('payment_notifications', 'staff_notifications', 'notification_channels', 'failed_transactions', 'data_quality_reports');

-- Test cleanup function
-- SELECT cleanup_old_failed_transactions();

-- Test quality calculation function
-- SELECT calculate_payment_data_quality('24bc0b21-4e2d-4413-9842-31719a3669f4');
