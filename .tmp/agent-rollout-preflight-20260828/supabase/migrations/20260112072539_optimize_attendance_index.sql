-- Add index on attendance_date alone for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_date_only 
ON attendance_records(attendance_date);

-- Add compound index for common query pattern
CREATE INDEX IF NOT EXISTS idx_attendance_date_created 
ON attendance_records(attendance_date, created_at DESC);;
