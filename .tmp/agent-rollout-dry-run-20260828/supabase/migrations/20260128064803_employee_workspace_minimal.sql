-- ============================================================================
-- Employee Workspace System - Minimal Migration
-- نظام مساحة عمل الموظفين - الحد الأدنى
-- ============================================================================

-- STEP 1: Add Assignment Columns to Contracts Table
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS assigned_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_contracts_assigned_to 
ON contracts(assigned_to_profile_id) 
WHERE assigned_to_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_assigned_at 
ON contracts(assigned_at DESC) 
WHERE assigned_at IS NOT NULL;

COMMENT ON COLUMN contracts.assigned_to_profile_id IS 'الموظف المسؤول عن متابعة هذا العقد';
COMMENT ON COLUMN contracts.assigned_at IS 'تاريخ تعيين العقد للموظف';
COMMENT ON COLUMN contracts.assigned_by_profile_id IS 'من قام بتعيين العقد';
COMMENT ON COLUMN contracts.assignment_notes IS 'ملاحظات حول التعيين';

-- STEP 2: Create followup_policies table
CREATE TABLE IF NOT EXISTS followup_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  policy_name_ar TEXT,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'overdue_payment', 'contract_expiring', 'new_violation', 'periodic', 'no_contact'
  )),
  days_before_or_after INT DEFAULT 0,
  frequency_days INT,
  followup_type TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  auto_assign BOOLEAN DEFAULT false,
  auto_create_task BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_followup_policies_company 
ON followup_policies(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_followup_policies_trigger 
ON followup_policies(trigger_type) WHERE is_active = true;

COMMENT ON TABLE followup_policies IS 'سياسات المتابعة الإلزامية';

-- STEP 3: Create employee_collection_targets table
CREATE TABLE IF NOT EXISTS employee_collection_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  target_collection_amount DECIMAL(15,2),
  target_collection_rate DECIMAL(5,2),
  target_followups_count INT,
  target_communications_count INT,
  target_contract_renewals INT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_employee_targets_employee 
ON employee_collection_targets(employee_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_employee_targets_period 
ON employee_collection_targets(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_employee_targets_active 
ON employee_collection_targets(employee_id, is_active) WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_targets_unique 
ON employee_collection_targets(employee_id, period_start, period_end) WHERE is_active = true;

COMMENT ON TABLE employee_collection_targets IS 'أهداف التحصيل والأداء للموظفين';

-- STEP 4: RLS Policies
ALTER TABLE followup_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_collection_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view policies for their company" ON followup_policies;
CREATE POLICY "Users can view policies for their company"
  ON followup_policies FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage policies for their company" ON followup_policies;
CREATE POLICY "Admins can manage policies for their company"
  ON followup_policies FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their own targets" ON employee_collection_targets;
CREATE POLICY "Users can view their own targets"
  ON employee_collection_targets FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage targets for their company" ON employee_collection_targets;
CREATE POLICY "Admins can manage targets for their company"
  ON employee_collection_targets FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );;
