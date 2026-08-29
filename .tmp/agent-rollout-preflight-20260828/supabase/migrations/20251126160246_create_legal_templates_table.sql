-- إنشاء جدول القوالب القانونية
CREATE TABLE IF NOT EXISTS legal_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID REFERENCES companies(id),
    code            VARCHAR(100) NOT NULL,
    name_ar         TEXT NOT NULL,
    name_en         TEXT,
    category        VARCHAR(100),
    body_ar         TEXT NOT NULL,
    body_en         TEXT,
    variables       JSONB DEFAULT '[]'::jsonb,
    is_active       BOOLEAN DEFAULT TRUE,
    is_system       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- إضافة فهرس
CREATE INDEX IF NOT EXISTS idx_legal_templates_company ON legal_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_templates_code ON legal_templates(code);
CREATE INDEX IF NOT EXISTS idx_legal_templates_category ON legal_templates(category);

-- تمكين RLS
ALTER TABLE legal_templates ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة
CREATE POLICY "legal_templates_read" ON legal_templates
FOR SELECT USING (
    company_id IS NULL OR 
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- سياسة الإدراج
CREATE POLICY "legal_templates_insert" ON legal_templates
FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- سياسة التحديث
CREATE POLICY "legal_templates_update" ON legal_templates
FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- تعليق توضيحي
COMMENT ON TABLE legal_templates IS 'قوالب المستندات القانونية';;
