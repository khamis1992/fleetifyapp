
-- Fix the return type to use REAL instead of FLOAT
DROP FUNCTION IF EXISTS find_customer_by_name_fuzzy(UUID, TEXT, FLOAT);

CREATE OR REPLACE FUNCTION find_customer_by_name_fuzzy(
  p_company_id UUID,
  p_search_name TEXT,
  p_min_similarity REAL DEFAULT 0.3
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_search TEXT;
BEGIN
  -- Normalize the search term
  normalized_search := normalize_arabic(p_search_name);
  
  RETURN QUERY
  SELECT 
    c.id AS customer_id,
    COALESCE(c.first_name_ar || ' ' || c.last_name_ar, c.first_name || ' ' || c.last_name, c.company_name_ar, c.company_name) AS customer_name,
    GREATEST(
      similarity(normalize_arabic(COALESCE(c.first_name_ar, '') || ' ' || COALESCE(c.last_name_ar, '')), normalized_search),
      similarity(normalize_arabic(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), normalized_search),
      similarity(normalize_arabic(COALESCE(c.company_name_ar, '')), normalized_search),
      similarity(normalize_arabic(COALESCE(c.company_name, '')), normalized_search)
    ) AS similarity_score
  FROM customers c
  WHERE c.company_id = p_company_id
    AND (
      similarity(normalize_arabic(COALESCE(c.first_name_ar, '') || ' ' || COALESCE(c.last_name_ar, '')), normalized_search) >= p_min_similarity
      OR similarity(normalize_arabic(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), normalized_search) >= p_min_similarity
      OR similarity(normalize_arabic(COALESCE(c.company_name_ar, '')), normalized_search) >= p_min_similarity
      OR similarity(normalize_arabic(COALESCE(c.company_name, '')), normalized_search) >= p_min_similarity
    )
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$;
;
