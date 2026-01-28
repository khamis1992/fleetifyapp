-- Migration: Contract Status Improvements
-- تحسينات شاملة لحالات العقود

-- 1. إضافة حقل sub_status للحالات الفرعية
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS sub_status TEXT;

COMMENT ON COLUMN contracts.sub_status IS 'الحالة الفرعية للعقد: pending_data, pending_approval, pending_signature, pending_payment, zero_amount, test_contract';

-- 2. إنشاء جدول العلامات (Tags)
CREATE TABLE IF NOT EXISTS contract_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  color TEXT NOT NULL DEFAULT 'gray',
  icon TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, company_id)
);

COMMENT ON TABLE contract_tags IS 'علامات العقود للتصنيف المرن';

-- 3. إنشاء جدول ربط العقود بالعلامات
CREATE TABLE IF NOT EXISTS contract_tag_assignments (
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES contract_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (contract_id, tag_id)
);

COMMENT ON TABLE contract_tag_assignments IS 'ربط العقود بالعلامات';

-- 4. إضافة indexes للأداء
CREATE INDEX IF NOT EXISTS idx_contracts_sub_status ON contracts(sub_status) WHERE sub_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contract_tags_company ON contract_tags(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_tag_assignments_contract ON contract_tag_assignments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_tag_assignments_tag ON contract_tag_assignments(tag_id);

-- 5. إنشاء علامات افتراضية (سيتم إضافتها لكل شركة عند الحاجة)
-- يمكن تشغيل هذا يدوياً لشركة معينة:
-- INSERT INTO contract_tags (name, name_ar, color, icon, company_id) VALUES
--   ('zero_amount', 'قيمة صفرية', 'orange', 'alert-triangle', 'COMPANY_ID'),
--   ('needs_review', 'يحتاج مراجعة', 'yellow', 'eye', 'COMPANY_ID'),
--   ('test_contract', 'عقد اختباري', 'purple', 'test-tube', 'COMPANY_ID'),
--   ('pending_data', 'بانتظار بيانات', 'blue', 'clock', 'COMPANY_ID'),
--   ('high_priority', 'أولوية عالية', 'red', 'flag', 'COMPANY_ID');

-- 6. RLS Policies
ALTER TABLE contract_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tags for their company
CREATE POLICY "Users can view tags for their company"
  ON contract_tags FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can manage tags for their company
CREATE POLICY "Users can manage tags for their company"
  ON contract_tags FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can view tag assignments for contracts they can access
CREATE POLICY "Users can view tag assignments"
  ON contract_tag_assignments FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM contracts WHERE company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
        UNION
        SELECT company_id FROM employees WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can manage tag assignments for contracts they can access
CREATE POLICY "Users can manage tag assignments"
  ON contract_tag_assignments FOR ALL
  USING (
    contract_id IN (
      SELECT id FROM contracts WHERE company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
        UNION
        SELECT company_id FROM employees WHERE user_id = auth.uid()
      )
    )
  );

-- 7. Function to auto-tag contracts based on conditions
CREATE OR REPLACE FUNCTION auto_tag_contract()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_zero_amount_tag_id UUID;
  v_needs_review_tag_id UUID;
BEGIN
  -- Get company_id
  v_company_id := NEW.company_id;
  
  -- Get tag IDs (create if not exist)
  SELECT id INTO v_zero_amount_tag_id 
  FROM contract_tags 
  WHERE name = 'zero_amount' AND company_id = v_company_id;
  
  IF v_zero_amount_tag_id IS NULL THEN
    INSERT INTO contract_tags (name, name_ar, color, icon, company_id)
    VALUES ('zero_amount', 'قيمة صفرية', 'orange', 'alert-triangle', v_company_id)
    RETURNING id INTO v_zero_amount_tag_id;
  END IF;
  
  -- Auto-tag if zero amount
  IF (NEW.contract_amount = 0 OR NEW.contract_amount IS NULL) AND 
     (NEW.monthly_amount = 0 OR NEW.monthly_amount IS NULL) THEN
    INSERT INTO contract_tag_assignments (contract_id, tag_id)
    VALUES (NEW.id, v_zero_amount_tag_id)
    ON CONFLICT DO NOTHING;
    
    -- Set sub_status
    IF NEW.sub_status IS NULL THEN
      NEW.sub_status := 'zero_amount';
    END IF;
  ELSE
    -- Remove zero_amount tag if amounts are set
    DELETE FROM contract_tag_assignments 
    WHERE contract_id = NEW.id AND tag_id = v_zero_amount_tag_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-tagging
DROP TRIGGER IF NOT EXISTS trigger_auto_tag_contract ON contracts;
CREATE TRIGGER trigger_auto_tag_contract
  BEFORE INSERT OR UPDATE OF contract_amount, monthly_amount ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_tag_contract();
