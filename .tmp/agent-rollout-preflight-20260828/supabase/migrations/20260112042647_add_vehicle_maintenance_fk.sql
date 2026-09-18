
-- Add foreign key constraint for vehicle_maintenance -> vehicles
ALTER TABLE vehicle_maintenance
ADD CONSTRAINT vehicle_maintenance_vehicle_id_fkey 
FOREIGN KEY (vehicle_id) 
REFERENCES vehicles(id) 
ON DELETE CASCADE;
;
