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
