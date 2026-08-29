-- ============================================================================
-- بيانات التقاضي للقضية (المرحلة 2): استراتيجية الإنهاء/الفسخ، الإنذارات
-- الموثقة، مصاريف الأضرار بسند مستند، حيازة المركبة، وديعة الضمان، وأجر المثل.
--
-- القاعدة الملزمة: لا يُحفظ ولا تُطالب أي معلومة قانونية إلا بمصدرها ومستند
-- مؤيد لها؛ وكل تاريخ إما مؤكد أو مطلوب إثباته قضائيًا.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) الملف التقاضي للعقد (سجل واحد لكل عقد)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_case_litigation_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    -- يُربط بالقضية بعد قيدها؛ يبقى NULL خلال مرحلة التجهيز
    case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,

    -- استراتيجية الفسخ:
    -- judicial_rescission   : فسخ قضائي (م183) مع اعتبار الإعلان إعذارًا
    -- documented_termination: إنهاء موثق بالمستندات وإثبات انتهائه من تاريخه
    rescission_strategy TEXT NOT NULL DEFAULT 'judicial_rescission'
        CHECK (rescission_strategy IN ('judicial_rescission', 'documented_termination')),

    -- نوع الإنهاء المحفوظ: انتهاء مدة / إلغاء موثق / فسخ قضائي
    termination_type TEXT
        CHECK (termination_type IN ('contract_expired', 'documented_cancellation', 'judicial_rescission')),
    termination_date DATE,
    -- مصدر التاريخ: سجل النظام / إدخال يدوي / مستند رسمي / حكم قضائي
    termination_date_source TEXT
        CHECK (termination_date_source IN ('system_record', 'manual_entry', 'official_document', 'court_ruling')),
    -- هل التاريخ مؤكد أم مطلوب إثباته قضائيًا
    termination_date_status TEXT NOT NULL DEFAULT 'requires_judicial_proof'
        CHECK (termination_date_status IN ('confirmed', 'requires_judicial_proof')),
    termination_supporting_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,

    -- وقائع التسليم: محضر تسليم موقع وتاريخه
    delivery_handover_date DATE,
    delivery_handover_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,

    -- حيازة المركبة وتاريخ الاسترداد الفعلي
    vehicle_custody TEXT NOT NULL DEFAULT 'unknown'
        CHECK (vehicle_custody IN ('with_defendant', 'returned', 'unknown')),
    vehicle_returned_at DATE,

    -- وديعة الضمان (لقطة للقضية) وهل تُخصم في التسوية
    security_deposit_amount NUMERIC(14, 2) CHECK (security_deposit_amount IS NULL OR security_deposit_amount >= 0),
    apply_security_deposit BOOLEAN NOT NULL DEFAULT false,

    -- تعويض الاحتباس: أجر المثل اليومي ومصدره الموثق
    retention_daily_rate NUMERIC(14, 2) CHECK (retention_daily_rate IS NULL OR retention_daily_rate > 0),
    retention_rate_source TEXT
        CHECK (retention_rate_source IN ('company_price_list', 'market_quotes', 'recent_contracts')),
    retention_rate_source_ref TEXT,

    notes TEXT,

    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_litigation_profile_company_contract UNIQUE (company_id, contract_id),
    -- لا إنهاء موثق دون تاريخ ومستند مؤيد وحالة "مؤكد"
    CONSTRAINT chk_documented_termination_requires_evidence CHECK (
        rescission_strategy = 'judicial_rescission'
        OR (
            termination_type IS NOT NULL
            AND termination_date IS NOT NULL
            AND termination_supporting_document_id IS NOT NULL
            AND termination_date_status = 'confirmed'
        )
    ),
    -- محضر التسليم المؤيد يتطلب تاريخًا مسجلًا
    CONSTRAINT chk_handover_document_requires_date CHECK (
        delivery_handover_document_id IS NULL OR delivery_handover_date IS NOT NULL
    ),
    -- الاسترداد المعلن يتطلب تاريخ استرداد فعلي
    CONSTRAINT chk_returned_vehicle_requires_date CHECK (
        vehicle_custody <> 'returned' OR vehicle_returned_at IS NOT NULL
    ),
    -- أجر المثل دون مصدر مرفوض
    CONSTRAINT chk_retention_rate_requires_source CHECK (
        retention_daily_rate IS NULL OR retention_rate_source IS NOT NULL
    )
);

-- ---------------------------------------------------------------------------
-- 2) الإنذارات والمطالبات السابقة الموثقة (مختلفة عن reminder_history الآلي:
--    هنا فقط ما هو كتابي رسمي مثبت الوصول بمستند)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_case_formal_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,

    notice_type TEXT NOT NULL
        CHECK (notice_type IN ('payment_demand', 'vehicle_return_demand', 'termination_notice')),
    sent_on DATE NOT NULL,
    delivery_method TEXT NOT NULL
        CHECK (delivery_method IN ('registered_mail', 'email', 'national_address', 'courier', 'whatsapp', 'other')),
    delivered_on DATE,
    delivery_confirmed BOOLEAN NOT NULL DEFAULT false,
    grace_period_days INTEGER CHECK (grace_period_days IS NULL OR grace_period_days > 0),

    proof_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,
    notes TEXT,

    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_confirmed_delivery_requires_date CHECK (
        delivery_confirmed = false OR delivered_on IS NOT NULL
    )
);

-- ---------------------------------------------------------------------------
-- 3) مصاريف الأضرار الثابتة بسند مستند (تُدرج في المذكرة عند اكتمالها فقط)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_case_damage_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,

    cost_type TEXT NOT NULL
        CHECK (cost_type IN (
            'recovery_towing',
            'non_standard_repairs',
            'parts_insurance_burden',
            'inspection_transport_storage',
            'other'
        )),
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    cost_date DATE,

    evidence_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,
    evidence_url TEXT,
    -- لا يُدرج البند في المطالبة إلا بعد تحقق المستخدم من وجود المستند المؤيد
    verified BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,

    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_damage_cost_has_evidence CHECK (
        evidence_document_id IS NOT NULL OR evidence_url IS NOT NULL
    )
);

-- ---------------------------------------------------------------------------
-- الفهارس
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_litigation_profile_company ON legal_case_litigation_profile(company_id);
CREATE INDEX IF NOT EXISTS idx_litigation_profile_contract ON legal_case_litigation_profile(contract_id);
CREATE INDEX IF NOT EXISTS idx_litigation_profile_case ON legal_case_litigation_profile(case_id) WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_formal_notices_company ON legal_case_formal_notices(company_id);
CREATE INDEX IF NOT EXISTS idx_formal_notices_contract ON legal_case_formal_notices(contract_id);
CREATE INDEX IF NOT EXISTS idx_formal_notices_sent ON legal_case_formal_notices(sent_on DESC);

CREATE INDEX IF NOT EXISTS idx_damage_costs_company ON legal_case_damage_costs(company_id);
CREATE INDEX IF NOT EXISTS idx_damage_costs_contract ON legal_case_damage_costs(contract_id);
-- بنود جاهزة للإدراج في المطالبة فقط
CREATE INDEX IF NOT EXISTS idx_damage_costs_verified ON legal_case_damage_costs(contract_id) WHERE verified = true;

-- ---------------------------------------------------------------------------
-- تحديث updated_at تلقائيًا
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_litigation_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_formal_notices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_damage_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_litigation_profile_updated_at ON public.legal_case_litigation_profile;
CREATE TRIGGER trg_litigation_profile_updated_at
    BEFORE UPDATE ON public.legal_case_litigation_profile
    FOR EACH ROW EXECUTE FUNCTION public.update_litigation_profile_updated_at();

DROP TRIGGER IF EXISTS trg_formal_notices_updated_at ON public.legal_case_formal_notices;
CREATE TRIGGER trg_formal_notices_updated_at
    BEFORE UPDATE ON public.legal_case_formal_notices
    FOR EACH ROW EXECUTE FUNCTION public.update_formal_notices_updated_at();

DROP TRIGGER IF EXISTS trg_damage_costs_updated_at ON public.legal_case_damage_costs;
CREATE TRIGGER trg_damage_costs_updated_at
    BEFORE UPDATE ON public.legal_case_damage_costs
    FOR EACH ROW EXECUTE FUNCTION public.update_damage_costs_updated_at();

-- ---------------------------------------------------------------------------
-- تفعيل RLS والسياسات (عزل الشركة)
-- ---------------------------------------------------------------------------
ALTER TABLE public.legal_case_litigation_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_formal_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_damage_costs ENABLE ROW LEVEL SECURITY;

-- الملف التقاضي
DROP POLICY IF EXISTS "Users can view litigation profiles from their company" ON public.legal_case_litigation_profile;
CREATE POLICY "Users can view litigation profiles from their company"
    ON public.legal_case_litigation_profile FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create litigation profiles for their company" ON public.legal_case_litigation_profile;
CREATE POLICY "Users can create litigation profiles for their company"
    ON public.legal_case_litigation_profile FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update litigation profiles from their company" ON public.legal_case_litigation_profile;
CREATE POLICY "Users can update litigation profiles from their company"
    ON public.legal_case_litigation_profile FOR UPDATE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete litigation profiles from their company" ON public.legal_case_litigation_profile;
CREATE POLICY "Users can delete litigation profiles from their company"
    ON public.legal_case_litigation_profile FOR DELETE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- الإنذارات الموثقة
DROP POLICY IF EXISTS "Users can view formal notices from their company" ON public.legal_case_formal_notices;
CREATE POLICY "Users can view formal notices from their company"
    ON public.legal_case_formal_notices FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create formal notices for their company" ON public.legal_case_formal_notices;
CREATE POLICY "Users can create formal notices for their company"
    ON public.legal_case_formal_notices FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update formal notices from their company" ON public.legal_case_formal_notices;
CREATE POLICY "Users can update formal notices from their company"
    ON public.legal_case_formal_notices FOR UPDATE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete formal notices from their company" ON public.legal_case_formal_notices;
CREATE POLICY "Users can delete formal notices from their company"
    ON public.legal_case_formal_notices FOR DELETE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- مصاريف الأضرار
DROP POLICY IF EXISTS "Users can view damage costs from their company" ON public.legal_case_damage_costs;
CREATE POLICY "Users can view damage costs from their company"
    ON public.legal_case_damage_costs FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create damage costs for their company" ON public.legal_case_damage_costs;
CREATE POLICY "Users can create damage costs for their company"
    ON public.legal_case_damage_costs FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update damage costs from their company" ON public.legal_case_damage_costs;
CREATE POLICY "Users can update damage costs from their company"
    ON public.legal_case_damage_costs FOR UPDATE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete damage costs from their company" ON public.legal_case_damage_costs;
CREATE POLICY "Users can delete damage costs from their company"
    ON public.legal_case_damage_costs FOR DELETE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- توثيق الجداول
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.legal_case_litigation_profile IS 'الملف التقاضي لكل عقد: استراتيجية الفسخ، تاريخ الإنهاء ونوعه ومصدره وثوقيته، محضر التسليم، حيازة المركبة واستردادها، وديعة الضمان، وأجر المثل ومصدره - لا بيانات بلا مستند';
COMMENT ON TABLE public.legal_case_formal_notices IS 'الإنذارات والمطالبات الرسمية الموثقة بإثبات وصول (كتابية مثبتة)، مغايرة لإشعارات reminder_history الآلية';
COMMENT ON TABLE public.legal_case_damage_costs IS 'بنود مصاريف الأضرار (سحب/إصلاحات/قطع غيار/فحص ونقل وتخزين/أخرى) كل بند بسند مستند ولا يدخل المطالبة إلا بعد التحقق';
