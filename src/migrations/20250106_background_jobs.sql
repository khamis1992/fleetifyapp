-- Migration: Background Jobs System
-- تاريخ: 2025-11-06
-- الوصف: إنشاء جداول نظام الوظائف الخلفية (Background Jobs)

-- ============================================
-- 1. جدول Background Jobs
-- ============================================
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 200),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result JSONB,
  error TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_priority ON background_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type ON background_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_background_jobs_company_id ON background_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_created_at ON background_jobs(created_at DESC);

-- ============================================
-- 2. Function: Get next job to process
-- ============================================
CREATE OR REPLACE FUNCTION get_next_job()
RETURNS TABLE(
  id UUID,
  name VARCHAR(255),
  job_type VARCHAR(100),
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.name,
    j.job_type,
    j.data
  FROM background_jobs j
  WHERE j.status = 'pending'
  ORDER BY j.priority DESC, j.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Function: Update job status
-- ============================================
CREATE OR REPLACE FUNCTION update_job_status(
  p_job_id UUID,
  p_status VARCHAR(20),
  p_progress INTEGER DEFAULT NULL,
  p_result JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE background_jobs
  SET 
    status = p_status,
    progress = COALESCE(p_progress, progress),
    result = COALESCE(p_result, result),
    error = COALESCE(p_error, error),
    started_at = CASE 
      WHEN p_status = 'running' AND started_at IS NULL 
      THEN NOW() 
      ELSE started_at 
    END,
    completed_at = CASE 
      WHEN p_status IN ('completed', 'failed', 'cancelled') 
      THEN NOW() 
      ELSE completed_at 
    END
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Function: Clean completed jobs
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_completed_jobs(
  p_retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM background_jobs
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- تعليقات
-- ============================================
COMMENT ON TABLE background_jobs IS 'وظائف الخلفية للعمليات الطويلة';

-- ============================================
-- نهاية Migration
-- ============================================

