-- إنشاء جدول مهام التدقيق على بيانات العملاء
-- يستخدم لإرسال مهام للموظفين للتحقق من بيانات العميل قبل رفع دعوى

CREATE TABLE IF NOT EXISTS customer_verification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- الموظف المكلف بالتدقيق
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  
  -- حالة المهمة
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'verified', 'rejected')),
  
  -- بيانات التدقيق
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  verifier_name TEXT, -- اسم الموظف الذي دقق
  
  -- ملاحظات
  notes TEXT,
  rejection_reason TEXT,
  
  -- التواريخ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_verification_tasks_company ON customer_verification_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_verification_tasks_customer ON customer_verification_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_verification_tasks_contract ON customer_verification_tasks(contract_id);
CREATE INDEX IF NOT EXISTS idx_verification_tasks_assigned_to ON customer_verification_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_verification_tasks_status ON customer_verification_tasks(status);

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_verification_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_verification_tasks_updated_at ON customer_verification_tasks;
CREATE TRIGGER trigger_update_verification_tasks_updated_at
  BEFORE UPDATE ON customer_verification_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_tasks_updated_at();

-- صلاحيات RLS
ALTER TABLE customer_verification_tasks ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الموظفون يمكنهم رؤية المهام المكلفين بها أو التي أنشأوها أو في نفس الشركة
-- ملاحظة: نستخدم profiles.user_id للمقارنة مع auth.uid()
CREATE POLICY "Users can view their verification tasks"
  ON customer_verification_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND (
        profiles.id = customer_verification_tasks.assigned_to 
        OR profiles.id = customer_verification_tasks.assigned_by
        OR profiles.company_id = customer_verification_tasks.company_id
      )
    )
  );

-- سياسة الإنشاء: أي موظف في الشركة يمكنه إنشاء مهمة
CREATE POLICY "Company users can create verification tasks"
  ON customer_verification_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id = customer_verification_tasks.company_id
    )
  );

-- سياسة التحديث: الموظف المكلف أو المنشئ يمكنه التحديث
CREATE POLICY "Assigned users can update verification tasks"
  ON customer_verification_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND (
        profiles.id = customer_verification_tasks.assigned_to 
        OR profiles.id = customer_verification_tasks.assigned_by
      )
    )
  );

-- تعليق
COMMENT ON TABLE customer_verification_tasks IS 'مهام التدقيق على بيانات العملاء قبل رفع الدعاوى';
