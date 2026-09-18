-- جدول إعدادات واتساب
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- إعدادات التقرير اليومي
    daily_report_enabled BOOLEAN DEFAULT true,
    daily_report_time TIME DEFAULT '08:00:00',
    daily_report_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
    
    -- إعدادات التقرير الأسبوعي
    weekly_report_enabled BOOLEAN DEFAULT true,
    weekly_report_day INTEGER DEFAULT 0, -- 0 = الأحد
    weekly_report_time TIME DEFAULT '09:00:00',
    
    -- إعدادات التقرير الشهري
    monthly_report_enabled BOOLEAN DEFAULT false,
    monthly_report_day INTEGER DEFAULT 1,
    monthly_report_time TIME DEFAULT '09:00:00',
    
    -- إعدادات التنبيهات الفورية
    instant_alerts_enabled BOOLEAN DEFAULT true,
    alert_threshold DECIMAL(15,2) DEFAULT 10000,
    
    -- المستلمون (JSON Array)
    recipients JSONB DEFAULT '[]'::jsonb,
    
    -- بيانات Ultramsg (مشفرة)
    ultramsg_instance_id TEXT,
    ultramsg_token TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id)
);

-- جدول سجل رسائل واتساب
CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_company ON whatsapp_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_company ON whatsapp_message_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_message_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_message_logs(status);

-- تفعيل RLS
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لـ whatsapp_settings
CREATE POLICY "Users can view their company whatsapp settings"
    ON whatsapp_settings FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their company whatsapp settings"
    ON whatsapp_settings FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their company whatsapp settings"
    ON whatsapp_settings FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
    ));

-- سياسات الأمان لـ whatsapp_message_logs
CREATE POLICY "Users can view their company whatsapp logs"
    ON whatsapp_message_logs FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their company whatsapp logs"
    ON whatsapp_message_logs FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
    ));

-- تعليق على الجداول
COMMENT ON TABLE whatsapp_settings IS 'إعدادات تقارير واتساب لكل شركة';
COMMENT ON TABLE whatsapp_message_logs IS 'سجل رسائل واتساب المرسلة';;
