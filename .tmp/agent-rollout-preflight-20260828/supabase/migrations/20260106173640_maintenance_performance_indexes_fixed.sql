-- Performance Optimization: Vehicle Maintenance Indexes (Fixed column names)

-- vehicle_maintenance table indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_status ON vehicle_maintenance(company_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_scheduled_date ON vehicle_maintenance(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_priority ON vehicle_maintenance(priority);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_type ON vehicle_maintenance(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle_id ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_created_at ON vehicle_maintenance(created_at);

-- Fixed: completion_date -> completed_date
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_completed_date ON vehicle_maintenance(completed_date) WHERE completed_date IS NOT NULL;

-- Combined indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_status_priority ON vehicle_maintenance(company_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_scheduled_status ON vehicle_maintenance(company_id, scheduled_date, status)
  WHERE scheduled_date IS NOT NULL;

-- vehicles table indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_maintenance_date ON vehicles(last_maintenance_date) WHERE last_maintenance_date IS NOT NULL;;
