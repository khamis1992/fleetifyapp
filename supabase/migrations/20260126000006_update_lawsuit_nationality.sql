-- Update existing lawsuits with nationality from customers table
UPDATE lawsuit_templates lt
SET defendant_nationality = COALESCE(c.nationality, c.country)
FROM contracts ct
JOIN customers c ON ct.customer_id = c.id
WHERE lt.contract_id = ct.id
  AND lt.defendant_nationality IS NULL
  AND (c.nationality IS NOT NULL OR c.country IS NOT NULL);
