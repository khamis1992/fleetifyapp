CREATE TABLE IF NOT EXISTS late_fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  contract_id UUID,
  rule_name VARCHAR(255) NOT NULL,
  rule_name_ar VARCHAR(255),
  description TEXT,
  description_ar TEXT,
  fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN ('late_fee', 'penalty', 'fine')),
  calculation_method VARCHAR(50) NOT NULL CHECK (calculation_method IN ('fixed', 'percentage', 'tiered', 'compound')),
  fixed_amount DECIMAL(10,2) CHECK (fixed_amount >= 0),
  percentage_rate DECIMAL(5,2) CHECK (percentage_rate >= 0 AND percentage_rate <= 100),
  max_amount DECIMAL(10,2) CHECK (max_amount >= 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  grace_period_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),
  max_late_days INTEGER CHECK (max_late_days >= 0),
  escalate_after_days INTEGER CHECK (escalate_after_days >= 0),
  escalation_multiplier DECIMAL(3,2) CHECK (escalation_multiplier >= 1),
  escalation_cap INTEGER CHECK (escalation_cap >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE,
  effective_to TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT 'late_fee_rules table created' as status;;
