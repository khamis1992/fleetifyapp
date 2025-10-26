-- ===============================================
-- Contract Amendment System Migration
-- ===============================================
-- Purpose: Enable modifying active contracts with full audit trail
-- Features: Change tracking, customer re-signature, approval workflow
-- Date: 2025-01-26
-- ===============================================

-- Step 1: Create contract_amendments table
CREATE TABLE IF NOT EXISTS public.contract_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    amendment_number TEXT NOT NULL,
    amendment_type TEXT NOT NULL CHECK (amendment_type IN (
        'extend_duration',      -- تمديد المدة
        'change_amount',        -- تعديل المبلغ
        'change_terms',         -- تعديل الشروط
        'change_vehicle',       -- تغيير المركبة
        'change_dates',         -- تعديل التواريخ
        'change_payment',       -- تعديل الدفعات
        'other'                 -- أخرى
    )),
    amendment_reason TEXT NOT NULL,
    
    -- Original values (before amendment)
    original_values JSONB NOT NULL,
    
    -- New values (after amendment)
    new_values JSONB NOT NULL,
    
    -- Changes summary for quick access
    changes_summary JSONB,
    
    -- Financial impact
    amount_difference NUMERIC(15, 3) DEFAULT 0,
    requires_payment_adjustment BOOLEAN DEFAULT false,
    
    -- Approval workflow
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',              -- قيد الانتظار
        'approved',             -- معتمد
        'rejected',             -- مرفوض
        'cancelled'             -- ملغي
    )),
    
    -- Who created this amendment
    created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    
    -- Approval details
    approved_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Rejection details
    rejected_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Customer signature (optional)
    requires_customer_signature BOOLEAN DEFAULT false,
    customer_signed BOOLEAN DEFAULT false,
    customer_signature_data TEXT,
    customer_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Company signature
    company_signature_data TEXT,
    company_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Effective date
    effective_date DATE,
    applied_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_amendment_number_per_company UNIQUE (company_id, amendment_number)
);

-- Step 2: Create amendment_change_log table for detailed tracking
CREATE TABLE IF NOT EXISTS public.amendment_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amendment_id UUID NOT NULL REFERENCES contract_amendments(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_label_ar TEXT,
    old_value TEXT,
    new_value TEXT,
    value_type TEXT, -- 'text', 'number', 'date', 'boolean', 'json'
    change_impact TEXT, -- 'low', 'medium', 'high', 'critical'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX idx_contract_amendments_contract ON contract_amendments(contract_id);
CREATE INDEX idx_contract_amendments_company ON contract_amendments(company_id);
CREATE INDEX idx_contract_amendments_status ON contract_amendments(status);
CREATE INDEX idx_contract_amendments_created_at ON contract_amendments(created_at DESC);
CREATE INDEX idx_contract_amendments_type ON contract_amendments(amendment_type);
CREATE INDEX idx_amendment_change_log_amendment ON amendment_change_log(amendment_id);

-- Step 4: Enable RLS
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE amendment_change_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view amendments from their company"
    ON contract_amendments FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Managers can create amendments"
    ON contract_amendments FOR INSERT
    WITH CHECK (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() 
            AND role IN ('company_admin', 'manager', 'super_admin')
        )
    );

CREATE POLICY "Managers can update amendments"
    ON contract_amendments FOR UPDATE
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() 
            AND role IN ('company_admin', 'manager', 'super_admin')
        )
    );

CREATE POLICY "Users can view change logs"
    ON amendment_change_log FOR SELECT
    USING (
        amendment_id IN (
            SELECT id FROM contract_amendments
            WHERE company_id IN (
                SELECT company_id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert change logs"
    ON amendment_change_log FOR INSERT
    WITH CHECK (true);

-- Step 6: Create function to generate amendment number
CREATE OR REPLACE FUNCTION generate_amendment_number(p_company_id UUID, p_contract_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_amendment_count INT;
    v_contract_number TEXT;
    v_amendment_number TEXT;
BEGIN
    -- Get contract number
    SELECT contract_number INTO v_contract_number
    FROM contracts
    WHERE id = p_contract_id;
    
    -- Count existing amendments for this contract
    SELECT COUNT(*) INTO v_amendment_count
    FROM contract_amendments
    WHERE contract_id = p_contract_id
    AND company_id = p_company_id;
    
    -- Generate amendment number: CONTRACT_NUMBER-AMD-XXX
    v_amendment_number := v_contract_number || '-AMD-' || LPAD((v_amendment_count + 1)::TEXT, 3, '0');
    
    RETURN v_amendment_number;
END;
$$;

-- Step 7: Create function to apply amendment
CREATE OR REPLACE FUNCTION apply_contract_amendment(p_amendment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_amendment RECORD;
    v_result JSONB;
    v_key TEXT;
    v_value TEXT;
BEGIN
    -- Get amendment details
    SELECT * INTO v_amendment
    FROM contract_amendments
    WHERE id = p_amendment_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Amendment not found'
        );
    END IF;
    
    -- Check if amendment is approved
    IF v_amendment.status != 'approved' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Amendment must be approved before applying'
        );
    END IF;
    
    -- Check if already applied
    IF v_amendment.applied_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Amendment already applied'
        );
    END IF;
    
    -- Apply changes to contract
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_amendment.new_values)
    LOOP
        -- Build dynamic update query
        EXECUTE format(
            'UPDATE contracts SET %I = $1, updated_at = NOW() WHERE id = $2',
            v_key
        ) USING v_value, v_amendment.contract_id;
    END LOOP;
    
    -- Mark amendment as applied
    UPDATE contract_amendments
    SET applied_at = NOW(),
        updated_at = NOW()
    WHERE id = p_amendment_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'contract_id', v_amendment.contract_id,
        'applied_at', NOW()
    );
END;
$$;

-- Step 8: Create function to track changes
CREATE OR REPLACE FUNCTION track_amendment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_old_key TEXT;
    v_old_value TEXT;
    v_new_value TEXT;
    v_field_labels JSONB;
BEGIN
    -- Field labels in Arabic
    v_field_labels := '{
        "start_date": "تاريخ البداية",
        "end_date": "تاريخ النهاية",
        "contract_amount": "مبلغ العقد",
        "monthly_amount": "المبلغ الشهري",
        "description": "الوصف",
        "terms": "الشروط والأحكام",
        "vehicle_id": "المركبة",
        "contract_type": "نوع العقد"
    }'::JSONB;
    
    -- Track each change
    FOR v_old_key IN SELECT key FROM jsonb_each_text(NEW.original_values)
    LOOP
        SELECT value INTO v_old_value 
        FROM jsonb_each_text(NEW.original_values) 
        WHERE key = v_old_key;
        
        SELECT value INTO v_new_value 
        FROM jsonb_each_text(NEW.new_values) 
        WHERE key = v_old_key;
        
        -- Only log if values are different
        IF v_old_value IS DISTINCT FROM v_new_value THEN
            INSERT INTO amendment_change_log (
                amendment_id,
                field_name,
                field_label_ar,
                old_value,
                new_value,
                value_type,
                change_impact
            ) VALUES (
                NEW.id,
                v_old_key,
                COALESCE(v_field_labels->>v_old_key, v_old_key),
                v_old_value,
                v_new_value,
                'text',
                CASE 
                    WHEN v_old_key IN ('contract_amount', 'monthly_amount') THEN 'high'
                    WHEN v_old_key IN ('start_date', 'end_date') THEN 'high'
                    WHEN v_old_key IN ('vehicle_id') THEN 'medium'
                    ELSE 'low'
                END
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Step 9: Create trigger for automatic change tracking
CREATE TRIGGER track_amendment_changes_trigger
    AFTER INSERT ON contract_amendments
    FOR EACH ROW
    EXECUTE FUNCTION track_amendment_changes();

-- Step 10: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_contract_amendments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER contract_amendments_updated_at
    BEFORE UPDATE ON contract_amendments
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_amendments_updated_at();

-- Step 11: Add comments
COMMENT ON TABLE contract_amendments IS 'Contract amendment system with audit trail and approval workflow';
COMMENT ON COLUMN contract_amendments.amendment_number IS 'Unique amendment number (CONTRACT_NUMBER-AMD-XXX)';
COMMENT ON COLUMN contract_amendments.original_values IS 'Original contract values before amendment (JSONB)';
COMMENT ON COLUMN contract_amendments.new_values IS 'New contract values after amendment (JSONB)';
COMMENT ON COLUMN contract_amendments.changes_summary IS 'Human-readable summary of changes';
COMMENT ON COLUMN contract_amendments.requires_customer_signature IS 'Whether customer must re-sign after amendment';
COMMENT ON TABLE amendment_change_log IS 'Detailed log of individual field changes in amendments';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Contract Amendment System created successfully';
    RAISE NOTICE '📋 Tables: contract_amendments, amendment_change_log';
    RAISE NOTICE '🔧 Functions: generate_amendment_number, apply_contract_amendment, track_amendment_changes';
    RAISE NOTICE '🔒 RLS policies enabled for company scoping';
END $$;
