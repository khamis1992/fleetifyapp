-- جدول استشارات المستشار القانوني الذكي
CREATE TABLE IF NOT EXISTS legal_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  query_type VARCHAR(50) DEFAULT 'legal_consultation',
  risk_score DECIMAL(5,2),
  response_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  country VARCHAR(50) DEFAULT 'qatar',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الوثائق القانونية المولدة
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  document_type VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  template_used VARCHAR(100),
  country_law VARCHAR(50) DEFAULT 'qatar',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_legal_consultations_company ON legal_consultations(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_consultations_customer ON legal_consultations(customer_id);
CREATE INDEX IF NOT EXISTS idx_legal_consultations_created ON legal_consultations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_documents_company ON legal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_customer ON legal_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_type ON legal_documents(document_type);

-- تفعيل RLS
ALTER TABLE legal_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للاستشارات
CREATE POLICY "users_can_view_company_consultations" ON legal_consultations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_company_consultations" ON legal_consultations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- سياسات الأمان للوثائق
CREATE POLICY "users_can_view_company_documents" ON legal_documents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_company_documents" ON legal_documents
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_company_documents" ON legal_documents
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_delete_company_documents" ON legal_documents
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );;
