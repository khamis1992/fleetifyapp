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
COMMENT ON COLUMN scheduled_followups.source IS 'مصدر إنشاء المتابعة: manual, legal_case, contract, system';

-- =============================================
-- وظيفة إرسال تذكيرات المتابعات
-- =============================================

-- وظيفة لإنشاء إشعارات للمتابعات القادمة
CREATE OR REPLACE FUNCTION send_followup_reminders()
RETURNS void AS $$
DECLARE
  followup_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- المتابعات المجدولة لليوم والتي لم يتم إرسال تذكير لها
  FOR followup_record IN
    SELECT 
      sf.*,
      c.first_name_ar,
      c.last_name_ar,
      c.first_name,
      c.last_name,
      c.phone
    FROM scheduled_followups sf
    LEFT JOIN customers c ON c.id = sf.customer_id
    WHERE sf.status = 'pending'
      AND sf.scheduled_date = CURRENT_DATE
      AND sf.reminder_sent = FALSE
  LOOP
    -- بناء عنوان الإشعار
    notification_title := '⏰ تذكير: ' || followup_record.title;
    
    -- بناء رسالة الإشعار
    notification_message := 'لديك متابعة مجدولة اليوم:' || E'\n' ||
      'العميل: ' || COALESCE(followup_record.first_name_ar, followup_record.first_name, '') || ' ' || 
      COALESCE(followup_record.last_name_ar, followup_record.last_name, '') || E'\n' ||
      'الهاتف: ' || COALESCE(followup_record.phone, 'غير محدد') || E'\n' ||
      'الموعد: ' || COALESCE(followup_record.scheduled_time::TEXT, 'غير محدد');
    
    -- إنشاء إشعار للمستخدم المسؤول (أو منشئ المتابعة)
    INSERT INTO user_notifications (
      company_id,
      user_id,
      notification_type,
      title,
      message,
      related_type,
      related_id,
      is_read
    ) VALUES (
      followup_record.company_id,
      COALESCE(followup_record.assigned_to, followup_record.created_by),
      'followup_reminder',
      notification_title,
      notification_message,
      'scheduled_followup',
      followup_record.id,
      FALSE
    );
    
    -- تحديث حالة التذكير
    UPDATE scheduled_followups
    SET 
      reminder_sent = TRUE,
      reminder_sent_at = NOW()
    WHERE id = followup_record.id;
    
  END LOOP;
  
  -- أيضاً إنشاء إشعارات للمتابعات المتأخرة (التي تجاوزت موعدها)
  FOR followup_record IN
    SELECT 
      sf.*,
      c.first_name_ar,
      c.last_name_ar,
      c.first_name,
      c.last_name
    FROM scheduled_followups sf
    LEFT JOIN customers c ON c.id = sf.customer_id
    WHERE sf.status = 'pending'
      AND sf.scheduled_date < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM user_notifications un
        WHERE un.related_id = sf.id
          AND un.notification_type = 'overdue_followup'
          AND un.created_at > sf.scheduled_date::TIMESTAMPTZ
      )
  LOOP
    -- إنشاء إشعار متابعة متأخرة
    INSERT INTO user_notifications (
      company_id,
      user_id,
      notification_type,
      title,
      message,
      related_type,
      related_id,
      is_read
    ) VALUES (
      followup_record.company_id,
      COALESCE(followup_record.assigned_to, followup_record.created_by),
      'overdue_followup',
      '⚠️ متابعة متأخرة: ' || COALESCE(followup_record.first_name_ar, followup_record.first_name, 'عميل'),
      'لديك متابعة متأخرة منذ ' || (CURRENT_DATE - followup_record.scheduled_date) || ' يوم',
      'scheduled_followup',
      followup_record.id,
      FALSE
    );
    
  END LOOP;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء تعليق للوظيفة
COMMENT ON FUNCTION send_followup_reminders IS 'وظيفة لإرسال تذكيرات المتابعات المجدولة - يتم استدعاؤها بواسطة cron job';

