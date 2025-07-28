-- Check the allowed values for request_type
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'vehicle_dispatch_permits_request_type_check';