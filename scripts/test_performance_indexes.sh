#!/bin/bash

# ================================================================
# Performance Index Testing Script
# ================================================================
# Purpose: Automate before/after performance testing
# Usage: ./scripts/test_performance_indexes.sh [before|after]
# ================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION_FILE="$PROJECT_DIR/supabase/migrations/20250119000001_add_performance_indexes.sql"
ANALYSIS_SQL="$PROJECT_DIR/docs/performance_index_analysis.sql"
RESULTS_DIR="$PROJECT_DIR/docs/performance_results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Company ID for testing
COMPANY_ID="24bc0b21-4e2d-4413-9842-31719a3669f4"

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  Performance Index Testing Script${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Check if running before or after
MODE=${1:-"before"}
echo -e "${YELLOW}Mode: $MODE${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to run SQL command
run_sql() {
    local sql="$1"
    local output_file="$2"

    echo -e "${BLUE}Running: $output_file${NC}"

    if command -v psql &> /dev/null; then
        echo "$sql" | psql -h localhost -U postgres -d postgres > "$output_file" 2>&1
        echo -e "${GREEN}✓ Query completed${NC}"
    else
        echo -e "${RED}✗ psql not found. Please run queries manually.${NC}"
        echo -e "${YELLOW}SQL saved to: $output_file${NC}"
        echo "$sql" > "$output_file"
    fi
}

# ================================================================
# STEP 1: Verify Migration File Exists
# ================================================================
echo -e "${BLUE}STEP 1: Verifying migration file...${NC}"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}✗ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Migration file found${NC}"
echo ""

# ================================================================
# STEP 2: Check Current Indexes
# ================================================================
echo -e "${BLUE}STEP 2: Checking current indexes...${NC}"
CHECK_INDEXES_SQL="
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
)
ORDER BY indexname;
"

run_sql "$CHECK_INDEXES_SQL" "$RESULTS_DIR/${MODE}_current_indexes_$TIMESTAMP.txt"
echo ""

# ================================================================
# STEP 3: Run EXPLAIN ANALYZE Tests
# ================================================================
echo -e "${BLUE}STEP 3: Running performance tests...${NC}"

# Test 1: Payment idempotency lookup
echo -e "${YELLOW}Test 1: Payment idempotency lookup${NC}"
PAYMENT_TEST_SQL="
\\echo '=== Payment Idempotency Lookup ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM payments
WHERE company_id = '$COMPANY_ID'
  AND idempotency_key = 'test-idempotency-key-123'
LIMIT 1;
"
run_sql "$PAYMENT_TEST_SQL" "$RESULTS_DIR/${MODE}_test1_payment_idempotency_$TIMESTAMP.txt"

# Test 2: Chart of accounts lookup
echo -e "${YELLOW}Test 2: Chart of accounts code lookup${NC}"
COA_TEST_SQL="
\\echo '=== Chart of Accounts Code Lookup ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, account_code, account_name, account_level, is_header
FROM chart_of_accounts
WHERE company_id = '$COMPANY_ID'
  AND account_code = '11151'
  AND is_header = false;
"
run_sql "$COA_TEST_SQL" "$RESULTS_DIR/${MODE}_test2_coa_lookup_$TIMESTAMP.txt"

# Test 3: Invoice date range
echo -e "${YELLOW}Test 3: Invoice date range query${NC}"
INVOICE_TEST_SQL="
\\echo '=== Invoice Date Range Query ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, invoice_number, contract_id, due_date, total_amount, status
FROM invoices
WHERE contract_id IN (SELECT id FROM contracts LIMIT 1)
  AND due_date >= '2025-01-01'
  AND due_date <= '2025-01-31'
  AND status != 'cancelled'
ORDER BY due_date DESC
LIMIT 10;
"
run_sql "$INVOICE_TEST_SQL" "$RESULTS_DIR/${MODE}_test3_invoice_daterange_$TIMESTAMP.txt"
echo ""

# ================================================================
# STEP 4: Collect Index Statistics
# ================================================================
echo -e "${BLUE}STEP 4: Collecting index statistics...${NC}"
INDEX_STATS_SQL="
\\echo '=== Index Usage Statistics ==='
SELECT
    i.schemaname,
    i.tablename,
    i.indexname,
    i.idx_scan as index_scans,
    i.idx_tup_read as tuples_read,
    i.idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(i.indexrelid::regclass)) as index_size
FROM pg_stat_user_indexes i
WHERE i.indexname IN (
    'idx_payments_idempotency',
    'idx_chart_of_accounts_company_code',
    'idx_invoices_contract_date_brin'
)
ORDER BY i.idx_scan DESC;
"

run_sql "$INDEX_STATS_SQL" "$RESULTS_DIR/${MODE}_index_stats_$TIMESTAMP.txt"
echo ""

# ================================================================
# STEP 5: Collect Table Statistics
# ================================================================
echo -e "${BLUE}STEP 5: Collecting table statistics...${NC}"
TABLE_STATS_SQL="
\\echo '=== Table Statistics ==='
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE tablename IN ('payments', 'chart_of_accounts', 'invoices')
ORDER BY tablename;
"

run_sql "$TABLE_STATS_SQL" "$RESULTS_DIR/${MODE}_table_stats_$TIMESTAMP.txt"
echo ""

# ================================================================
# SUMMARY
# ================================================================
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  Testing Complete!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "${BLUE}Results saved to:${NC}"
echo -e "  $RESULTS_DIR/${MODE}_*.txt"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
if [ "$MODE" = "before" ]; then
    echo -e "  1. Review the baseline performance results"
    echo -e "  2. Apply the migration:"
    echo -e "     ${GREEN}supabase db push${NC}"
    echo -e "  3. Run this script again with 'after' mode:"
    echo -e "     ${GREEN}./scripts/test_performance_indexes.sh after${NC}"
    echo -e "  4. Compare the before/after results"
else
    echo -e "  1. Compare results with baseline:"
    echo -e "     ${GREEN}diff $RESULTS_DIR/before_*.txt $RESULTS_DIR/after_*.txt${NC}"
    echo -e "  2. Verify query execution time improved"
    echo -e "  3. Check that indexes are being used (Index Scan in EXPLAIN)"
    echo -e "  4. Monitor index usage for 7 days"
fi
echo ""
echo -e "${YELLOW}Key metrics to compare:${NC}"
echo -e "  - Execution Time (lower is better)"
echo -e "  - Planning Time (lower is better)"
echo -e "  - Buffer usage (fewer hits is better)"
echo -e "  - Scan type (Index Scan vs Seq Scan)"
echo ""

# ================================================================
# Apply migration if requested
# ================================================================
if [ "$MODE" = "before" ] && [ "$2" = "--apply" ]; then
    echo -e "${YELLOW}Applying migration...${NC}"
    if command -v supabase &> /dev/null; then
        supabase db push
        echo -e "${GREEN}✓ Migration applied${NC}"
    else
        echo -e "${RED}✗ supabase CLI not found. Please run manually:${NC}"
        echo -e "  ${YELLOW}supabase db push${NC}"
    fi
fi

exit 0
