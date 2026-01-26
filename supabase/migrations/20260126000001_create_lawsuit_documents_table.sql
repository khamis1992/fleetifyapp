-- إنشاء جدول لحفظ مستندات الدعاوى القانونية
CREATE TABLE IF NOT EXISTS lawsuit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'explanatory_memo',
    'claims_statement',
    'criminal_complaint',
    'violations_transfer',
    'contract_copy',
    'documents_list'
  )),
  document_name TEXT NOT NULL,
  file_url TEXT,
  html_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- فهرس فريد لكل نوع مستند لكل عقد
  UNIQUE(contract_id, document_type)
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_lawsuit_documents_contract ON lawsuit_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_lawsuit_documents_company ON lawsuit_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_lawsuit_documents_type ON lawsuit_documents(document_type);

-- تفعيل RLS
ALTER TABLE lawsuit_documents ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: يمكن للمستخدمين في نفس الشركة قراءة المستندات
CREATE POLICY "Users can view lawsuit documents from their company"
  ON lawsuit_documents
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- سياسة الإدراج: يمكن للمستخدمين في نفس الشركة إضافة مستندات
CREATE POLICY "Users can insert lawsuit documents for their company"
  ON lawsuit_documents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- سياسة التحديث: يمكن للمستخدمين في نفس الشركة تحديث المستندات
CREATE POLICY "Users can update lawsuit documents from their company"
  ON lawsuit_documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- سياسة الحذف: يمكن للمستخدمين في نفس الشركة حذف المستندات
CREATE POLICY "Users can delete lawsuit documents from their company"
  ON lawsuit_documents
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_lawsuit_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lawsuit_documents_updated_at
  BEFORE UPDATE ON lawsuit_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_lawsuit_documents_updated_at();
