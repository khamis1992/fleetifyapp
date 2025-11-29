-- ============================================
-- إنشاء جدول إعدادات واتساب
-- Create WhatsApp Settings Table
-- ============================================
-- التاريخ: 2025-11-29
-- الغرض: تخزين إعدادات تقارير واتساب والمستلمين
-- ============================================

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- إعدادات التقرير اليومي
  daily_report_enabled BOOLEAN DEFAULT true,
  daily_report_time TIME DEFAULT '08:00',
  daily_report_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  
  -- إعدادات التقرير الأسبوعي
  weekly_report_enabled BOOLEAN DEFAULT true,
  weekly_report_day INTEGER DEFAULT 0, -- 0 = الأحد
  weekly_report_time TIME DEFAULT '09:00',
  
  -- إعدادات التقرير الشهري
  monthly_report_enabled BOOLEAN DEFAULT false,
  monthly_report_day INTEGER DEFAULT 1,
  monthly_report_time TIME DEFAULT '10:00',
  
  -- إعدادات التنبيهات الفورية
  instant_alerts_enabled BOOLEAN DEFAULT true,
  alert_threshold NUMERIC DEFAULT 10000,
  
  -- المستلمون (JSONB array)
  recipients JSONB DEFAULT '[]'::jsonb,
  
  -- إعدادات Ultramsg (مشفرة)
  ultramsg_instance_id TEXT,
  ultramsg_token TEXT,
  
  -- التواريخ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- فريد لكل شركة
  CONSTRAINT unique_company_whatsapp_settings UNIQUE (company_id)
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_company 
ON whatsapp_settings(company_id);

-- إنشاء دالة التحديث التلقائي للتاريخ
CREATE OR REPLACE FUNCTION update_whatsapp_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS trigger_update_whatsapp_settings_updated_at ON whatsapp_settings;
CREATE TRIGGER trigger_update_whatsapp_settings_updated_at
  BEFORE UPDATE ON whatsapp_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_settings_updated_at();

-- إنشاء جدول سجل رسائل واتساب
CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_id TEXT,
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  ultramsg_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهارس لسجل الرسائل
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_company 
ON whatsapp_message_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created 
ON whatsapp_message_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status 
ON whatsapp_message_logs(status);

-- ============================================
-- سياسات RLS (Row Level Security)
-- ============================================

-- تفعيل RLS
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للمستخدمين المصرح لهم
CREATE POLICY "Users can view their company whatsapp settings"
ON whatsapp_settings FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- سياسة الإدراج
CREATE POLICY "Users can insert their company whatsapp settings"
ON whatsapp_settings FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- سياسة التحديث
CREATE POLICY "Users can update their company whatsapp settings"
ON whatsapp_settings FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- سياسات سجل الرسائل
CREATE POLICY "Users can view their company message logs"
ON whatsapp_message_logs FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert message logs"
ON whatsapp_message_logs FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- منح الصلاحيات
GRANT ALL ON whatsapp_settings TO authenticated;
GRANT ALL ON whatsapp_message_logs TO authenticated;

-- ============================================
-- تعليقات توضيحية
-- ============================================
COMMENT ON TABLE whatsapp_settings IS 'إعدادات تقارير واتساب لكل شركة';
COMMENT ON COLUMN whatsapp_settings.recipients IS 'مصفوفة JSON للمستلمين مع معلوماتهم وتفضيلاتهم';
COMMENT ON TABLE whatsapp_message_logs IS 'سجل رسائل واتساب المرسلة';

