-- Read-only reader; no business rows need reversal. Roll this back before its
-- shared settlement dependency. Coordinate removal of frontend consumers first.
DROP FUNCTION IF EXISTS public.get_canonical_rental_arrears_v1(uuid,date);
