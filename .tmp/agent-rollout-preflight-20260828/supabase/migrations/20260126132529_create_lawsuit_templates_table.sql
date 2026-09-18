-- إنشاء جدول lawsuit_templates لتخزين بيانات القضايا
CREATE TABLE IF NOT EXISTS lawsuit_templates (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- معلومات الدعوى
    case_title TEXT NOT NULL,
    facts TEXT NOT NULL,
    requests TEXT NOT NULL,

    -- المبالغ المالية
    claim_amount NUMERIC(15,2) NOT NULL,
    claim_amount_words TEXT,

    -- معلومات المدعى عليه
    defendant_first_name TEXT NOT NULL,
    defendant_middle_name TEXT,
    defendant_last_name TEXT NOT NULL,

    defendant_nationality TEXT,
    defendant_id_number TEXT,

    defendant_address TEXT,
    defendant_phone TEXT,
    defendant_email TEXT,

    -- معلومات إضافية
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- التواريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_company_id ON lawsuit_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_contract_id ON lawsuit_templates(contract_id);
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_customer_id ON lawsuit_templates(customer_id);
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_created_at ON lawsuit_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_defendant_id ON lawsuit_templates(defendant_id_number);

-- إنشاء trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_lawsuit_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lawsuit_templates_updated_at ON lawsuit_templates;
CREATE TRIGGER trigger_update_lawsuit_templates_updated_at
    BEFORE UPDATE ON lawsuit_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_lawsuit_templates_updated_at();

-- إضافة RLS (Row Level Security)
ALTER TABLE lawsuit_templates ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة
CREATE POLICY "Users can view their company lawsuit templates"
    ON lawsuit_templates
    FOR SELECT
    USING (
        company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    );

-- سياسة الإدراج
CREATE POLICY "Users can insert lawsuit templates for their company"
    ON lawsuit_templates
    FOR INSERT
    WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    );

-- سياسة التحديث
CREATE POLICY "Users can update their company lawsuit templates"
    ON lawsuit_templates
    FOR UPDATE
    USING (
        company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    );

-- سياسة الحذف
CREATE POLICY "Users can delete their company lawsuit templates"
    ON lawsuit_templates
    FOR DELETE
    USING (
        company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    );

-- إضافة تعليقات
COMMENT ON TABLE lawsuit_templates IS 'جدول لتخزين بيانات القضايا المُنشأة من نظام إدارة المتعثرات';;
