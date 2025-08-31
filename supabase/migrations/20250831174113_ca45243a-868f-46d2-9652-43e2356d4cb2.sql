-- Check the current constraint
SELECT consrc 
FROM pg_constraint 
WHERE conname LIKE '%vehicle_condition_reports%inspection_type%' 
AND contype = 'c';