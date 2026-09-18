CREATE TABLE IF NOT EXISTS late_fee_rule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL,
  company_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated')),
  previous_values JSONB,
  new_values JSONB,
  changed_by UUID,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_late_fee_history_rule ON late_fee_rule_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_history_company ON late_fee_rule_history(company_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_history_date ON late_fee_rule_history(changed_at);

SELECT 'late_fee_rule_history table created' as status;;
