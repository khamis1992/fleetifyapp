
-- Move pg_net extension from public schema to extensions schema
-- This improves security by isolating extension objects from user tables

-- First, create the extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop the extension from public schema
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Recreate it in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, service_role;
;
