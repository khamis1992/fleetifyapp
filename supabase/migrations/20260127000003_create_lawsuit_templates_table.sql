-- إنشاء جدول lawsuit_templates لتخزين بيانات القضايا
CREATE TABLE IF NOT EXISTS lawsuit_templates (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- معلومات الدعوى
    case_title TEXT NOT NULL,              -- عنوان الدعوى
    facts TEXT NOT NULL,                   -- الوقائع
    requests TEXT NOT NULL,                -- الطلبات

    -- المبالغ المالية
    claim_amount NUMERIC(15,2) NOT NULL,   -- قيمة المطالبة
    claim_amount_words TEXT,               -- المبلغ بالحروف

    -- معلومات المدعى عليه
    defendant_first_name TEXT NOT NULL,    -- اسم المدعى عليه الأول
    defendant_middle_name TEXT,            -- اسم المدعى عليه الأوسط
    defendant_last_name TEXT NOT NULL,     -- اسم المدعى عليه الأخير

    defendant_nationality TEXT,            -- جنسية المدعى عليه
    defendant_id_number TEXT,              -- رقم هوية المدعى عليه

    defendant_address TEXT,                -- عنوان المدعى عليه
    defendant_phone TEXT,                  -- هاتف المدعى عليه
    defendant_email TEXT,                  -- بريد المدعى عليه الإلكتروني

    -- معلومات إضافية (اختيارية)
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,  -- ربط بالعقد
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,  -- ربط بالعميل

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

-- سياسة القراءة: يمكن للمستخدمين قراءة بيانات شركتهم فقط
CREATE POLICY "Users can view their company lawsuit templates"
    ON lawsuit_templates
    FOR SELECT
    USING (
        company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    );

-- سياسة الإدراج: يمكن للمستخدمين إضافة بيانات لشركتهم فقط
CREATE POLICY "Users can insert lawsuit templates for their company"
    ON lawsuit_templates
    FOR INSERT
    WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    );

-- سياسة التحديث: يمكن للمستخدمين تحديث بيانات شركتهم فقط
CREATE POLICY "Users can update their company lawsuit templates"
    ON lawsuit_templates
    FOR UPDATE
    USING (
        company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    );

-- سياسة الحذف: يمكن للمستخدمين حذف بيانات شركتهم فقط
CREATE POLICY "Users can delete their company lawsuit templates"
    ON lawsuit_templates
    FOR DELETE
    USING (
        company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    );

-- إضافة تعليق على الجدول
COMMENT ON TABLE lawsuit_templates IS 'جدول لتخزين بيانات القضايا المُنشأة من نظام إدارة المتعثرات';
COMMENT ON COLUMN lawsuit_templates.case_title IS 'عنوان الدعوى القضائية';
COMMENT ON COLUMN lawsuit_templates.facts IS 'وقائع القضية بالتفصيل';
COMMENT ON COLUMN lawsuit_templates.requests IS 'طلبات المدعي في الدعوى';
COMMENT ON COLUMN lawsuit_templates.claim_amount IS 'قيمة المطالبة المالية بالريال القطري';
COMMENT ON COLUMN lawsuit_templates.claim_amount_words IS 'قيمة المطالبة بالكلمات العربية';
