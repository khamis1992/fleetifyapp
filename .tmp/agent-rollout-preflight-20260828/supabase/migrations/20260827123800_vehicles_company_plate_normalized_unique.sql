CREATE UNIQUE INDEX IF NOT EXISTS vehicles_company_plate_normalized_unique ON vehicles (company_id, regexp_replace(plate_number, '\s', '', 'g')) WHERE plate_number IS NOT NULL AND is_active = true;;
