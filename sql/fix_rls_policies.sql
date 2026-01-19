-- ===============================================
-- Fix RLS Policies for Financial Tables
-- Purpose: Resolve 400/403 errors in financial pages
-- Date: 2025-11-05
-- ===============================================

\echo '========================================='
\echo 'Fixing RLS Policies for Financial System'
\echo '========================================='
\echo ''

-- Start transaction
BEGIN;

-- ==========================================
-- 1. Payments Table Policies
-- ==========================================

\echo '1. Fixing Payments Table Policies...'
\echo '------------------------------'

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view payments" ON payments;
DROP POLICY IF EXISTS "Users can create payments" ON payments;
DROP POLICY IF EXISTS "Users can update payments" ON payments;
DROP POLICY IF EXISTS "Users can delete payments" ON payments;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON payments;

-- Create comprehensive SELECT policy
CREATE POLICY "payments_select_policy" ON payments
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin' OR access_type = 'member')
        )
    );

-- Create INSERT policy
CREATE POLICY "payments_insert_policy" ON payments
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    );

-- Create UPDATE policy
CREATE POLICY "payments_update_policy" ON payments
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    );

-- Create DELETE policy
CREATE POLICY "payments_delete_policy" ON payments
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND access_type = 'owner'
        )
    );

\echo '✓ Payments policies fixed'
\echo ''

-- ==========================================
-- 2. Chart of Accounts Policies
-- ==========================================

\echo '2. Fixing Chart of Accounts Policies...'
\echo '------------------------------'

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chart of accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "Users can manage chart of accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON chart_of_accounts;

-- Create SELECT policy
CREATE POLICY "chart_of_accounts_select_policy" ON chart_of_accounts
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
        )
    );

-- Create INSERT policy
CREATE POLICY "chart_of_accounts_insert_policy" ON chart_of_accounts
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    );

-- Create UPDATE policy
CREATE POLICY "chart_of_accounts_update_policy" ON chart_of_accounts
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    );

-- Create DELETE policy
CREATE POLICY "chart_of_accounts_delete_policy" ON chart_of_accounts
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND access_type = 'owner'
        )
        AND is_system = false  -- Prevent deletion of system accounts
    );

\echo '✓ Chart of Accounts policies fixed'
\echo ''

-- ==========================================
-- 3. Journal Entries Policies
-- ==========================================

\echo '3. Fixing Journal Entries Policies...'
\echo '------------------------------'

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can manage journal entries" ON journal_entries;

-- Create SELECT policy
CREATE POLICY "journal_entries_select_policy" ON journal_entries
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
        )
    );

-- Create INSERT policy
CREATE POLICY "journal_entries_insert_policy" ON journal_entries
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    );

-- Create UPDATE policy (only draft entries can be updated)
CREATE POLICY "journal_entries_update_policy" ON journal_entries
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
        AND (status = 'draft' OR auth.uid() IN (
            SELECT user_id FROM user_company_access 
            WHERE company_id = journal_entries.company_id 
            AND access_type = 'owner'
        ))
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    );

-- Create DELETE policy (only draft entries can be deleted)
CREATE POLICY "journal_entries_delete_policy" ON journal_entries
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND access_type = 'owner'
        )
        AND status = 'draft'
    );

\echo '✓ Journal Entries policies fixed'
\echo ''

-- ==========================================
-- 4. Journal Entry Lines Policies
-- ==========================================

\echo '4. Fixing Journal Entry Lines Policies...'
\echo '------------------------------'

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view journal entry lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "Users can manage journal entry lines" ON journal_entry_lines;

-- Create SELECT policy (through parent journal entry)
CREATE POLICY "journal_entry_lines_select_policy" ON journal_entry_lines
    FOR SELECT
    USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE company_id IN (
                SELECT company_id 
                FROM user_company_access 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Create INSERT policy
CREATE POLICY "journal_entry_lines_insert_policy" ON journal_entry_lines
    FOR INSERT
    WITH CHECK (
        journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE company_id IN (
                SELECT company_id 
                FROM user_company_access 
                WHERE user_id = auth.uid()
                AND (access_type = 'owner' OR access_type = 'admin')
            )
        )
    );

-- Create UPDATE policy
CREATE POLICY "journal_entry_lines_update_policy" ON journal_entry_lines
    FOR UPDATE
    USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE company_id IN (
                SELECT company_id 
                FROM user_company_access 
                WHERE user_id = auth.uid()
                AND (access_type = 'owner' OR access_type = 'admin')
            )
            AND status = 'draft'
        )
    );

-- Create DELETE policy
CREATE POLICY "journal_entry_lines_delete_policy" ON journal_entry_lines
    FOR DELETE
    USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE company_id IN (
                SELECT company_id 
                FROM user_company_access 
                WHERE user_id = auth.uid()
                AND access_type = 'owner'
            )
            AND status = 'draft'
        )
    );

\echo '✓ Journal Entry Lines policies fixed'
\echo ''

-- ==========================================
-- 5. Invoices Policies
-- ==========================================

\echo '5. Fixing Invoices Policies...'
\echo '------------------------------'

DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Users can manage invoices" ON invoices;

CREATE POLICY "invoices_select_policy" ON invoices
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "invoices_insert_policy" ON invoices
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    );

CREATE POLICY "invoices_update_policy" ON invoices
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND (access_type = 'owner' OR access_type = 'admin')
        )
    );

CREATE POLICY "invoices_delete_policy" ON invoices
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_access 
            WHERE user_id = auth.uid()
            AND access_type = 'owner'
        )
        AND payment_status != 'paid'  -- Prevent deletion of paid invoices
    );

\echo '✓ Invoices policies fixed'
\echo ''

-- ==========================================
-- 6. Verification
-- ==========================================

\echo '6. Verifying Policies...'
\echo '------------------------------'

SELECT 
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename IN (
    'payments', 
    'chart_of_accounts', 
    'journal_entries', 
    'journal_entry_lines',
    'invoices'
)
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo '========================================='
\echo 'RLS Policies Fixed Successfully!'
\echo '========================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Test payments page access'
\echo '2. Test chart of accounts access'
\echo '3. Test journal entries creation'
\echo '4. Monitor for 400/403 errors'
\echo ''
\echo 'To verify: SELECT * FROM pg_policies WHERE tablename = [table_name];'
\echo ''

-- Commit changes
COMMIT;

