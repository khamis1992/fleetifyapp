-- إنشاء جدول رئيسي شامل للنصوص القانونية في دولة قطر
CREATE TABLE IF NOT EXISTS qatar_legal_texts (
    id              BIGSERIAL PRIMARY KEY,
    law_type        VARCHAR(50) NOT NULL,          -- 'constitution', 'law', 'decree', 'regulation'
    law_number      VARCHAR(50),                   -- رقم القانون
    year            INTEGER,                       -- سنة الإصدار
    title_ar        TEXT NOT NULL,                 -- اسم القانون بالعربي
    title_en        TEXT,                          -- الاسم بالإنجليزي
    part_number     VARCHAR(20),                   -- رقم الباب
    part_title      TEXT,                          -- عنوان الباب
    chapter_number  VARCHAR(20),                   -- رقم الفصل
    chapter_title   TEXT,                          -- عنوان الفصل
    article_number  VARCHAR(50),                   -- رقم المادة
    article_title_ar TEXT,                         -- عنوان المادة
    article_text_ar  TEXT NOT NULL,                -- نص المادة بالعربي
    article_text_en  TEXT,                         -- نص المادة بالإنجليزي
    keywords        TEXT[],                        -- كلمات مفتاحية للبحث
    is_active       BOOLEAN DEFAULT TRUE,          -- هل النص ساري؟
    source_url      TEXT,                          -- رابط المصدر الرسمي
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_qlt_law_type ON qatar_legal_texts(law_type);
CREATE INDEX IF NOT EXISTS idx_qlt_law_number ON qatar_legal_texts(law_number);
CREATE INDEX IF NOT EXISTS idx_qlt_article ON qatar_legal_texts(article_number);
CREATE INDEX IF NOT EXISTS idx_qlt_year ON qatar_legal_texts(year);
CREATE INDEX IF NOT EXISTS idx_qlt_keywords ON qatar_legal_texts USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_qlt_text_search ON qatar_legal_texts USING GIN(to_tsvector('arabic', article_text_ar));

-- تريغر لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_qatar_legal_texts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_qlt_timestamp ON qatar_legal_texts;
CREATE TRIGGER trigger_update_qlt_timestamp
BEFORE UPDATE ON qatar_legal_texts
FOR EACH ROW
EXECUTE FUNCTION update_qatar_legal_texts_timestamp();

-- تفعيل RLS مع سياسة قراءة عامة
ALTER TABLE qatar_legal_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qatar_legal_texts_public_read" ON qatar_legal_texts
  FOR SELECT USING (true);;
