
-- جدول مستندات الشركة القانونية الثابتة
CREATE TABLE IF NOT EXISTS company_legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    expiry_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تجهيز الدعاوى
CREATE TABLE IF NOT EXISTS lawsuit_preparations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    contract_id UUID,
    customer_id UUID,
    defendant_name VARCHAR(255) NOT NULL,
    defendant_id_number VARCHAR(50),
    defendant_type VARCHAR(20) DEFAULT 'natural_person',
    overdue_rent DECIMAL(12,2) DEFAULT 0,
    late_fees DECIMAL(12,2) DEFAULT 0,
    other_fees DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_in_words TEXT,
    case_title VARCHAR(100),
    facts_text TEXT,
    claims_text TEXT,
    explanatory_memo_url TEXT,
    claims_statement_url TEXT,
    contract_copy_url TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    taqadi_case_number VARCHAR(50),
    taqadi_reference_number VARCHAR(50),
    prepared_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ,
    prepared_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_company_legal_docs_company ON company_legal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_company_legal_docs_type ON company_legal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_lawsuit_preparations_company ON lawsuit_preparations(company_id);
CREATE INDEX IF NOT EXISTS idx_lawsuit_preparations_status ON lawsuit_preparations(status);
;
