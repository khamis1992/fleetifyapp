-- =============================================
-- جدول المتابعات المجدولة - Scheduled Follow-ups
-- =============================================

-- إنشاء جدول المتابعات المجدولة
CREATE TABLE IF NOT EXISTS scheduled_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  legal_case_id UUID REFERENCES legal_cases(id) ON DELETE SET NULL,
  
  -- نوع المتابعة
  followup_type TEXT NOT NULL DEFAULT 'call' CHECK (followup_type IN ('call', 'visit', 'email', 'whatsapp', 'meeting')),
  
  -- تفاصيل الموعد
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  
  -- حالة المتابعة
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled', 'missed')),
  
  -- الأولوية
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- التفاصيل
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  
  -- النتيجة (بعد الإتمام)
  outcome TEXT CHECK (outcome IN ('answered', 'no_answer', 'busy', 'rescheduled', 'successful', 'unsuccessful')),
  outcome_notes TEXT,
  completed_at TIMESTAMPTZ,
  
  -- المسؤول
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- التذكيرات
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  
  -- مصدر الإنشاء (manual, legal_case, contract, etc.)
  source TEXT DEFAULT 'manual',
  source_reference TEXT,
  
  -- التواريخ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_company ON scheduled_followups(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_customer ON scheduled_followups(customer_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_status ON scheduled_followups(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_date ON scheduled_followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_assigned ON scheduled_followups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_legal_case ON scheduled_followups(legal_case_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_priority ON scheduled_followups(priority);

-- فهرس مركب للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_pending_date 
  ON scheduled_followups(company_id, status, scheduled_date) 
  WHERE status = 'pending';

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_scheduled_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scheduled_followups_updated_at ON scheduled_followups;
CREATE TRIGGER trigger_update_scheduled_followups_updated_at
  BEFORE UPDATE ON scheduled_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_followups_updated_at();

-- سياسات RLS
ALTER TABLE scheduled_followups ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يرى متابعات شركته فقط
DROP POLICY IF EXISTS "Users can view their company followups" ON scheduled_followups;
CREATE POLICY "Users can view their company followups"
  ON scheduled_followups FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- سياسة الإضافة: المستخدم يضيف متابعات لشركته فقط
DROP POLICY IF EXISTS "Users can insert their company followups" ON scheduled_followups;
CREATE POLICY "Users can insert their company followups"
  ON scheduled_followups FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- سياسة التحديث: المستخدم يحدث متابعات شركته فقط
DROP POLICY IF EXISTS "Users can update their company followups" ON scheduled_followups;
CREATE POLICY "Users can update their company followups"
  ON scheduled_followups FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- سياسة الحذف: المستخدم يحذف متابعات شركته فقط
DROP POLICY IF EXISTS "Users can delete their company followups" ON scheduled_followups;
CREATE POLICY "Users can delete their company followups"
  ON scheduled_followups FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- إضافة تعليقات للجدول
COMMENT ON TABLE scheduled_followups IS 'جدول المتابعات المجدولة - يحتوي على المكالمات والزيارات المخططة للعملاء';
COMMENT ON COLUMN scheduled_followups.followup_type IS 'نوع المتابعة: call, visit, email, whatsapp, meeting';
COMMENT ON COLUMN scheduled_followups.status IS 'حالة المتابعة: pending, completed, cancelled, rescheduled, missed';
COMMENT ON COLUMN scheduled_followups.priority IS 'أولوية المتابعة: low, normal, high, urgent';
COMMENT ON COLUMN scheduled_followups.outcome IS 'نتيجة المتابعة بعد إتمامها';
COMMENT ON COLUMN scheduled_followups.source IS 'مصدر إنشاء المتابعة: manual, legal_case, contract, system';;
