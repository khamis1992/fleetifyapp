-- إنشاء جدول إعدادات واتساب
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  daily_report_enabled BOOLEAN DEFAULT true,
  daily_report_time TIME DEFAULT '08:00',
  daily_report_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  weekly_report_enabled BOOLEAN DEFAULT true,
  weekly_report_day INTEGER DEFAULT 0,
  weekly_report_time TIME DEFAULT '09:00',
  monthly_report_enabled BOOLEAN DEFAULT false,
  monthly_report_day INTEGER DEFAULT 1,
  monthly_report_time TIME DEFAULT '10:00',
  instant_alerts_enabled BOOLEAN DEFAULT true,
  alert_threshold NUMERIC DEFAULT 10000,
  recipients JSONB DEFAULT '[]'::jsonb,
  ultramsg_instance_id TEXT,
  ultramsg_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_company_whatsapp_settings UNIQUE (company_id)
);

-- إنشاء فهرس
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_company ON whatsapp_settings(company_id);

-- إنشاء دالة التحديث التلقائي
CREATE OR REPLACE FUNCTION update_whatsapp_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger
DROP TRIGGER IF EXISTS trigger_update_whatsapp_settings_updated_at ON whatsapp_settings;
CREATE TRIGGER trigger_update_whatsapp_settings_updated_at
  BEFORE UPDATE ON whatsapp_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_settings_updated_at();

-- إنشاء جدول سجل الرسائل
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

-- فهارس سجل الرسائل
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_company ON whatsapp_message_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_message_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_message_logs(status);

-- تفعيل RLS
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can view their company whatsapp settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Users can insert their company whatsapp settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Users can update their company whatsapp settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Users can view their company message logs" ON whatsapp_message_logs;
DROP POLICY IF EXISTS "Users can insert message logs" ON whatsapp_message_logs;

-- سياسات whatsapp_settings
CREATE POLICY "Users can view their company whatsapp settings"
ON whatsapp_settings FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their company whatsapp settings"
ON whatsapp_settings FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company whatsapp settings"
ON whatsapp_settings FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- سياسات whatsapp_message_logs
CREATE POLICY "Users can view their company message logs"
ON whatsapp_message_logs FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert message logs"
ON whatsapp_message_logs FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- منح الصلاحيات
GRANT ALL ON whatsapp_settings TO authenticated;
GRANT ALL ON whatsapp_message_logs TO authenticated;;
