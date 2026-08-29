-- Add role column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employee';

-- Add check constraint for valid roles
ALTER TABLE profiles 
ADD CONSTRAINT valid_role 
CHECK (role IN ('admin', 'manager', 'employee', 'customer'));

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing users based on position
UPDATE profiles 
SET role = CASE 
  WHEN position LIKE '%أدمن%' OR position LIKE '%admin%' THEN 'admin'
  WHEN position LIKE '%مدير%' OR position LIKE '%manager%' THEN 'manager'
  ELSE 'employee'
END
WHERE role IS NULL OR role = 'employee';;
