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
