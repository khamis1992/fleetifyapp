-- ================================================================
-- JOURNAL_ENTRIES TABLE INDEXES
-- ================================================================
--
-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id
ON journal_entries(company_id);

-- Index for entry_date filtering
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date
ON journal_entries(entry_date) WHERE company_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_journal_entries_status
ON journal_entries(status) WHERE company_id IS NOT NULL;

-- Composite index for entry_date + status
CREATE INDEX IF NOT EXISTS idx_journal_entries_date_status
ON journal_entries(entry_date, status) WHERE company_id IS NOT NULL;

-- ================================================================
-- ANALYTICS FUNCTION FOR MONITORING
-- ================================================================
--
-- Create a function to analyze index usage (run periodically)
CREATE OR REPLACE FUNCTION analyze_table_indexes(table_name text)
RETURNS TABLE(
    index_name text,
    index_type text,
    columns text[],
    usage_count bigint,
    last_used timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.schemaname || '.' || i.tablename || '.' || i.indexname as index_name,
        CASE
            WHEN i.indisunique THEN 'UNIQUE'
            WHEN i.indisprimary THEN 'PRIMARY KEY'
            ELSE 'NON-UNIQUE'
        END as index_type,
        array_agg(a.attname ORDER BY c.ordinality) as columns,
        idx_scan as usage_count,
        idx_tup_read as last_read -- Approximation
    FROM pg_stat_user_indexes idx
    JOIN pg_index i ON i.indexrelid = idx.indexrelid
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN unnest(i.indkey) WITH ORDINALITY c(attnum, ordinality) ON true
    WHERE i.relname = table_name
    GROUP BY i.schemaname, i.tablename, i.indexname,
             i.indisunique, i.indisprimary,
             idx.idx_scan, idx.idx_tup_read;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION analyze_table_indexes(text) TO authenticated, service_role;;
