-- violations_2025.sql
-- Generated schema for importing Qatar traffic violations
-- NOTE: This file currently includes ONLY the table schema.
-- To populate with data, run the companion script `ocr_to_sql.py` locally to generate INSERT statements.
-- Encoding: UTF-8

BEGIN;

DROP TABLE IF EXISTS traffic_violations;

CREATE TABLE traffic_violations (
    id SERIAL PRIMARY KEY,
    violation_no VARCHAR(50),
    plate_no VARCHAR(50),
    vehicle_type VARCHAR(100),
    location VARCHAR(255),
    violation_date DATE,
    amount DECIMAL(10,2)
);

COMMIT;

-- After running ocr_to_sql.py, append the generated INSERT statements here.
