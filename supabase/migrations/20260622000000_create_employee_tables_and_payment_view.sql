-- ============================================================================
-- Employee Workspace Tables + Payment Timeline View
-- جداول مساحة عمل الموظفين + عرض الجدول الزمني للمدفوعات
-- ============================================================================
-- Created: 2026-06-22
-- Description: Create missing tables for employee workspace and payment tracking
-- ============================================================================

-- ============================================================================
-- STEP 1: Create employee_tasks table
-- إنشاء جدول مهام الموظفين
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'followup',           -- متابعة
    'payment_collection', -- تحصيل دفعة
    'document_review',    -- مراجعة مستندات
    'contract_renewal',   -- تجديد عقد
    'customer_visit',     -- زيارة عميل
    'violation_check',    -- فحص مخالفات
    'report_preparation', -- إعداد تقرير
    'other'
  )),

  -- Assignment
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Related entities
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  followup_id UUID REFERENCES scheduled_followups(id) ON DELETE SET NULL,

  -- Scheduling
  due_date TIMESTAMPTZ,
  scheduled_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Priority & Status
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- قيد الانتظار
    'in_progress',  -- قيد التنفيذ
    'completed',    -- مكتملة
    'cancelled',    -- ملغاة
    'delayed'       -- متأخرة
  )),

  -- Delay tracking
  delay_reason TEXT CHECK (delay_reason IN (
    'customer_unavailable',   -- العميل غير متاح
    'customer_promised',      -- العميل وعد بالسداد
    'dispute',                -- نزاع
    'financial_difficulty',   -- صعوبة مالية
    'technical_issue',        -- مشكلة تقنية
    'other'
  )),
  delay_notes TEXT,

  -- Results
  result_notes TEXT,
  collection_amount DECIMAL(15,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_tasks_company
  ON employee_tasks(company_id);

CREATE INDEX IF NOT EXISTS idx_employee_tasks_assigned_to
  ON employee_tasks(assigned_to, status)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_tasks_due_date
  ON employee_tasks(due_date, status)
  WHERE status IN ('pending', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_employee_tasks_contract
  ON employee_tasks(contract_id)
  WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_tasks_customer
  ON employee_tasks(customer_id)
  WHERE customer_id IS NOT NULL;

-- Comments
COMMENT ON TABLE employee_tasks IS 'مهام الموظفين - تتبع المهام اليومية والأسبوعية';
COMMENT ON COLUMN employee_tasks.task_type IS 'نوع المهمة';
COMMENT ON COLUMN employee_tasks.collection_amount IS 'المبلغ المحصل من المهمة (إن وجد)';

-- ============================================================================
-- STEP 2: Create call_logs table
-- إنشاء جدول سجل المكالمات
-- ============================================================================

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Call details
  call_type TEXT NOT NULL CHECK (call_type IN ('incoming', 'outgoing', 'missed', 'voicemail')),
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  contact_name_ar TEXT,

  -- Related entities
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Call timing
  call_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INT,           -- مدة المكالمة بالثواني
  answered BOOLEAN DEFAULT true,

  -- Call purpose & outcome
  call_purpose TEXT CHECK (call_purpose IN (
    'payment_reminder',     -- تذكير بالدفع
    'payment_followup',     -- متابعة الدفع
    'contract_renewal',     -- تجديد عقد
    'customer_service',     -- خدمة العملاء
    'violation_notice',     -- إشعار مخالفة
    'document_request',     -- طلب مستندات
    'general_inquiry',      -- استفسار عام
    'other'
  )),
  call_outcome TEXT CHECK (call_outcome IN (
    'payment_promised',     -- وعد بالدفع
    'payment_made',         -- تم الدفع
    'will_call_back',       -- سيعاود الاتصال
    'unavailable',          -- غير متاح
    'wrong_number',         -- رقم خاطئ
    'dispute_raised',       -- أثار نزاع
    'resolved',             -- تم الحل
    'no_answer',            -- لا إجابة
    'other'
  )),

  -- Notes
  notes TEXT,
  followup_required BOOLEAN DEFAULT false,
  followup_date TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_company
  ON call_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_customer
  ON call_logs(customer_id, call_date DESC)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_employee
  ON call_logs(employee_id, call_date DESC)
  WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_date
  ON call_logs(call_date DESC);

CREATE INDEX IF NOT EXISTS idx_call_logs_followup
  ON call_logs(followup_date)
  WHERE followup_required = true AND followup_date IS NOT NULL;

-- Comments
COMMENT ON TABLE call_logs IS 'سجل المكالمات الهاتفية مع العملاء';
COMMENT ON COLUMN call_logs.duration_seconds IS 'مدة المكالمة بالثواني';
COMMENT ON COLUMN call_logs.call_purpose IS 'الغرض من المكالمة';
COMMENT ON COLUMN call_logs.call_outcome IS 'نتيجة المكالمة';

-- ============================================================================
-- STEP 3: Create contract_notes table
-- إنشاء جدول ملاحظات العقود
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Note details
  note_type TEXT NOT NULL CHECK (note_type IN (
    'general',              -- ملاحظة عامة
    'payment_issue',        -- مشكلة دفع
    'customer_request',     -- طلب العميل
    'legal_note',           -- ملاحظة قانونية
    'vehicle_issue',        -- مشكلة مركبة
    'renewal_discussion',   -- مناقشة التجديد
    'internal_memo',        -- مذكرة داخلية
    'other'
  )),

  title TEXT,
  title_ar TEXT,
  content TEXT NOT NULL,

  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_pinned BOOLEAN DEFAULT false,   -- تثبيت الملاحظة
  is_resolved BOOLEAN DEFAULT false, -- تم حل الموضوع

  -- Author
  created_by UUID REFERENCES profiles(id),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_notes_contract
  ON contract_notes(contract_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_notes_company
  ON contract_notes(company_id);

CREATE INDEX IF NOT EXISTS idx_contract_notes_type
  ON contract_notes(contract_id, note_type)
  WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_contract_notes_pinned
  ON contract_notes(contract_id, is_pinned)
  WHERE is_pinned = true;

-- Comments
COMMENT ON TABLE contract_notes IS 'ملاحظات العقود - تتبع الملاحظات والمراسلات الداخلية';
COMMENT ON COLUMN contract_notes.is_pinned IS 'تثبيت الملاحظة في أعلى القائمة';
COMMENT ON COLUMN contract_notes.is_resolved IS 'هل تم حل الموضوع المرتبط بالملاحظة';

-- ============================================================================
-- STEP 4: Create employee_performance table (materialized summary)
-- إنشاء جدول أداء الموظفين (ملخص مادي)
-- ============================================================================
-- Note: employee_performance_view already exists as a dynamic view.
-- This table stores periodic snapshots for historical tracking and reporting.

CREATE TABLE IF NOT EXISTS employee_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Snapshot period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),

  -- Contract Statistics
  assigned_contracts_count INT DEFAULT 0,
  active_contracts_count INT DEFAULT 0,
  contracts_with_balance_count INT DEFAULT 0,

  -- Collection Statistics
  total_contract_value DECIMAL(15,2) DEFAULT 0,
  total_collected DECIMAL(15,2) DEFAULT 0,
  total_balance_due DECIMAL(15,2) DEFAULT 0,
  collection_rate DECIMAL(5,2) DEFAULT 0,       -- نسبة التحصيل %

  -- Followup Statistics
  total_followups INT DEFAULT 0,
  completed_followups INT DEFAULT 0,
  pending_followups INT DEFAULT 0,
  overdue_followups INT DEFAULT 0,
  followup_completion_rate DECIMAL(5,2) DEFAULT 0,

  -- Communication Statistics
  total_communications INT DEFAULT 0,
  phone_calls_count INT DEFAULT 0,
  messages_count INT DEFAULT 0,
  contact_coverage_rate DECIMAL(5,2) DEFAULT 0,

  -- Performance Score (0-100)
  performance_score DECIMAL(5,2) DEFAULT 0,

  -- Comparison with targets
  target_collection_amount DECIMAL(15,2),
  target_achievement_rate DECIMAL(5,2),          -- نسبة تحقيق الهدف %

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_performance_employee
  ON employee_performance(employee_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_employee_performance_period
  ON employee_performance(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_employee_performance_score
  ON employee_performance(employee_id, performance_score DESC);

-- Unique constraint: one snapshot per employee per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_performance_unique
  ON employee_performance(employee_id, period_start, period_end);

-- Comments
COMMENT ON TABLE employee_performance IS 'أداء الموظفين - لقطات دورية للأداء للمقارنة التاريخية';
COMMENT ON COLUMN employee_performance.performance_score IS 'درجة الأداء من 0 إلى 100';
COMMENT ON COLUMN employee_performance.target_achievement_rate IS 'نسبة تحقيق الهدف %';

-- ============================================================================
-- STEP 5: Create invoice_payment_timeline view
-- إنشاء عرض الجدول الزمني لمدفوعات الفواتير
-- ============================================================================
-- Note: payment_timeline_invoices view already exists (invoice-level).
-- This view provides contract-level payment timeline with monthly breakdown.

CREATE OR REPLACE VIEW invoice_payment_timeline AS
SELECT
  c.id AS contract_id,
  c.contract_number,
  c.company_id,
  c.customer_id,
  COALESCE(cust.first_name_ar || ' ' || cust.last_name_ar, cust.company_name_ar, cust.first_name || ' ' || cust.last_name) AS customer_name_ar,
  COALESCE(cust.first_name || ' ' || cust.last_name, cust.company_name, cust.first_name_ar || ' ' || cust.last_name_ar) AS customer_name_en,
  c.contract_amount,
  c.monthly_amount,
  c.total_paid AS contract_total_paid,
  c.balance_due AS contract_balance_due,
  c.payment_status AS contract_payment_status,
  c.start_date,
  c.end_date,
  c.status AS contract_status,

  -- Invoice summary
  COUNT(DISTINCT inv.id) AS total_invoices,
  COUNT(DISTINCT inv.id) FILTER (WHERE inv.payment_status = 'paid') AS paid_invoices,
  COUNT(DISTINCT inv.id) FILTER (WHERE inv.payment_status = 'unpaid') AS unpaid_invoices,
  COUNT(DISTINCT inv.id) FILTER (WHERE inv.payment_status = 'partial') AS partial_invoices,
  COUNT(DISTINCT inv.id) FILTER (WHERE inv.payment_status = 'overdue') AS overdue_invoices,

  -- Payment summary
  COUNT(DISTINCT pay.id) AS total_payments,
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.payment_status = 'completed') AS completed_payments,
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.payment_status = 'pending') AS pending_payments,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'completed'), 0) AS total_paid_amount,

  -- Timeline: last payment
  MAX(pay.payment_date) FILTER (WHERE pay.payment_status = 'completed') AS last_payment_date,
  MAX(pay.amount) FILTER (WHERE pay.payment_status = 'completed' AND pay.payment_date = (
    SELECT MAX(p2.payment_date) FROM payments p2
    WHERE p2.contract_id = c.id AND p2.payment_status = 'completed'
  )) AS last_payment_amount,

  -- Timeline: next expected payment
  MIN(inv.due_date) FILTER (
    WHERE inv.payment_status IN ('unpaid', 'partial', 'overdue')
    AND inv.due_date >= CURRENT_DATE
  ) AS next_due_date,
  COALESCE(SUM(inv.total_amount - COALESCE(inv.paid_amount, 0)) FILTER (
    WHERE inv.payment_status IN ('unpaid', 'partial', 'overdue')
    AND inv.due_date >= CURRENT_DATE
  ), 0) AS upcoming_amount_due,

  -- Aging
  COALESCE(SUM(inv.total_amount - COALESCE(inv.paid_amount, 0)) FILTER (
    WHERE inv.payment_status IN ('unpaid', 'partial', 'overdue')
    AND inv.due_date < CURRENT_DATE
  ), 0) AS past_due_amount,
  MAX(CURRENT_DATE - inv.due_date) FILTER (
    WHERE inv.payment_status IN ('unpaid', 'partial', 'overdue')
    AND inv.due_date < CURRENT_DATE
  ) AS max_days_overdue,

  -- Collection rate
  CASE
    WHEN c.contract_amount > 0 THEN
      ROUND((c.total_paid / c.contract_amount * 100)::numeric, 2)
    ELSE 0
  END AS collection_rate_pct,

  -- Monthly breakdown (last 12 months)
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.payment_status = 'completed'
    AND pay.payment_date >= DATE_TRUNC('month', CURRENT_DATE)::date
  ), 0) AS current_month_collected,
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.payment_status = 'completed'
    AND pay.payment_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date
    AND pay.payment_date < DATE_TRUNC('month', CURRENT_DATE)::date
  ), 0) AS last_month_collected

FROM contracts c
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN invoices inv ON inv.contract_id = c.id
LEFT JOIN payments pay ON pay.contract_id = c.id

WHERE c.status != 'cancelled'

GROUP BY
  c.id, c.contract_number, c.company_id, c.customer_id,
  cust.first_name_ar, cust.last_name_ar, cust.company_name_ar,
  cust.first_name, cust.last_name, cust.company_name,
  c.contract_amount, c.monthly_amount, c.total_paid, c.balance_due,
  c.payment_status, c.start_date, c.end_date, c.status

ORDER BY c.balance_due DESC;

COMMENT ON VIEW invoice_payment_timeline IS 'عرض الجدول الزمني للمدفوعات على مستوى العقد - يشمل التحصيل الشهري والمتأخرات';

-- ============================================================================
-- STEP 6: Enable RLS on new tables
-- تفعيل سياسات الأمان
-- ============================================================================

ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create RLS Policies
-- إنشاء سياسات RLS
-- ============================================================================

-- Policies for employee_tasks
CREATE POLICY "Users can view tasks for their company"
  ON employee_tasks FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own tasks"
  ON employee_tasks FOR UPDATE
  USING (
    assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all tasks for their company"
  ON employee_tasks FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

CREATE POLICY "Users can create tasks for their company"
  ON employee_tasks FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policies for call_logs
CREATE POLICY "Users can view call logs for their company"
  ON call_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create call logs for their company"
  ON call_logs FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all call logs for their company"
  ON call_logs FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- Policies for contract_notes
CREATE POLICY "Users can view contract notes for their company"
  ON contract_notes FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes for their company"
  ON contract_notes FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notes"
  ON contract_notes FOR UPDATE
  USING (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all notes for their company"
  ON contract_notes FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- Policies for employee_performance
CREATE POLICY "Users can view performance for their company"
  ON employee_performance FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own performance"
  ON employee_performance FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage performance records for their company"
  ON employee_performance FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
    )
  );

-- ============================================================================
-- STEP 8: Create Triggers for updated_at
-- إنشاء Triggers لتحديث updated_at تلقائياً
-- ============================================================================

CREATE TRIGGER update_employee_tasks_updated_at
  BEFORE UPDATE ON employee_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_notes_updated_at
  BEFORE UPDATE ON contract_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_performance_updated_at
  BEFORE UPDATE ON employee_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 9: Grant API access to authenticated users
-- منح صلاحيات API للمستخدمين المصادق عليهم
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON employee_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contract_notes TO authenticated;
GRANT SELECT ON employee_performance TO authenticated;
GRANT SELECT ON invoice_payment_timeline TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
