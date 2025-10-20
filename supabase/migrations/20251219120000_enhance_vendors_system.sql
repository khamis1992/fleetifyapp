-- =====================================================
-- VENDORS ENHANCEMENT MIGRATION
-- =====================================================
-- Description: Adds categories, contacts, documents, and performance tracking to vendors
-- Author: Claude Code
-- Date: 2025-10-19
-- Version: 1.0
-- =====================================================

-- =====================================================
-- TABLE 1: vendor_categories
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL,
  category_name_ar VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT vendor_categories_unique_name_per_company UNIQUE (company_id, category_name)
);

-- Indexes
CREATE INDEX idx_vendor_categories_company ON vendor_categories(company_id);
CREATE INDEX idx_vendor_categories_active ON vendor_categories(company_id, is_active);

-- RLS Policies
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor categories in their company"
  ON vendor_categories FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create vendor categories in their company"
  ON vendor_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vendor categories in their company"
  ON vendor_categories FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vendor categories in their company"
  ON vendor_categories FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_vendor_categories_updated_at
  BEFORE UPDATE ON vendor_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE 2: vendor_contacts
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_vendor_contacts_vendor ON vendor_contacts(vendor_id);
CREATE INDEX idx_vendor_contacts_company ON vendor_contacts(company_id);
CREATE INDEX idx_vendor_contacts_primary ON vendor_contacts(vendor_id, is_primary);

-- RLS Policies
ALTER TABLE vendor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor contacts in their company"
  ON vendor_contacts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create vendor contacts in their company"
  ON vendor_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vendor contacts in their company"
  ON vendor_contacts FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vendor contacts in their company"
  ON vendor_contacts FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_vendor_contacts_updated_at
  BEFORE UPDATE ON vendor_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE 3: vendor_documents
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- 'license', 'certificate', 'contract', 'tax_registration', 'other'
  document_name VARCHAR(255) NOT NULL,
  document_url TEXT NOT NULL,
  file_size BIGINT, -- in bytes
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_vendor_documents_vendor ON vendor_documents(vendor_id);
CREATE INDEX idx_vendor_documents_company ON vendor_documents(company_id);
CREATE INDEX idx_vendor_documents_expiry ON vendor_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_vendor_documents_type ON vendor_documents(vendor_id, document_type);

-- RLS Policies
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor documents in their company"
  ON vendor_documents FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create vendor documents in their company"
  ON vendor_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vendor documents in their company"
  ON vendor_documents FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vendor documents in their company"
  ON vendor_documents FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_vendor_documents_updated_at
  BEFORE UPDATE ON vendor_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE 4: vendor_performance
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5), -- 0.00 to 5.00
  on_time_delivery_rate DECIMAL(5, 2) CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 100), -- Percentage
  quality_score DECIMAL(5, 2) CHECK (quality_score >= 0 AND quality_score <= 100), -- Percentage
  response_time_hours DECIMAL(10, 2), -- Average response time in hours
  notes TEXT,
  measured_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_vendor_performance_vendor ON vendor_performance(vendor_id);
CREATE INDEX idx_vendor_performance_company ON vendor_performance(company_id);
CREATE INDEX idx_vendor_performance_rating ON vendor_performance(rating DESC);
CREATE INDEX idx_vendor_performance_measured_at ON vendor_performance(measured_at DESC);

-- RLS Policies
ALTER TABLE vendor_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor performance in their company"
  ON vendor_performance FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create vendor performance in their company"
  ON vendor_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vendor performance in their company"
  ON vendor_performance FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vendor performance in their company"
  ON vendor_performance FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_vendor_performance_updated_at
  BEFORE UPDATE ON vendor_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ALTER vendors TABLE - Add category_id
-- =====================================================
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES vendor_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category_id);

-- =====================================================
-- VIEW: top_rated_vendors
-- =====================================================
CREATE OR REPLACE VIEW top_rated_vendors AS
SELECT
  v.id,
  v.company_id,
  v.vendor_code,
  v.vendor_name,
  v.vendor_name_ar,
  vc.category_name,
  vc.category_name_ar,
  vp.rating,
  vp.on_time_delivery_rate,
  vp.quality_score,
  vp.response_time_hours,
  vp.measured_at,
  ROW_NUMBER() OVER (PARTITION BY v.company_id ORDER BY vp.rating DESC NULLS LAST) as rank_by_rating
FROM vendors v
LEFT JOIN vendor_categories vc ON v.category_id = vc.id
LEFT JOIN LATERAL (
  SELECT DISTINCT ON (vendor_id) *
  FROM vendor_performance
  WHERE vendor_id = v.id
  ORDER BY vendor_id, measured_at DESC
) vp ON v.id = vp.vendor_id
WHERE v.is_active = true;

-- Grant access to view
GRANT SELECT ON top_rated_vendors TO authenticated;

-- RLS for view (inherits from base tables)
ALTER VIEW top_rated_vendors SET (security_invoker = true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE vendor_categories IS 'Categorizes vendors (e.g., Office Supplies, IT Services, Construction)';
COMMENT ON TABLE vendor_contacts IS 'Stores multiple contact persons for each vendor';
COMMENT ON TABLE vendor_documents IS 'Stores vendor-related documents (licenses, certificates, contracts)';
COMMENT ON TABLE vendor_performance IS 'Tracks vendor performance metrics over time';
COMMENT ON VIEW top_rated_vendors IS 'View of top-rated vendors by company with latest performance metrics';
COMMENT ON COLUMN vendors.category_id IS 'Links vendor to a category for better organization';
