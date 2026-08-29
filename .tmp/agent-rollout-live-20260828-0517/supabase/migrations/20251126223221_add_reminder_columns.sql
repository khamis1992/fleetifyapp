-- Add missing columns to reminder_history
ALTER TABLE reminder_history 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id),
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS reminder_type TEXT,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reminder_history_contract ON reminder_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_sent_at ON reminder_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_history_reminder_type ON reminder_history(reminder_type);

-- Create view for reminder statistics
CREATE OR REPLACE VIEW reminder_statistics AS
SELECT 
    reminder_type,
    DATE(sent_at) as date,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE success = true) as successful,
    COUNT(*) FILTER (WHERE success = false) as failed,
    ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0), 2) as success_rate
FROM reminder_history
WHERE reminder_type IS NOT NULL
GROUP BY reminder_type, DATE(sent_at)
ORDER BY date DESC, reminder_type;;
