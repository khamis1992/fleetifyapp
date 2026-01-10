# Signed Agreements Upload - Database Design Summary

**Date:** January 10, 2026
**Project:** FleetifyApp - Al-Araf Car Rental ERP
**Status:** Ready for Implementation

---

## Overview

This document summarizes the database schema updates designed for the signed agreements upload feature with AI-powered contract matching.

---

## Design Decisions

### 1. Extend Existing Table vs Create New Table
**Decision:** Extend `contract_documents` table with new columns

**Rationale:**
- Signed contracts are a type of contract document
- Existing storage bucket and RLS policies already in place
- Maintains data integrity with existing relationships
- Simpler queries (no joins needed for basic operations)

### 2. AI Confidence Thresholds
**Decision:** Three-tier confidence system
- **80-100**: Auto-match (status: `matched`)
- **70-79**: Review required (status: `review_required`)
- **0-69**: No match (status: `not_matched`)

**Rationale:**
- Balances automation with safety
- 70% threshold minimizes false positives
- Review queue for edge cases

### 3. Audit Trail
**Decision:** Track both AI matches and manual overrides
- `matched_by`: ai/manual/bulk_import
- `matched_at`: When match occurred
- `verified_by`: User who verified/overrode
- `verified_at`: When verification occurred
- `match_notes`: Reason for override

**Rationale:**
- Full accountability for compliance
- Analytics for AI performance improvement
- Debugging capability

---

## New Columns Added

### AI Matching Columns
| Column | Type | Description |
|--------|------|-------------|
| `ai_match_status` | TEXT | pending, matched, not_matched, manual_override, review_required |
| `ai_match_confidence` | DECIMAL(5,2) | 0-100 confidence score from AI |
| `matched_by` | TEXT | ai, manual, bulk_import |
| `matched_at` | TIMESTAMPTZ | When match occurred |
| `verified_by` | UUID (FK) | User who verified/overrode |
| `verified_at` | TIMESTAMPTZ | When verification occurred |
| `match_notes` | TEXT | Override reason/notes |

### Batch Tracking Columns
| Column | Type | Description |
|--------|------|-------------|
| `upload_batch_id` | UUID | Batch identifier for bulk uploads |
| `original_filename` | TEXT | Filename before processing |
| `processing_status` | TEXT | uploading, parsing, matching, complete, failed, review_required |
| `processing_error` | TEXT | Error message if failed |

---

## New Database Functions

### 1. `record_ai_match_result`
**Purpose:** Record AI match results with automatic status determination

**Parameters:**
- `p_document_id` (UUID): The document being matched
- `p_contract_id` (UUID): Matched contract
- `p_confidence` (DECIMAL): AI confidence score (0-100)
- `p_status` (TEXT, optional): Override status

**Returns:** JSONB with match result

**Usage:**
```typescript
const { data, error } = await supabase.rpc('record_ai_match_result', {
  p_document_id: 'doc-uuid',
  p_contract_id: 'contract-uuid',
  p_confidence: 85.5
});
```

### 2. `override_contract_match`
**Purpose:** Allow manual override of AI matches

**Parameters:**
- `p_document_id` (UUID): The document to override
- `p_new_contract_id` (UUID): Correct contract ID
- `p_user_id` (UUID): User making the override
- `p_notes` (TEXT, optional): Reason for override

**Returns:** JSONB with override result

**Usage:**
```typescript
const { data, error } = await supabase.rpc('override_contract_match', {
  p_document_id: 'doc-uuid',
  p_new_contract_id: 'correct-contract-uuid',
  p_user_id: user.id,
  p_notes: 'Customer name matches, AI picked wrong contract'
});
```

---

## New Database Views

### 1. `pending_contract_matches`
**Purpose:** Dashboard view showing documents awaiting action

**Columns:**
- Document info (id, name, type)
- AI status (ai_match_status, ai_match_confidence)
- Processing status
- Uploader info
- Contract info (number, customer, vehicle)

**Usage:**
```typescript
const { data: pending } = await supabase
  .from('pending_contract_matches')
  .select('*')
  .eq('company_id', companyId);
```

### 2. `contract_match_statistics`
**Purpose:** Aggregate statistics for AI matching performance

**Columns:**
- ai_matched_count
- manual_override_count
- review_required_count
- not_matched_count
- pending_count
- avg_confidence
- total_documents

**Usage:**
```typescript
const { data: stats } = await supabase
  .from('contract_match_statistics')
  .select('*')
  .eq('company_id', companyId)
  .single();
```

---

## Performance Indexes

| Index | Purpose | Query Optimization |
|-------|---------|-------------------|
| `idx_contract_documents_ai_match_status` | Filter by match status | Dashboard widget queries |
| `idx_contract_documents_processing_status` | Filter by processing status | Upload queue queries |
| `idx_contract_documents_upload_batch` | Find all docs in batch | Batch operations |
| `idx_contract_documents_pending_matches` | Composite for dashboard | Most common query |
| `idx_contract_documents_manual_overrides` | Audit trail queries | Override history |

---

## RLS Policy Updates

### Existing Policies
All existing RLS policies remain in place and continue to work:
- Company isolation via `company_id`
- User access verification
- Storage bucket policies

### New Considerations
- AI fields updated by service role via functions
- Functions include company_id security checks
- Manual overrides tracked with `verified_by`

---

## Migration Files

### Main Migration
**File:** `supabase/migrations/20260110000001_add_signed_contract_ai_matching.sql`
- Adds all columns with IF NOT EXISTS
- Creates 5 performance indexes
- Creates 2 helper functions
- Creates 2 dashboard views
- Grants permissions

### Rollback Migration
**File:** `supabase/migrations/20260110000001_add_signed_contract_ai_matching_ROLLBACK.sql`
- Drops views, functions, indexes
- Removes all new columns
- **WARNING:** Data loss if executed

---

## TypeScript Types Updated

**File:** `src/integrations/supabase/types.ts`

### Updated Sections:
1. **contract_documents table** - Added 11 new columns to Row/Insert/Update types
2. **Views section** - Added 2 new views
3. **Functions section** - Added 2 new functions

All types include proper nullability and enum constraints matching the database.

---

## Implementation Checklist

### Pre-Deployment
- [ ] Review migration SQL
- [ ] Test migration on staging database
- [ ] Verify RLS policies work correctly
- [ ] Test functions with sample data
- [ ] Run type-check locally (PASSED)

### Post-Deployment
- [ ] Regenerate Supabase types (if needed)
- [ ] Create React hook for AI matching operations
- [ ] Build upload UI component with batch support
- [ ] Implement dashboard widgets for pending matches
- [ ] Add manual override dialog component
- [ ] Create match statistics dashboard cards
- [ ] Write E2E tests for matching workflow
- [ ] Update user documentation

### Monitoring Setup
- [ ] Set up alerts for high "not_matched" rates
- [ ] Monitor average AI confidence scores
- [ ] Track manual override frequency
- [ ] Measure processing time per document

---

## Query Examples

### Get Pending Matches for Dashboard
```typescript
const { data, error } = await supabase
  .from('pending_contract_matches')
  .select('*')
  .eq('company_id', companyId)
  .order('uploaded_at', { ascending: false })
  .limit(10);
```

### Get Low Confidence Matches
```typescript
const { data, error } = await supabase
  .from('contract_documents')
  .select('*, contracts(contract_number, customer_name)')
  .eq('company_id', companyId)
  .eq('ai_match_status', 'review_required')
  .gte('ai_match_confidence', 70)
  .lt('ai_match_confidence', 80)
  .order('ai_match_confidence', { ascending: false });
```

### Get Manual Override History
```typescript
const { data, error } = await supabase
  .from('contract_documents')
  .select('*, profiles!verified_by(first_name, last_name), contracts(contract_number)')
  .eq('company_id', companyId)
  .eq('matched_by', 'manual')
  .order('matched_at', { ascending: false });
```

### Get Match Statistics
```typescript
const { data, error } = await supabase
  .from('contract_match_statistics')
  .select('*')
  .eq('company_id', companyId)
  .single();
```

---

## Security Considerations

### Multi-Tenancy
- All operations filtered by `company_id`
- Functions verify company access before updates
- Views respect RLS on underlying table

### Audit Trail
- Every match tracked (AI or manual)
- User verification logged
- Override notes required for manual changes

### Data Privacy
- Original filenames stored separately
- Processing errors may contain file data
- Match notes may contain PII

---

## Future Enhancements

### Phase 2 (Optional)
- Add `ai_model_version` column
- Add `match_rejection_reasons` array
- Create `document_match_history` table
- Webhook notifications for failed matches
- ML feedback loop

### Phase 3 (Advanced)
- Multi-contract matching
- Contract renewal detection
- Signature extraction
- Document similarity scoring
- Automated archival

---

## Files Created/Modified

### Created
1. `tasks/SIGNED_AGREEMENTS_DATABASE_DESIGN.md` - Full design document
2. `supabase/migrations/20260110000001_add_signed_contract_ai_matching.sql` - Main migration
3. `supabase/migrations/20260110000001_add_signed_contract_ai_matching_ROLLBACK.sql` - Rollback
4. `tasks/SIGNED_AGREEMENTS_DESIGN_SUMMARY.md` - This summary

### Modified
1. `src/integrations/supabase/types.ts` - Added new columns, views, and functions

---

## Next Steps

1. **Review** this design document and the full design document
2. **Test** migration on staging environment
3. **Approve** or request changes
4. **Deploy** migration to production
5. **Implement** frontend components (upload UI, dashboard widgets)
6. **Integrate** AI matching service
7. **Monitor** performance and accuracy

---

**End of Summary**
