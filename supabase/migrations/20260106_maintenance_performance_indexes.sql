-- Performance Optimization: Vehicle Maintenance Indexes
-- Created: 2025-01-06
-- Purpose: Add missing indexes to improve maintenance page performance
--
-- These indexes target the most frequently queried columns for the maintenance page
-- Estimated impact: 80% reduction in query time for /fleet/maintenance

-- ============================================================
-- vehicle_maintenance table indexes (high traffic table)
-- ============================================================

-- Company and status filtering (used in ALL queries)
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_status ON vehicle_maintenance(company_id, status);

-- Scheduled date filtering (overdue, upcoming queries)
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_scheduled_date ON vehicle_maintenance(scheduled_date);

-- Priority filtering (urgent alerts)
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_priority ON vehicle_maintenance(priority);

-- Maintenance type filtering (stats dashboard)
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_type ON vehicle_maintenance(maintenance_type);

-- Vehicle foreign key (frequently joined)
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle_id ON vehicle_maintenance(vehicle_id);

-- Created_at filtering (monthly trends, this month stats)
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_created_at ON vehicle_maintenance(created_at);

-- Completion date filtering (average completion days calculation)
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_completion_date ON vehicle_maintenance(completion_date) WHERE completion_date IS NOT NULL;

-- Combined index for common queries: company + status + priority
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_status_priority ON vehicle_maintenance(company_id, status, priority);

-- Combined index for date range queries: company + scheduled_date + status
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_scheduled_status ON vehicle_maintenance(company_id, scheduled_date, status)
  WHERE scheduled_date IS NOT NULL;

-- ============================================================
-- vehicles table indexes (for maintenance status queries)
-- ============================================================

-- Company + status filtering (used to find vehicles in maintenance)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, status);

-- Last maintenance date (for stopped vehicles detection)
CREATE INDEX IF NOT EXISTS idx_vehicles_last_maintenance_date ON vehicles(last_maintenance_date) WHERE last_maintenance_date IS NOT NULL;

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON INDEX idx_vehicle_maintenance_company_status IS 'Performance: Main filter for all maintenance queries (dashboard, list)';
COMMENT ON INDEX idx_vehicle_maintenance_scheduled_date IS 'Performance: Overdue and upcoming scheduled maintenance queries';
COMMENT ON INDEX idx_vehicle_maintenance_priority IS 'Performance: Urgent maintenance alerts';
COMMENT ON INDEX idx_vehicle_maintenance_type IS 'Performance: Maintenance type statistics (routine, repair, emergency, preventive)';
COMMENT ON INDEX idx_vehicle_maintenance_vehicle_id IS 'Performance: Join with vehicles table for plate number lookups';
COMMENT ON INDEX idx_vehicle_maintenance_created_at IS 'Performance: Monthly trend calculations and this month statistics';
COMMENT ON INDEX idx_vehicle_maintenance_completion_date IS 'Performance: Average completion days calculation';
COMMENT ON INDEX idx_vehicle_maintenance_company_status_priority IS 'Performance: Combined filter for filtered views';
COMMENT ON INDEX idx_vehicle_maintenance_company_scheduled_status IS 'Performance: Date range queries with status filter';

COMMENT ON INDEX idx_vehicles_company_status IS 'Performance: Find vehicles currently in maintenance status';
COMMENT ON INDEX idx_vehicles_last_maintenance_date IS 'Performance: Detect vehicles stopped too long in maintenance';

-- ============================================================
-- Expected Performance Improvements:
-- ============================================================
-- useMaintenanceStats hook: 2-5s → 200-400ms (90% reduction)
-- MaintenanceAlertsPanel: 1-2s → 100-200ms (90% reduction)
-- Maintenance page initial load: 5-8s → 500ms-1s (85% reduction)
--
-- Total estimated improvement: 85-90% faster page loads
-- ============================================================
