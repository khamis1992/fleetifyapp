-- ============================================================================
-- Legal Document Generator System
-- ============================================================================
-- Purpose: Create tables for the official document generator system
-- Created: 2025-12-28
-- ============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: legal_document_templates
-- ============================================================================
-- Stores document templates with variable definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL CHECK (category IN ('insurance', 'traffic', 'general', 'customer')),
  description_ar TEXT,
  description_en TEXT,

  -- Template content
  subject_template TEXT,
  body_template TEXT NOT NULL,
  footer_template TEXT,

  -- Configuration
  variables JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of required variables
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE legal_document_templates IS 'Templates for official legal documents';
COMMENT ON COLUMN legal_document_templates.template_key IS 'Unique identifier for the template (e.g., insurance_deregistration)';
COMMENT ON COLUMN legal_document_templates.category IS 'Document category: insurance, traffic, general, or customer';
COMMENT ON COLUMN legal_document_templates.variables IS 'JSON array of variable definitions for the template';

-- Create indexes
CREATE INDEX idx_templates_category ON legal_document_templates(category);
CREATE INDEX idx_templates_active ON legal_document_templates(is_active);
CREATE INDEX idx_templates_requires_approval ON legal_document_templates(requires_approval);

-- ============================================================================
-- TABLE 2: legal_document_generations
-- ============================================================================
-- Stores generated documents with their data
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_document_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES legal_document_templates(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Document info
  document_type TEXT NOT NULL,
  document_number TEXT,

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  variables_data JSONB NOT NULL, -- User input data

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'approved', 'rejected', 'sent')),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),

  -- Recipient info
  recipient_name TEXT,
  recipient_entity TEXT,
  recipient_address TEXT,

  -- References
  related_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  related_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  related_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- File storage
  file_url TEXT, -- Supabase Storage URL
  file_name TEXT,
  file_type TEXT CHECK (file_type IN ('pdf', 'docx', 'html', 'txt')),

  -- Metadata
  generated_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE legal_document_generations IS 'Generated legal documents with their data';
COMMENT ON COLUMN legal_document_generations.variables_data IS 'JSON object containing user input for template variables';
COMMENT ON COLUMN legal_document_generations.status IS 'Document workflow status: draft, generated, approved, rejected, sent';
COMMENT ON COLUMN legal_document_generations.approval_status IS 'Approval status: pending, approved, rejected';

-- Create indexes
CREATE INDEX idx_generations_template ON legal_document_generations(template_id);
CREATE INDEX idx_generations_company ON legal_document_generations(company_id);
CREATE INDEX idx_generations_status ON legal_document_generations(status);
CREATE INDEX idx_generations_approval_status ON legal_document_generations(approval_status);
CREATE INDEX idx_generations_date ON legal_document_generations(created_at DESC);
CREATE INDEX idx_generations_vehicle ON legal_document_generations(related_vehicle_id);
CREATE INDEX idx_generations_contract ON legal_document_generations(related_contract_id);
CREATE INDEX idx_generations_customer ON legal_document_generations(related_customer_id);
CREATE INDEX idx_generations_generated_by ON legal_document_generations(generated_by);

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_legal_document_generator_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON legal_document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_document_generator_updated_at();

CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON legal_document_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_document_generator_updated_at();

-- ============================================================================
-- FUNCTION: Generate document number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_document_number(p_company_id UUID, p_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_sequence_num INTEGER;
  v_document_number TEXT;
BEGIN
  -- Determine prefix based on document type
  CASE p_type
    WHEN 'insurance_deregistration' THEN v_prefix := 'INS-DEREG';
    WHEN 'insurance_accident' THEN v_prefix := 'INS-ACC';
    WHEN 'insurance_claim' THEN v_prefix := 'INS-CLAIM';
    WHEN 'traffic_transfer' THEN v_prefix := 'TRF-TRANS';
    WHEN 'traffic_license' THEN v_prefix := 'TRF-LIC';
    WHEN 'traffic_inspection' THEN v_prefix := 'TRF-INSP';
    WHEN 'general_official' THEN v_prefix := 'GEN-OFF';
    WHEN 'customer_warning' THEN v_prefix := 'CUST-WARN';
    WHEN 'customer_cancellation' THEN v_prefix := 'CUST-CANC';
    ELSE v_prefix := 'DOC';
  END CASE;

  -- Get next sequence number for this company and type
  SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_sequence_num
  FROM legal_document_generations
  WHERE company_id = p_company_id
    AND document_type = p_type
    AND created_at >= DATE_TRUNC('year', NOW());

  -- Format: PREFIX-YYYY-XXXX
  v_document_number := v_prefix || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_sequence_num::TEXT, 4, '0');

  RETURN v_document_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE legal_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_generations ENABLE ROW LEVEL SECURITY;

-- Templates: Everyone can read active templates, only admins can modify
CREATE POLICY "Templates: Read active templates"
  ON legal_document_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Templates: Admin can insert"
  ON legal_document_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Templates: Admin can update"
  ON legal_document_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Templates: Admin can delete"
  ON legal_document_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Generations: Users can see their company's documents
CREATE POLICY "Generations: Read own company documents"
  ON legal_document_generations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Generations: Insert for own company"
  ON legal_document_generations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Generations: Update own company documents"
  ON legal_document_generations FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Generations: Delete own company documents"
  ON legal_document_generations FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  );

-- ============================================================================
-- INSERT DEFAULT TEMPLATES
-- ============================================================================

-- Insurance templates
INSERT INTO legal_document_templates (template_key, name_ar, name_en, category, description_ar, description_en, subject_template, body_template, variables) VALUES
('insurance_deregistration',
 'طلب شطب مركبة من التأمين',
 'Vehicle Deregistration Request',
 'insurance',
 'كتاب رسمي لشركة التأمين لطلب شطب مركبة',
 'Official letter to insurance company to request vehicle deregistration',
 'طلب شطب مركبة - رقم الوثيقة: {{policy_number}}',
'السادة/ {{recipient_name}}

موضوع: {{subject}}

التحية الطيبة وبعد،،

نود إعلامكم برغبتنا في شطب المركبة التالية من وثيقة التأمين رقم {{policy_number}}:

بيانات المركبة:
• رقم اللوحة: {{plate_number}}
• رقم الهيكل: {{chassis_number}}
• الماركة: {{brand}}
• الموديل: {{model}}
• سنة الصنع: {{year}}

سبب الشطب: {{reason}}

نرجو منكم اتخاذ اللازم إزاء ذلك، وإشعارنا بإتمام الإجراء.

وتفضلوا بقبول فائق التقدير والاحترام،،

{{sender_name}}
{{sender_title}}
{{company_name}}
التاريخ: {{current_date}}',
'[{"name":"recipient_name","label":"اسم شركة التأمين","type":"text","required":true},{"name":"policy_number","label":"رقم الوثيقة","type":"text","required":true},{"name":"plate_number","label":"رقم اللوحة","type":"text","required":true},{"name":"chassis_number","label":"رقم الهيكل","type":"text","required":true},{"name":"brand","label":"الماركة","type":"text","required":true},{"name":"model","label":"الموديل","type":"text","required":true},{"name":"year","label":"سنة الصنع","type":"number","required":true},{"name":"reason","label":"سبب الشطب","type":"textarea","required":true},{"name":"sender_name","label":"اسم المرسل","type":"text","required":true},{"name":"sender_title","label":"المسمى الوظيفي","type":"text","required":true}]::jsonb'),

('insurance_accident_notification',
 'إخطار حادث لشركة التأمين',
 'Accident Notification to Insurance',
 'insurance',
 'إخطار شركة التأمين بوقوع حادث',
 'Notify insurance company of an accident',
 'إخطار حادث - المركبة: {{plate_number}}',
'السادة/ {{recipient_name}}

موضوع: {{subject}}

التحية الطيبة وبعد،،

نود إعلامكم بوقوع حادث للمركبة المؤمنة لديكم بموجب وثيقة التأمين رقم {{policy_number}}:

بيانات الحادث:
• تاريخ الحادث: {{accident_date}}
• وقت الحادث: {{accident_time}}
• مكان الحادث: {{accident_location}}
• رقم الحادث: {{accident_report_number}}

بيانات المركبة:
• رقم اللوحة: {{plate_number}}
• رقم الهيكل: {{chassis_number}}
• السائق: {{driver_name}}
• رقم الهوية: {{driver_id}}

وصف الحادث:
{{accident_description}}

الأضرار:
{{damages_description}}

المرفقات:
• نسخة من محضر الحادث
• صور الأضرار

نرجو منكم تكليف أحد معيني الضرر لفحص المركبة والتقرير عن الأضرار.

وتفضلوا بقبول فائق التقدير والاحترام،،

{{sender_name}}
{{sender_title}}
{{company_name}}
التاريخ: {{current_date}}',
'[{"name":"recipient_name","label":"اسم شركة التأمين","type":"text","required":true},{"name":"policy_number","label":"رقم الوثيقة","type":"text","required":true},{"name":"plate_number","label":"رقم اللوحة","type":"text","required":true},{"name":"chassis_number","label":"رقم الهيكل","type":"text","required":true},{"name":"accident_date","label":"تاريخ الحادث","type":"date","required":true},{"name":"accident_time","label":"وقت الحادث","type":"text","required":true},{"name":"accident_location","label":"مكان الحادث","type":"text","required":true},{"name":"accident_report_number","label":"رقم محضر الحادث","type":"text","required":true},{"name":"driver_name","label":"اسم السائق","type":"text","required":true},{"name":"driver_id","label":"رقم هوية السائق","type":"text","required":true},{"name":"accident_description","label":"وصف الحادث","type":"textarea","required":true},{"name":"damages_description","label":"وصف الأضرار","type":"textarea","required":true},{"name":"sender_name","label":"اسم المرسل","type":"text","required":true},{"name":"sender_title","label":"المسمى الوظيفي","type":"text","required":true}]::jsonb');

-- Traffic templates
INSERT INTO legal_document_templates (template_key, name_ar, name_en, category, description_ar, description_en, subject_template, body_template, variables) VALUES
('traffic_ownership_transfer',
 'طلب نقل ملكية مركبة',
 'Vehicle Ownership Transfer Request',
 'traffic',
 'طلب نقل ملكية مركبة لإدارة المرور',
 'Request to transfer vehicle ownership to traffic department',
 'طلب نقل ملكية - اللوحة: {{plate_number}}',
'سعادة مدير إدارة المرور
{{recipient_name}}

موضوع: {{subject}}

تحية طيبة وبعد،،

أتقدم إلى سعادتكم بطلب نقل ملكية المركبة التالية:

بيانات المركبة:
• رقم اللوحة: {{plate_number}}
• رقم الهيكل: {{chassis_number}}
• الماركة: {{brand}}
• الموديل: {{model}}
• سنة الصنع: {{year}}
• اللون: {{color}}

بيانات البائع:
• الاسم: {{seller_name}}
• رقم الهوية: {{seller_id}}
• رقم الهاتف: {{seller_phone}}

بيانات المشتري:
• الاسم: {{buyer_name}}
• رقم الهوية: {{buyer_id}}
• رقم الهاتف: {{buyer_phone}}

المرفقات:
• صورة الهوية البنكية للبائع
• صورة الهوية البنكية للمشتري
• صك المركبة الأصلي
• مخالصة من المرور

نرجو من سعادتكم التكرم بإجراء نقل الملكية.

وتفضلوا بقبول فائق التقدير والاحترام،،

{{sender_name}}
{{sender_title}}
{{company_name}}
التاريخ: {{current_date}}',
'[{"name":"recipient_name","label":"اسم إدارة المرور","type":"text","required":true},{"name":"plate_number","label":"رقم اللوحة","type":"text","required":true},{"name":"chassis_number","label":"رقم الهيكل","type":"text","required":true},{"name":"brand","label":"الماركة","type":"text","required":true},{"name":"model","label":"الموديل","type":"text","required":true},{"name":"year","label":"سنة الصنع","type":"number","required":true},{"name":"color","label":"اللون","type":"text","required":true},{"name":"seller_name","label":"اسم البائع","type":"text","required":true},{"name":"seller_id","label":"رقم هوية البائع","type":"text","required":true},{"name":"seller_phone","label":"رقم هاتف البائع","type":"text","required":true},{"name":"buyer_name","label":"اسم المشتري","type":"text","required":true},{"name":"buyer_id","label":"رقم هوية المشتري","type":"text","required":true},{"name":"buyer_phone","label":"رقم هاتف المشتري","type":"text","required":true},{"name":"sender_name","label":"اسم المرسل","type":"text","required":true},{"name":"sender_title","label":"المسمى الوظيفي","type":"text","required":true}]::jsonb'),

('traffic_license_renewal',
 'طلب تجديد رخصة مركبة',
 'Vehicle License Renewal Request',
 'traffic',
 'طلب تجديد رخصة مركبة',
 'Request to renew vehicle license',
 'طلب تجديد رخصة - اللوحة: {{plate_number}}',
'سعادة مدير إدارة المرور
{{recipient_name}}

موضوع: {{subject}}

تحية طيبة وبعد،،

أتقدم إلى سعادتكم بطلب تجديد رخصة المركبة التالية:

بيانات المركبة:
• رقم اللوحة: {{plate_number}}
• رقم الهيكل: {{chassis_number}}
• الماركة: {{brand}}
• الموديل: {{model}}
• سنة الصنع: {{year}}
• اللون: {{color}}

الرقم المرجعي للرخصة: {{license_reference}}

نطلب من سعادتكم التكرم بتجديد الرخصة لمدة {{renewal_period}} سنة.

المرفقات:
• صورة الهوية
• صورة الرخصة القديمة
• مخالصة من المرور
• مخالصة التأمين

وتفضلوا بقبول فائق التقدير والاحترام،،

{{sender_name}}
{{sender_title}}
{{company_name}}
التاريخ: {{current_date}}',
'[{"name":"recipient_name","label":"اسم إدارة المرور","type":"text","required":true},{"name":"plate_number","label":"رقم اللوحة","type":"text","required":true},{"name":"chassis_number","label":"رقم الهيكل","type":"text","required":true},{"name":"brand","label":"الماركة","type":"text","required":true},{"name":"model","label":"الموديل","type":"text","required":true},{"name":"year","label":"سنة الصنع","type":"number","required":true},{"name":"color","label":"اللون","type":"text","required":true},{"name":"license_reference","label":"الرقم المرجعي للرخصة","type":"text","required":true},{"name":"renewal_period","label":"مدة التجديد بالسنوات","type":"number","required":true},{"name":"sender_name","label":"اسم المرسل","type":"text","required":true},{"name":"sender_title","label":"المسمى الوظيفي","type":"text","required":true}]::jsonb');

-- Customer templates
INSERT INTO legal_document_templates (template_key, name_ar, name_en, category, description_ar, description_en, subject_template, body_template, variables, requires_approval) VALUES
('customer_official_warning',
 'إنذار رسمي للعميل',
 'Official Warning to Customer',
 'customer',
 'إنذار رسمي للعميل بتأخير السداد',
 'Official warning to customer for payment delay',
 'إنذار رسمي - العميل: {{customer_name}}',
'السادة/ {{customer_name}}

موضوع: {{subject}}

تحية طيبة وبعد،،

نود إعلامكم بأن التأمين على العقد رقم {{contract_number}} قد تجاوز الحد المسموح به.

بيانات العقد:
• رقم العقد: {{contract_number}}
• تاريخ العقد: {{contract_date}}
• المبلغ المستحق: {{due_amount}}
• تاريخ الاستحقاق: {{due_date}}
• مدة التأخير: {{delay_days}} يوم

نرجو منكم التكرام بالسداد خلال {{payment_deadline}} أيام من تاريخ هذا الإنذار.

نود تذكيركم بأن عدم السداد قد يؤدي إلى اتخاذ إجراءات قانونية.

وتفضلوا بقبول فائق التقدير والاحترام،،

{{sender_name}}
{{sender_title}}
{{company_name}}
التاريخ: {{current_date}}',
'[{"name":"customer_name","label":"اسم العميل","type":"text","required":true},{"name":"contract_number","label":"رقم العقد","type":"text","required":true},{"name":"contract_date","label":"تاريخ العقد","type":"date","required":true},{"name":"due_amount","label":"المبلغ المستحق","type":"number","required":true},{"name":"due_date","label":"تاريخ الاستحقاق","type":"date","required":true},{"name":"delay_days","label":"مدة التأخير بالأيام","type":"number","required":true},{"name":"payment_deadline","label":"مهلة السداد بالأيام","type":"number","required":true},{"name":"sender_name","label":"اسم المرسل","type":"text","required":true},{"name":"sender_title","label":"المسمى الوظيفي","type":"text","required":true}]::jsonb',
true);

-- General templates
INSERT INTO legal_document_templates (template_key, name_ar, name_en, category, description_ar, description_en, subject_template, body_template, variables) VALUES
('general_official_letter',
 'كتاب رسمي عام',
 'General Official Letter',
 'general',
 'كتاب رسمي لجهة حكومية أو خاصة',
 'Official letter to government or private entity',
'{{subject}}',
'السادة/ {{recipient_name}}

{{recipient_address}}

موضوع: {{subject}}

التحية الطيبة وبعد،،

{{letter_body}}

نرجو منكم التكرم بالنظر في الموضوع واتخاذ اللازم.

وتفضلوا بقبول فائق التقدير والاحترام،،

{{sender_name}}
{{sender_title}}
{{company_name}}
التاريخ: {{current_date}}',
'[{"name":"recipient_name","label":"اسم الجهة المستلمة","type":"text","required":true},{"name":"recipient_address","label":"عنوان الجهة","type":"textarea","required":false},{"name":"subject","label":"موضوع الكتاب","type":"text","required":true},{"name":"letter_body","label":"نص الكتاب","type":"textarea","required":true},{"name":"sender_name","label":"اسم المرسل","type":"text","required":true},{"name":"sender_title","label":"المسمى الوظيفي","type":"text","required":true}]::jsonb'),

('general_undertaking',
 'كتاب تعهد',
 'Undertaking Letter',
 'general',
 'كتاب تعهد رسمي',
 'Official undertaking letter',
'تعهد رسمي - {{undertaking_title}}',
'السادة/ {{recipient_name}}

موضوع: {{subject}}

التحية الطيبة وبعد،،

أنا الموقع أدناه {{signer_name}} أحمل هوية رقم {{signer_id}}، أتعهد وأقر بأن:

{{undertaking_text}}

وألتزم بالالتزام بجميع الشروط والأحكام المذكورة أعلاه، وأتحمل كامل المسؤولية القانونية في حالة المخالفة.

وتفضلوا بقبول فائق التقدير والاحترام،،

المتعهد: {{signer_name}}
رقم الهوية: {{signer_id}}
التاريخ: {{current_date}}
التوقيع: ____________________',
'[{"name":"recipient_name","label":"اسم الجهة المستلمة","type":"text","required":true},{"name":"undertaking_title","label":"عنوان التعهد","type":"text","required":true},{"name":"signer_name","label":"اسم الموقع","type":"text","required":true},{"name":"signer_id","label":"رقم الهوية","type":"text","required":true},{"name":"undertaking_text","label":"نص التعهد","type":"textarea","required":true}]::jsonb');

-- ============================================================================
-- CREATE VIEW FOR EASY ACCESS
-- ============================================================================
CREATE OR REPLACE VIEW legal_document_generations_view AS
SELECT
  g.id,
  g.document_number,
  g.document_type,
  g.status,
  g.approval_status,
  g.subject,
  g.recipient_name,
  g.recipient_entity,
  g.created_at,
  g.updated_at,
  t.name_ar AS template_name_ar,
  t.name_en AS template_name_en,
  t.category,
  c.name_ar AS company_name_ar,
  c.name_en AS company_name_en,
  u.name_ar AS generated_by_name,
  approver.name_ar AS approved_by_name,
  v.plate_number,
  cust.name_ar AS customer_name_ar
FROM legal_document_generations g
LEFT JOIN legal_document_templates t ON g.template_id = t.id
LEFT JOIN companies c ON g.company_id = c.id
LEFT JOIN users u ON g.generated_by = u.id
LEFT JOIN users approver ON g.approved_by = approver.id
LEFT JOIN vehicles v ON g.related_vehicle_id = v.id
LEFT JOIN customers cust ON g.related_customer_id = cust.id;

COMMENT ON VIEW legal_document_generations_view IS 'View for document generations with related data';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- authenticated users can use the system
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON legal_document_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_document_generations TO authenticated;
GRANT SELECT ON legal_document_generations_view TO authenticated;
GRANT EXECUTE ON FUNCTION generate_document_number(UUID, TEXT) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify templates were created
SELECT
  category,
  COUNT(*) as template_count,
  STRING_AGG(name_ar, ', ' ORDER BY name_ar) as templates
FROM legal_document_templates
GROUP BY category
ORDER BY category;
