-- ============================================================================
-- Employee Workspace System - Complete Migration
-- نظام مساحة عمل الموظفين - Migration شامل
-- ============================================================================
-- Created: 2026-01-28
-- Description: Complete system for employee contract management and performance tracking
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Assignment Columns to Contracts Table
-- إضافة أعمدة التعيين على جدول العقود
-- ============================================================================

-- Add columns for contract assignment
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS assigned_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_assigned_to 
ON contracts(assigned_to_profile_id) 
WHERE assigned_to_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_assigned_at 
ON contracts(assigned_at DESC) 
WHERE assigned_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN contracts.assigned_to_profile_id IS 'الموظف المسؤول عن متابعة هذا العقد';
COMMENT ON COLUMN contracts.assigned_at IS 'تاريخ تعيين العقد للموظف';
COMMENT ON COLUMN contracts.assigned_by_profile_id IS 'من قام بتعيين العقد';
COMMENT ON COLUMN contracts.assignment_notes IS 'ملاحظات حول التعيين';

-- ============================================================================
-- STEP 2: Add contract_id to customer_communications
-- إضافة معرف العقد على جدول التواصل مع العملاء
-- ============================================================================

ALTER TABLE customer_communications 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_customer_communications_contract 
ON customer_communications(contract_id) 
WHERE contract_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN customer_communications.contract_id IS 'العقد المرتبط بهذا التواصل (اختياري)';

-- ============================================================================
-- STEP 3: Expand followup_type options in scheduled_followups
-- توسيع أنواع المتابعات
-- ============================================================================

-- Drop old constraint
ALTER TABLE scheduled_followups 
DROP CONSTRAINT IF EXISTS scheduled_followups_followup_type_check;

-- Add new constraint with expanded types
ALTER TABLE scheduled_followups 
ADD CONSTRAINT scheduled_followups_followup_type_check 
CHECK (followup_type IN (
  'call', 
  'visit', 
  'email', 
  'whatsapp', 
  'meeting',
  'payment_collection',    -- تحصيل دفعة
  'violation_check',       -- فحص مخالفات
  'contract_renewal',      -- تجديد عقد
  'document_collection',   -- تحصيل مستندات
  'customer_satisfaction'  -- استطلاع رضا العميل
));

-- Add delay_reason column
ALTER TABLE scheduled_followups 
ADD COLUMN IF NOT EXISTS delay_reason TEXT CHECK (delay_reason IN (
  'customer_unavailable',   -- العميل غير متاح
  'customer_promised',      -- العميل وعد بالسداد
  'dispute',                -- نزاع
  'financial_difficulty',   -- صعوبة مالية
  'technical_issue',        -- مشكلة تقنية
  'other'
));

COMMENT ON COLUMN scheduled_followups.delay_reason IS 'سبب تأخير أو إعادة جدولة المتابعة';

-- ============================================================================
-- STEP 4: Create followup_policies table
-- إنشاء جدول سياسات المتابعة الإلزامية
-- ============================================================================

CREATE TABLE IF NOT EXISTS followup_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Policy details
  policy_name TEXT NOT NULL,
  policy_name_ar TEXT,
  description TEXT,
  
  -- Trigger conditions
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'overdue_payment',      -- عند تأخر السداد
    'contract_expiring',    -- قبل انتهاء العقد
    'new_violation',        -- عند وجود مخالفة جديدة
    'periodic',             -- دوري (كل X يوم)
    'no_contact'            -- عدم التواصل لفترة معينة
  )),
  
  -- Settings
  days_before_or_after INT DEFAULT 0,      -- مثال: 3 أيام قبل/بعد
  frequency_days INT,                      -- للدوري: كل كم يوم
  followup_type TEXT,                      -- نوع المتابعة المطلوبة
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  auto_assign BOOLEAN DEFAULT false,       -- تعيين تلقائي للموظف المسؤول
  auto_create_task BOOLEAN DEFAULT true,   -- إنشاء مهمة تلقائياً
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_followup_policies_company 
ON followup_policies(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_followup_policies_trigger 
ON followup_policies(trigger_type) 
WHERE is_active = true;

-- Comments
COMMENT ON TABLE followup_policies IS 'سياسات المتابعة الإلزامية - تحدد متى وكيف يجب متابعة العملاء';
COMMENT ON COLUMN followup_policies.trigger_type IS 'نوع الحدث الذي يطلق المتابعة';
COMMENT ON COLUMN followup_policies.auto_assign IS 'تعيين المهمة تلقائياً للموظف المسؤول عن العقد';

-- ============================================================================
-- STEP 5: Create employee_collection_targets table
-- إنشاء جدول أهداف التحصيل للموظفين
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_collection_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  
  -- Targets
  target_collection_amount DECIMAL(15,2),     -- هدف التحصيل بالريال
  target_collection_rate DECIMAL(5,2),        -- هدف نسبة التحصيل %
  target_followups_count INT,                 -- عدد المتابعات المطلوبة
  target_communications_count INT,            -- عدد التواصلات المطلوبة
  target_contract_renewals INT,               -- عدد التجديدات المستهدفة
  
  -- Notes
  notes TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_targets_employee 
ON employee_collection_targets(employee_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_employee_targets_period 
ON employee_collection_targets(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_employee_targets_active 
ON employee_collection_targets(employee_id, is_active) 
WHERE is_active = true;

-- Unique constraint: one active target per employee per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_targets_unique 
ON employee_collection_targets(employee_id, period_start, period_end) 
WHERE is_active = true;

-- Comments
COMMENT ON TABLE employee_collection_targets IS 'أهداف التحصيل والأداء للموظفين';
COMMENT ON COLUMN employee_collection_targets.target_collection_rate IS 'نسبة التحصيل المستهدفة (مثال: 85%)';

-- ============================================================================
-- STEP 6: Create employee_performance_view
-- إنشاء View لحساب أداء الموظفين ديناميكياً
-- ============================================================================

CREATE OR REPLACE VIEW employee_performance_view AS
SELECT 
  p.id AS employee_id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.company_id,
  
  -- Contract Statistics
  COUNT(DISTINCT c.id) AS assigned_contracts_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') AS active_contracts_count,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.status = 'active' 
    AND (c.total_paid < c.contract_amount OR c.balance_due > 0)
  ) AS contracts_with_balance_count,
  
  -- Collection Statistics (Last 30 days)
  COALESCE(SUM(c.contract_amount), 0) AS total_contract_value,
  COALESCE(SUM(c.total_paid), 0) AS total_collected,
  COALESCE(SUM(c.balance_due), 0) AS total_balance_due,
  
  -- Collection Rate
  CASE 
    WHEN SUM(c.contract_amount) > 0 THEN 
      ROUND((SUM(c.total_paid) / NULLIF(SUM(c.contract_amount), 0) * 100)::numeric, 2)
    ELSE 0 
  END AS collection_rate,
  
  -- Followup Statistics (Last 30 days)
  COUNT(DISTINCT sf.id) AS total_followups,
  COUNT(DISTINCT sf.id) FILTER (WHERE sf.status = 'completed') AS completed_followups,
  COUNT(DISTINCT sf.id) FILTER (WHERE sf.status = 'pending') AS pending_followups,
  COUNT(DISTINCT sf.id) FILTER (
    WHERE sf.status = 'pending' AND sf.scheduled_date < CURRENT_DATE
  ) AS overdue_followups,
  
  -- Followup Completion Rate
  CASE 
    WHEN COUNT(DISTINCT sf.id) > 0 THEN 
      ROUND((COUNT(DISTINCT sf.id) FILTER (WHERE sf.status = 'completed')::numeric / 
             NULLIF(COUNT(DISTINCT sf.id), 0) * 100), 2)
    ELSE 0 
  END AS followup_completion_rate,
  
  -- Communication Statistics (Last 30 days)
  COUNT(DISTINCT cc.id) AS total_communications,
  COUNT(DISTINCT cc.id) FILTER (WHERE cc.communication_type = 'phone') AS phone_calls_count,
  COUNT(DISTINCT cc.id) FILTER (WHERE cc.communication_type = 'message') AS messages_count,
  
  -- Coverage Rate (Contracts contacted in last 14 days)
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 THEN 
      ROUND((COUNT(DISTINCT cc.customer_id) FILTER (
        WHERE cc.communication_date >= CURRENT_DATE - INTERVAL '14 days'
      )::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 100), 2)
    ELSE 0 
  END AS contact_coverage_rate,
  
  -- Performance Score (0-100)
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 THEN 
      ROUND((
        -- Collection Rate (35%)
        (COALESCE(SUM(c.total_paid) / NULLIF(SUM(c.contract_amount), 0) * 100, 0) * 0.35) +
        -- Followup Completion (25%)
        (COALESCE(COUNT(DISTINCT sf.id) FILTER (WHERE sf.status = 'completed')::numeric / 
                  NULLIF(COUNT(DISTINCT sf.id), 0) * 100, 0) * 0.25) +
        -- Contact Coverage (20%)
        (COALESCE(COUNT(DISTINCT cc.customer_id) FILTER (
          WHERE cc.communication_date >= CURRENT_DATE - INTERVAL '14 days'
        )::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 0) * 0.20) +
        -- Activity Level (20%)
        (LEAST(COUNT(DISTINCT cc.id)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 10, 100) * 0.20)
      )::numeric, 2)
    ELSE 0 
  END AS performance_score,
  
  -- Last Activity
  MAX(cc.communication_date) AS last_communication_date,
  MAX(sf.scheduled_date) AS last_followup_date

FROM profiles p
LEFT JOIN contracts c ON c.assigned_to_profile_id = p.id AND c.status != 'cancelled'
LEFT JOIN scheduled_followups sf ON sf.assigned_to = p.id 
  AND sf.created_at >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN customer_communications cc ON cc.employee_id = p.user_id 
  AND cc.communication_date >= CURRENT_DATE - INTERVAL '30 days'

GROUP BY p.id, p.user_id, p.first_name, p.last_name, p.company_id;

-- Comments
COMMENT ON VIEW employee_performance_view IS 'عرض ديناميكي لأداء الموظفين - يتم حسابه في الوقت الفعلي';

-- ============================================================================
-- STEP 7: Create RLS Policies
-- إنشاء سياسات الأمان
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE followup_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_collection_targets ENABLE ROW LEVEL SECURITY;

-- Policies for followup_policies
CREATE POLICY "Users can view policies for their company"
  ON followup_policies FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage policies for their company"
  ON followup_policies FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Policies for employee_collection_targets
CREATE POLICY "Users can view their own targets"
  ON employee_collection_targets FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can manage targets for their company"
  ON employee_collection_targets FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- STEP 8: Create Triggers for updated_at
-- إنشاء Triggers لتحديث updated_at تلقائياً
-- ============================================================================

-- Trigger for followup_policies
CREATE TRIGGER update_followup_policies_updated_at
  BEFORE UPDATE ON followup_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for employee_collection_targets
CREATE TRIGGER update_employee_collection_targets_updated_at
  BEFORE UPDATE ON employee_collection_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 9: Create Helper Functions
-- إنشاء وظائف مساعدة
-- ============================================================================

-- Function to auto-assign contracts based on workload
CREATE OR REPLACE FUNCTION auto_assign_contract_to_employee(
  p_contract_id UUID,
  p_company_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  -- Find employee with least assigned contracts
  SELECT p.id INTO v_employee_id
  FROM profiles p
  LEFT JOIN contracts c ON c.assigned_to_profile_id = p.id
  WHERE p.company_id = p_company_id
    AND p.role IN ('employee', 'collection_agent')
  GROUP BY p.id
  ORDER BY COUNT(c.id) ASC
  LIMIT 1;
  
  -- Assign contract
  IF v_employee_id IS NOT NULL THEN
    UPDATE contracts 
    SET 
      assigned_to_profile_id = v_employee_id,
      assigned_at = NOW()
    WHERE id = p_contract_id;
  END IF;
  
  RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_assign_contract_to_employee IS 'توزيع تلقائي للعقود على الموظفين بناءً على عبء العمل';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
