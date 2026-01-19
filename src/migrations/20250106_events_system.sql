-- Migration: Events System Tables
-- تاريخ: 2025-11-06
-- الوصف: إنشاء جداول نظام الأحداث (Events)

-- ============================================
-- 1. جدول Events
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_company_id ON events(company_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- ============================================
-- 2. جدول Event Subscriptions (اختياري)
-- ============================================
CREATE TABLE IF NOT EXISTS event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  handler_name VARCHAR(255) NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_subscriptions_event_type ON event_subscriptions(event_type);
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_active ON event_subscriptions(is_active);

-- ============================================
-- 3. Function: Get recent events
-- ============================================
CREATE OR REPLACE FUNCTION get_recent_events(
  p_company_id UUID,
  p_event_type VARCHAR(100) DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  event_type VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id UUID,
  user_id UUID,
  data JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.event_type,
    e.entity_type,
    e.entity_id,
    e.user_id,
    e.data,
    e.created_at
  FROM events e
  WHERE e.company_id = p_company_id
    AND (p_event_type IS NULL OR e.event_type = p_event_type)
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Function: Clean old events (retention policy)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_events(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM events
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- تعليقات
-- ============================================
COMMENT ON TABLE events IS 'سجل جميع الأحداث في النظام للـ Event-Driven Architecture';
COMMENT ON TABLE event_subscriptions IS 'تسجيلات الاشتراك في الأحداث';

-- ============================================
-- نهاية Migration
-- ============================================

