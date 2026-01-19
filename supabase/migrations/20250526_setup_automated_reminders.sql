-- ============================================
-- Setup Automated WhatsApp Reminders System
-- ============================================
-- Schedule:
-- - Day 28: Pre-due reminder (3 days before)
-- - Day 2: Late payment + penalty notice
-- - Day 5: Final warning
-- - Day 10: Legal action notice
-- ============================================

-- 1. Create reminder_history table if not exists
CREATE TABLE IF NOT EXISTS reminder_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id),
    customer_id UUID REFERENCES customers(id),
    reminder_type TEXT NOT NULL,
    phone_number TEXT,
    message_sent TEXT,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reminder_history_contract ON reminder_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_sent_at ON reminder_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_history_reminder_type ON reminder_history(reminder_type);

-- 2. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Create Cron Jobs for automated reminders
-- Note: These will call the Edge Function at specified times

-- Day 28 at 9:00 AM Qatar time (UTC+3 = 6:00 AM UTC)
SELECT cron.schedule(
    'reminder-pre-due-day28',
    '0 6 28 * *',
    $$
    SELECT net.http_post(
        url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object('reminderType', 'pre_due')
    );
    $$
);

-- Day 2 at 9:00 AM Qatar time
SELECT cron.schedule(
    'reminder-overdue-day2',
    '0 6 2 * *',
    $$
    SELECT net.http_post(
        url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object('reminderType', 'overdue_day2', 'daysLate', 2)
    );
    $$
);

-- Day 5 at 9:00 AM Qatar time
SELECT cron.schedule(
    'reminder-final-warning-day5',
    '0 6 5 * *',
    $$
    SELECT net.http_post(
        url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object('reminderType', 'final_warning', 'daysLate', 5)
    );
    $$
);

-- Day 10 at 9:00 AM Qatar time
SELECT cron.schedule(
    'reminder-legal-action-day10',
    '0 6 10 * *',
    $$
    SELECT net.http_post(
        url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object('reminderType', 'legal_action', 'daysLate', 10)
    );
    $$
);

-- 4. Create view for reminder statistics
CREATE OR REPLACE VIEW reminder_statistics AS
SELECT 
    reminder_type,
    DATE(sent_at) as date,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE success = true) as successful,
    COUNT(*) FILTER (WHERE success = false) as failed,
    ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0), 2) as success_rate
FROM reminder_history
GROUP BY reminder_type, DATE(sent_at)
ORDER BY date DESC, reminder_type;

-- 5. Grant permissions
GRANT SELECT ON reminder_history TO authenticated;
GRANT SELECT ON reminder_statistics TO authenticated;

-- 6. Add RLS policies
ALTER TABLE reminder_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company reminders" ON reminder_history
    FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers 
            WHERE company_id = (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- ============================================
-- Summary of Cron Schedule:
-- ============================================
-- | Day | Time (Qatar) | Reminder Type      |
-- |-----|--------------|-------------------|
-- | 28  | 9:00 AM      | Pre-due reminder  |
-- | 2   | 9:00 AM      | Overdue + penalty |
-- | 5   | 9:00 AM      | Final warning     |
-- | 10  | 9:00 AM      | Legal action      |
-- ============================================

COMMENT ON TABLE reminder_history IS 'Stores history of all WhatsApp reminders sent to customers';

