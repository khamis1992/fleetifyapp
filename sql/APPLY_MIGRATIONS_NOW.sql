-- =====================================================
-- Learning Interactions Table for Continuous Learning System
-- Created: 2025-10-19
-- Description: Stores user interactions, feedback, and learning data for AI system improvement
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- LEARNING INTERACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS learning_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL,

  -- Query and Response Data
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  intent VARCHAR(100),

  -- User Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN,
  accurate BOOLEAN,
  relevant BOOLEAN,
  feedback_comments TEXT,

  -- Context Data (JSONB for flexibility)
  context_data JSONB DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "intent": "string",
  --   "entities": [],
  --   "complexity": 0-10,
  --   "urgency": "low|medium|high"
  -- }

  -- Performance Metrics
  response_time_ms INTEGER,
  confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sources_used JSONB DEFAULT '[]'::jsonb,
  cache_hit BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- LEARNING PATTERNS TABLE (Aggregated insights)
-- =====================================================
CREATE TABLE IF NOT EXISTS learning_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  pattern TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  success_rate DECIMAL(5,4) CHECK (success_rate >= 0 AND success_rate <= 1),
  average_rating DECIMAL(3,2),
  last_seen TIMESTAMP DEFAULT NOW(),
  category VARCHAR(50) CHECK (category IN ('intent', 'entity', 'response', 'error')),
  examples JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique patterns per company
  UNIQUE(company_id, pattern, category)
);

-- =====================================================
-- ADAPTIVE RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS adaptive_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  rule_condition TEXT NOT NULL,
  rule_action TEXT NOT NULL,
  confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  category VARCHAR(100),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Learning Interactions Indexes
CREATE INDEX idx_learning_interactions_company ON learning_interactions(company_id);
CREATE INDEX idx_learning_interactions_user ON learning_interactions(user_id);
CREATE INDEX idx_learning_interactions_session ON learning_interactions(session_id);
CREATE INDEX idx_learning_interactions_intent ON learning_interactions(intent);
CREATE INDEX idx_learning_interactions_created_at ON learning_interactions(created_at DESC);
CREATE INDEX idx_learning_interactions_rating ON learning_interactions(rating) WHERE rating IS NOT NULL;
CREATE INDEX idx_learning_interactions_helpful ON learning_interactions(helpful) WHERE helpful IS NOT NULL;

-- GIN index for JSONB columns
CREATE INDEX idx_learning_interactions_context_data ON learning_interactions USING GIN(context_data);
CREATE INDEX idx_learning_interactions_sources ON learning_interactions USING GIN(sources_used);

-- Learning Patterns Indexes
CREATE INDEX idx_learning_patterns_company ON learning_patterns(company_id);
CREATE INDEX idx_learning_patterns_category ON learning_patterns(category);
CREATE INDEX idx_learning_patterns_frequency ON learning_patterns(frequency DESC);
CREATE INDEX idx_learning_patterns_success_rate ON learning_patterns(success_rate DESC);

-- Adaptive Rules Indexes
CREATE INDEX idx_adaptive_rules_company ON adaptive_rules(company_id);
CREATE INDEX idx_adaptive_rules_active ON adaptive_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_adaptive_rules_priority ON adaptive_rules(priority DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE learning_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_rules ENABLE ROW LEVEL SECURITY;

-- Learning Interactions Policies
CREATE POLICY "Users can view their company's learning interactions"
  ON learning_interactions FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Users can insert learning interactions"
  ON learning_interactions FOR INSERT
  WITH CHECK (
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Users can update their own learning interactions"
  ON learning_interactions FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Admins can delete learning interactions"
  ON learning_interactions FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    (company_id = get_user_company(auth.uid()) AND
      has_role(auth.uid(), 'company_admin'::user_role))
  );

-- Learning Patterns Policies
CREATE POLICY "Users can view learning patterns"
  ON learning_patterns FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "System can manage learning patterns"
  ON learning_patterns FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    company_id = get_user_company(auth.uid())
  );

-- Adaptive Rules Policies
CREATE POLICY "Users can view adaptive rules"
  ON adaptive_rules FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    (company_id = get_user_company(auth.uid()) AND (
      has_role(auth.uid(), 'company_admin'::user_role) OR
      has_role(auth.uid(), 'manager'::user_role)
    ))
  );

CREATE POLICY "Admins can manage adaptive rules"
  ON adaptive_rules FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    (company_id = get_user_company(auth.uid()) AND
      has_role(auth.uid(), 'company_admin'::user_role))
  );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_learning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_learning_interactions_updated_at
  BEFORE UPDATE ON learning_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER trigger_learning_patterns_updated_at
  BEFORE UPDATE ON learning_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER trigger_adaptive_rules_updated_at
  BEFORE UPDATE ON adaptive_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to record a learning interaction
CREATE OR REPLACE FUNCTION record_learning_interaction(
  p_company_id UUID,
  p_user_id UUID,
  p_session_id VARCHAR,
  p_query TEXT,
  p_response TEXT,
  p_intent VARCHAR DEFAULT NULL,
  p_context_data JSONB DEFAULT '{}'::jsonb,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_confidence_score DECIMAL DEFAULT NULL,
  p_sources_used JSONB DEFAULT '[]'::jsonb,
  p_cache_hit BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_interaction_id UUID;
BEGIN
  INSERT INTO learning_interactions (
    company_id,
    user_id,
    session_id,
    query,
    response,
    intent,
    context_data,
    response_time_ms,
    confidence_score,
    sources_used,
    cache_hit
  ) VALUES (
    p_company_id,
    p_user_id,
    p_session_id,
    p_query,
    p_response,
    p_intent,
    p_context_data,
    p_response_time_ms,
    p_confidence_score,
    p_sources_used,
    p_cache_hit
  ) RETURNING id INTO v_interaction_id;

  RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update feedback on an interaction
CREATE OR REPLACE FUNCTION update_interaction_feedback(
  p_interaction_id UUID,
  p_rating INTEGER DEFAULT NULL,
  p_helpful BOOLEAN DEFAULT NULL,
  p_accurate BOOLEAN DEFAULT NULL,
  p_relevant BOOLEAN DEFAULT NULL,
  p_comments TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE learning_interactions
  SET
    rating = COALESCE(p_rating, rating),
    helpful = COALESCE(p_helpful, helpful),
    accurate = COALESCE(p_accurate, accurate),
    relevant = COALESCE(p_relevant, relevant),
    feedback_comments = COALESCE(p_comments, feedback_comments),
    updated_at = NOW()
  WHERE id = p_interaction_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get learning statistics
CREATE OR REPLACE FUNCTION get_learning_stats(
  p_company_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_interactions', COUNT(*),
    'average_rating', AVG(rating),
    'helpful_rate',
      COUNT(*) FILTER (WHERE helpful = TRUE)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE helpful IS NOT NULL), 0),
    'average_response_time', AVG(response_time_ms),
    'cache_hit_rate',
      COUNT(*) FILTER (WHERE cache_hit = TRUE)::DECIMAL / NULLIF(COUNT(*), 0),
    'top_intents', (
      SELECT json_agg(intent_data)
      FROM (
        SELECT intent, COUNT(*) as count
        FROM learning_interactions
        WHERE company_id = p_company_id
          AND created_at >= NOW() - (p_days || ' days')::INTERVAL
          AND intent IS NOT NULL
        GROUP BY intent
        ORDER BY count DESC
        LIMIT 10
      ) intent_data
    )
  ) INTO v_result
  FROM learning_interactions
  WHERE company_id = p_company_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE learning_interactions IS 'Stores all user interactions with the AI system for continuous learning and improvement';
COMMENT ON TABLE learning_patterns IS 'Aggregated patterns identified from learning interactions';
COMMENT ON TABLE adaptive_rules IS 'Dynamic rules learned from user behavior and feedback';

COMMENT ON COLUMN learning_interactions.context_data IS 'JSON containing intent, entities, complexity, and urgency';
COMMENT ON COLUMN learning_interactions.sources_used IS 'JSON array of sources referenced in the response';
COMMENT ON COLUMN learning_interactions.confidence_score IS 'AI confidence in the response (0-1)';

COMMENT ON FUNCTION record_learning_interaction IS 'Creates a new learning interaction record';
COMMENT ON FUNCTION update_interaction_feedback IS 'Updates user feedback for an existing interaction';
COMMENT ON FUNCTION get_learning_stats IS 'Retrieves aggregated learning statistics for a company';
-- =====================================================
-- Property Maintenance Table for Property Management System
-- Created: 2025-10-19
-- Description: Tracks maintenance requests, costs, and history for properties
--
-- IMPORTANT NOTES:
-- - This migration assumes the 'properties' table exists (created in earlier migrations)
-- - vendor_id, requested_by_user_id, requested_by_tenant_id are UUID fields without FK constraints
--   (Foreign keys can be added later when vendors and tenants tables are confirmed to exist)
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROPERTY MAINTENANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS property_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Maintenance Details
  maintenance_type VARCHAR(100) NOT NULL CHECK (maintenance_type IN (
    'routine', 'emergency', 'preventive', 'corrective', 'cosmetic', 'inspection', 'other'
  )),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'
  )),

  -- Financial Information
  estimated_cost DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'SAR',

  -- Scheduling
  requested_date TIMESTAMP DEFAULT NOW(),
  scheduled_date TIMESTAMP,
  completed_date TIMESTAMP,

  -- Assignment
  assigned_to VARCHAR(255), -- Vendor or technician name
  vendor_id UUID, -- Reference to vendor (vendors table to be created later)
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),

  -- Location within property
  location_details TEXT, -- e.g., "Unit 101, Kitchen", "Roof", "Common Area"

  -- Request Information
  requested_by_user_id UUID, -- Reference to auth.users
  requested_by_tenant_id UUID, -- Reference to tenants (if table exists)

  -- Additional Information
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of file URLs

  -- Tracking
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_interval VARCHAR(50), -- e.g., "monthly", "quarterly", "yearly"
  next_occurrence_date TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ADD MISSING COLUMNS (if table exists from previous migration)
-- =====================================================
DO $$ BEGIN
    -- Add vendor_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'property_maintenance'
        AND column_name = 'vendor_id'
    ) THEN
        ALTER TABLE property_maintenance ADD COLUMN vendor_id UUID;
    END IF;

    -- Add requested_by_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'property_maintenance'
        AND column_name = 'requested_by_user_id'
    ) THEN
        ALTER TABLE property_maintenance ADD COLUMN requested_by_user_id UUID;
    END IF;

    -- Add requested_by_tenant_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'property_maintenance'
        AND column_name = 'requested_by_tenant_id'
    ) THEN
        ALTER TABLE property_maintenance ADD COLUMN requested_by_tenant_id UUID;
    END IF;
END $$;

-- =====================================================
-- MAINTENANCE HISTORY TABLE (Audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS property_maintenance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_id UUID NOT NULL REFERENCES property_maintenance(id) ON DELETE CASCADE,

  -- Change tracking
  changed_by UUID,
  change_type VARCHAR(50) NOT NULL, -- e.g., 'status_change', 'cost_update', 'assignment'
  old_value TEXT,
  new_value TEXT,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Property Maintenance Indexes
CREATE INDEX IF NOT EXISTS idx_property_maintenance_company ON property_maintenance(company_id);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_property ON property_maintenance(property_id);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_status ON property_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_priority ON property_maintenance(priority);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_type ON property_maintenance(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_vendor ON property_maintenance(vendor_id);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_requested_by_user ON property_maintenance(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_requested_by_tenant ON property_maintenance(requested_by_tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_scheduled_date ON property_maintenance(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_completed_date ON property_maintenance(completed_date);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_created_at ON property_maintenance(created_at DESC);

-- GIN index for attachments JSONB
CREATE INDEX IF NOT EXISTS idx_property_maintenance_attachments ON property_maintenance USING GIN(attachments);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_property_maintenance_company_status ON property_maintenance(company_id, status);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_property_status ON property_maintenance(property_id, status);

-- History Indexes
CREATE INDEX IF NOT EXISTS idx_property_maintenance_history_maintenance ON property_maintenance_history(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_history_changed_by ON property_maintenance_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_history_created_at ON property_maintenance_history(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE property_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_maintenance_history ENABLE ROW LEVEL SECURITY;

-- Property Maintenance Policies
CREATE POLICY "Users can view their company's maintenance records"
  ON property_maintenance FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Users can insert maintenance records"
  ON property_maintenance FOR INSERT
  WITH CHECK (
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Users can update maintenance records"
  ON property_maintenance FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Admins can delete maintenance records"
  ON property_maintenance FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    (company_id = get_user_company(auth.uid()) AND
      has_role(auth.uid(), 'company_admin'::user_role))
  );

-- History Policies
CREATE POLICY "Users can view maintenance history"
  ON property_maintenance_history FOR SELECT
  USING (
    maintenance_id IN (
      SELECT id FROM property_maintenance
      WHERE has_role(auth.uid(), 'super_admin'::user_role) OR
            company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "System can insert maintenance history"
  ON property_maintenance_history FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_property_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_property_maintenance_updated_at
  BEFORE UPDATE ON property_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION update_property_maintenance_updated_at();

-- Track changes in history
CREATE OR REPLACE FUNCTION track_property_maintenance_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track status changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO property_maintenance_history (
      maintenance_id, changed_by, change_type, old_value, new_value
    ) VALUES (
      NEW.id, auth.uid(), 'status_change', OLD.status, NEW.status
    );
  END IF;

  -- Track cost changes
  IF (TG_OP = 'UPDATE' AND OLD.actual_cost IS DISTINCT FROM NEW.actual_cost) THEN
    INSERT INTO property_maintenance_history (
      maintenance_id, changed_by, change_type, old_value, new_value
    ) VALUES (
      NEW.id, auth.uid(), 'cost_update', OLD.actual_cost::TEXT, NEW.actual_cost::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_maintenance_changes
  AFTER UPDATE ON property_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION track_property_maintenance_changes();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate total maintenance costs for a property
CREATE OR REPLACE FUNCTION get_property_maintenance_costs(
  p_property_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NOW()
) RETURNS DECIMAL AS $$
DECLARE
  v_total_cost DECIMAL;
BEGIN
  SELECT COALESCE(SUM(actual_cost), 0)
  INTO v_total_cost
  FROM property_maintenance
  WHERE property_id = p_property_id
    AND status = 'completed'
    AND (p_start_date IS NULL OR completed_date >= p_start_date)
    AND completed_date <= p_end_date;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get maintenance statistics for a property
CREATE OR REPLACE FUNCTION get_property_maintenance_stats(
  p_property_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_requests', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'scheduled')),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'total_cost', COALESCE(SUM(actual_cost) FILTER (WHERE status = 'completed'), 0),
    'average_cost', COALESCE(AVG(actual_cost) FILTER (WHERE status = 'completed'), 0),
    'average_response_time',
      AVG(
        EXTRACT(EPOCH FROM (completed_date - requested_date)) / 86400
      ) FILTER (WHERE status = 'completed'),
    'by_type', (
      SELECT json_object_agg(maintenance_type, count)
      FROM (
        SELECT maintenance_type, COUNT(*) as count
        FROM property_maintenance
        WHERE property_id = p_property_id
          AND created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY maintenance_type
      ) types
    ),
    'by_priority', (
      SELECT json_object_agg(priority, count)
      FROM (
        SELECT priority, COUNT(*) as count
        FROM property_maintenance
        WHERE property_id = p_property_id
          AND created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY priority
      ) priorities
    )
  ) INTO v_result
  FROM property_maintenance
  WHERE property_id = p_property_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get maintenance statistics for entire company
CREATE OR REPLACE FUNCTION get_company_maintenance_stats(
  p_company_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_requests', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'scheduled')),
    'total_cost', COALESCE(SUM(actual_cost) FILTER (WHERE status = 'completed'), 0),
    'properties_with_maintenance', COUNT(DISTINCT property_id),
    'average_cost_per_property',
      COALESCE(SUM(actual_cost) FILTER (WHERE status = 'completed'), 0) /
      NULLIF(COUNT(DISTINCT property_id), 0)
  ) INTO v_result
  FROM property_maintenance
  WHERE company_id = p_company_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE property_maintenance IS 'Tracks all maintenance requests and work orders for properties';
COMMENT ON TABLE property_maintenance_history IS 'Audit trail of changes to maintenance records';

COMMENT ON COLUMN property_maintenance.maintenance_type IS 'Type of maintenance: routine, emergency, preventive, etc.';
COMMENT ON COLUMN property_maintenance.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN property_maintenance.status IS 'Current status: pending, scheduled, in_progress, completed, cancelled, on_hold';
COMMENT ON COLUMN property_maintenance.actual_cost IS 'Final cost of completed maintenance';
COMMENT ON COLUMN property_maintenance.attachments IS 'JSON array of attachment URLs (photos, invoices, reports)';

COMMENT ON FUNCTION get_property_maintenance_costs IS 'Calculate total maintenance costs for a property in a date range';
COMMENT ON FUNCTION get_property_maintenance_stats IS 'Get comprehensive maintenance statistics for a property';
COMMENT ON FUNCTION get_company_maintenance_stats IS 'Get company-wide maintenance statistics';
